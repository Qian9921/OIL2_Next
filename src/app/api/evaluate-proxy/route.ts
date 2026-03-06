import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';

const EVALUATION_API_URL =
  process.env.EVALUATION_API_URL ??
  'https://tutor-new-827682634474.us-central1.run.app/api/evaluate';

interface EvaluationCheckpoint {
  status?: string;
}

interface EvaluationResponse {
  score?: number;
  feedback?: string;
  result?: {
    rawContent?: {
      assessment?: number;
      checkpoints?: EvaluationCheckpoint[];
    };
  };
}

/**
 * Proxies task evaluation requests through the app server so client pages do not
 * call external services directly.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const response = await fetch(EVALUATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const responseData = (await response.json()) as EvaluationResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Evaluation service returned ${response.status}`,
          details: responseData,
        },
        { status: response.status },
      );
    }

    if (
      typeof responseData.score !== 'number' &&
      typeof responseData.result?.rawContent?.assessment === 'number'
    ) {
      const rawAssessment = responseData.result.rawContent.assessment;
      responseData.score = Math.round(rawAssessment * 100);

      if (typeof responseData.feedback !== 'string') {
        const checkpoints = Array.isArray(responseData.result.rawContent.checkpoints)
          ? responseData.result.rawContent.checkpoints
          : [];

        const passedCheckpoints = checkpoints.filter((checkpoint) => {
          const status = checkpoint.status?.toLowerCase() ?? '';

          return (
            (status.includes('pass') ||
              status.includes('complete') ||
              status === 'completed') &&
            !status.includes('not')
          );
        }).length;

        if (responseData.score >= 80) {
          responseData.feedback = "Great job! You've successfully completed this task.";
        } else if (passedCheckpoints > 0) {
          responseData.feedback = `You've completed ${passedCheckpoints} out of ${checkpoints.length} requirements. Please review the details and try again.`;
        } else {
          responseData.feedback =
            'None of the requirements have been met yet. Please check the evaluation details and try again.';
        }
      }
    }

    return NextResponse.json(responseData, {
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
