import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';

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

async function waitForEvaluationResult(
  evaluationId: string,
  timeoutMs: number,
): Promise<UpstreamEvaluationResponse> {
  const url = `${EVALUATION_STATUS_API_BASE}/${evaluationId}?wait=true&timeout=${timeoutMs}`;
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  });

  const data = (await response.json()) as UpstreamEvaluationResponse;

  if (!response.ok) {
    throw new Error(data.message || `Status API error: ${response.status}`);
  }

  return data;
}

/**
 * Proxies task evaluation requests through the app server so client pages do not
 * call external services directly. This proxy normalizes Tutor_new's async
 * evaluation workflow back into the synchronous score/result contract expected
 * by the existing OIL2_Next frontend.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const shouldWaitForResult = body.waitForResult !== false;
    const timeoutMs = typeof body.timeoutMs === 'number' ? body.timeoutMs : 240000;

    const response = await fetch(EVALUATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

    if (shouldWaitForResult && responseData.evaluationId && responseData.status !== 'completed') {
      const waitedResult = await waitForEvaluationResult(responseData.evaluationId, timeoutMs);
      const normalized = normalizeUpstreamResponse({
        ...waitedResult,
        evaluationId: responseData.evaluationId,
      });

      return NextResponse.json(normalized, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    const normalized = normalizeUpstreamResponse(responseData);

    return NextResponse.json(normalized, {
      headers: {
        'Cache-Control': 'no-store',
      },
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
