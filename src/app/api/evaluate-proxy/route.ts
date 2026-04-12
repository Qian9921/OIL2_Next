import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import {
  buildEvaluationProxyPayload,
  createEvaluationAccessToken,
  parseEvaluationProxyRequest,
  verifyEvaluationAccessToken,
} from '@/lib/evaluation-proxy-utils';
import { getParticipation, getProject } from '@/lib/firestore';
import { getEffectiveUserRole } from '@/lib/role-routing';

const EVALUATION_API_URL =
  process.env.EVALUATION_API_URL ??
  'https://tutor-new-zs4obve5ua-uc.a.run.app/api/evaluate';
const EVALUATION_STATUS_API_BASE =
  process.env.EVALUATION_STATUS_API_BASE ??
  EVALUATION_API_URL.replace(/\/api\/evaluate$/, '/api/status');

interface EvaluationCheckpoint {
  status?: string;
  details?: string;
}

interface EvaluationRawContent {
  assessment?: number;
  checkpoints?: EvaluationCheckpoint[];
  summary?: string;
  improvements?: string[];
  textContent?: string;
  message?: string;
}

interface UpstreamEvaluationResponse {
  success?: boolean;
  message?: string;
  evaluationId?: string;
  status?: string;
  statusMessage?: string;
  score?: number;
  feedback?: string;
  error?: string;
  result?: {
    rawContent?: EvaluationRawContent;
  } | null;
}

interface NormalizedEvaluationResponse extends UpstreamEvaluationResponse {
  score: number;
  feedback: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTerminalStatus(status?: string) {
  return status === 'completed' || status === 'failed';
}

function buildDefaultFeedback(score: number, checkpoints: EvaluationCheckpoint[] = []) {
  const passedCheckpoints = checkpoints.filter((checkpoint) => {
    const status = checkpoint.status?.toLowerCase() ?? '';
    return (
      (status.includes('pass') || status.includes('complete') || status === 'completed') &&
      !status.includes('not')
    );
  }).length;

  if (score >= 80) {
    return "Great job! You've successfully completed this task.";
  }

  if (passedCheckpoints > 0) {
    return `You've completed ${passedCheckpoints} out of ${checkpoints.length} requirements. Please review the details and try again.`;
  }

  return 'None of the requirements have been met yet. Please check the evaluation details and try again.';
}

function normalizeUpstreamResponse(responseData: UpstreamEvaluationResponse): NormalizedEvaluationResponse {
  const rawAssessment = responseData.result?.rawContent?.assessment;
  const score =
    typeof responseData.score === 'number'
      ? responseData.score <= 1
        ? Math.round(responseData.score * 100)
        : responseData.score
      : typeof rawAssessment === 'number'
        ? rawAssessment <= 1
          ? Math.round(rawAssessment * 100)
          : rawAssessment
        : 0;

  const checkpoints = Array.isArray(responseData.result?.rawContent?.checkpoints)
    ? responseData.result?.rawContent?.checkpoints
    : [];

  const feedback =
    typeof responseData.feedback === 'string' && responseData.feedback.trim().length > 0
      ? responseData.feedback
      : buildDefaultFeedback(score, checkpoints);

  return {
    ...responseData,
    score,
    feedback,
  };
}

function getEvaluationAccessSecret() {
  return (
    process.env.EVALUATION_PROXY_TOKEN_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    null
  );
}

async function fetchEvaluationStatus(evaluationId: string): Promise<UpstreamEvaluationResponse> {
  const response = await fetch(`${EVALUATION_STATUS_API_BASE}/${evaluationId}`, {
    method: 'GET',
    cache: 'no-store',
  });

  const data = (await response.json()) as UpstreamEvaluationResponse;

  if (!response.ok) {
    throw new Error(data.message || `Status API error: ${response.status}`);
  }

  return data;
}

async function waitForTerminalEvaluation(
  evaluationId: string,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<UpstreamEvaluationResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const statusData = await fetchEvaluationStatus(evaluationId);

    if (isTerminalStatus(statusData.status) || statusData.result?.rawContent) {
      return statusData;
    }

    await sleep(pollIntervalMs);
  }

  return fetchEvaluationStatus(evaluationId);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (getEffectiveUserRole(session.user.role) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const evaluationId = request.nextUrl.searchParams.get('evaluationId');
    const evaluationToken = request.nextUrl.searchParams.get('evaluationToken');
    const timeoutMs = Number(request.nextUrl.searchParams.get('timeoutMs') || '30000');
    const pollIntervalMs = Number(request.nextUrl.searchParams.get('pollIntervalMs') || '3000');

    if (!evaluationId || !evaluationToken) {
      return NextResponse.json({ error: 'evaluationId and evaluationToken are required' }, { status: 400 });
    }

    const secret = getEvaluationAccessSecret();
    if (!secret) {
      return NextResponse.json({ error: 'Evaluation proxy token secret is not configured' }, { status: 500 });
    }

    const claims = verifyEvaluationAccessToken(evaluationToken, secret);
    if (!claims || claims.evaluationId !== evaluationId || claims.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const participation = await getParticipation(claims.participationId);
    if (!participation || participation.studentId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const statusData = await waitForTerminalEvaluation(evaluationId, timeoutMs, pollIntervalMs);
    const normalized = normalizeUpstreamResponse({ ...statusData, evaluationId });

    if (!isTerminalStatus(statusData.status) && !statusData.result?.rawContent) {
      return NextResponse.json(normalized, { status: 202 });
    }

    return NextResponse.json(normalized, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch evaluation status from evaluation service',
        details: message,
      },
      { status: 500 },
    );
  }
}

/**
 * Compatibility proxy that adapts Tutor_new's async evaluation workflow to the
 * result contract expected by the existing OIL2_Next frontend.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (getEffectiveUserRole(session.user.role) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsedRequest = parseEvaluationProxyRequest(body);
    if (!parsedRequest) {
      return NextResponse.json(
        { error: 'projectId, participationId, and subtaskId are required' },
        { status: 400 },
      );
    }

    const secret = getEvaluationAccessSecret();
    if (!secret) {
      return NextResponse.json({ error: 'Evaluation proxy token secret is not configured' }, { status: 500 });
    }

    const participation = await getParticipation(parsedRequest.participationId);
    if (
      !participation ||
      participation.studentId !== session.user.id ||
      participation.projectId !== parsedRequest.projectId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await getProject(parsedRequest.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const subtask = project.subtasks.find((task) => task.id === parsedRequest.subtaskId);
    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const shouldWaitForResult = parsedRequest.waitForResult;
    const timeoutMs = parsedRequest.timeoutMs;
    const pollIntervalMs = parsedRequest.pollIntervalMs;
    const upstreamPayload = buildEvaluationProxyPayload({
      project,
      participation,
      subtask,
    });

    const response = await fetch(EVALUATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamPayload),
      cache: 'no-store',
    });

    const responseData = (await response.json()) as UpstreamEvaluationResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Evaluation service returned ${response.status}`,
          details: responseData,
        },
        { status: response.status },
      );
    }

    const evaluationToken = responseData.evaluationId
      ? createEvaluationAccessToken(
          {
            evaluationId: responseData.evaluationId,
            userId: session.user.id,
            participationId: participation.id,
            subtaskId: subtask.id,
          },
          secret,
        )
      : null;

    if (!shouldWaitForResult) {
      return NextResponse.json(
        {
          ...normalizeUpstreamResponse(responseData),
          ...(evaluationToken ? { evaluationToken } : {}),
        },
        { status: 202 },
      );
    }

    if (responseData.evaluationId && !isTerminalStatus(responseData.status) && !responseData.result?.rawContent) {
      const waitedResult = await waitForTerminalEvaluation(
        responseData.evaluationId,
        timeoutMs,
        pollIntervalMs,
      );

      const normalized = normalizeUpstreamResponse({
        ...waitedResult,
        evaluationId: responseData.evaluationId,
      });

      if (!isTerminalStatus(waitedResult.status) && !waitedResult.result?.rawContent) {
        return NextResponse.json(
          {
            ...normalized,
            ...(evaluationToken ? { evaluationToken } : {}),
          },
          { status: 202 },
        );
      }

      return NextResponse.json({
        ...normalized,
        ...(evaluationToken ? { evaluationToken } : {}),
      }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json({
      ...normalizeUpstreamResponse(responseData),
      ...(evaluationToken ? { evaluationToken } : {}),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to proxy request to evaluation service',
        details: message,
      },
      { status: 500 },
    );
  }
}
