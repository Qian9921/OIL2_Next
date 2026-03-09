import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { MessageSquare, SendHorizonal, Info, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { RequirementCheckpoint } from './dialog-components';
import { PromptFeedbackDisplay } from './feedback-components';
import { ScoreBadge } from './score-components';
import { formatTimestamp } from '@/lib/utils';

export type EvaluationHistoryEntry = {
  timestamp: Timestamp;
  score: number;
  feedback: string;
  success?: boolean;
  message?: string;
  evaluationId?: string;
  status?: string;
  result?: {
    rawContent?: {
      summary?: string;
      assessment?: number;
      checkpoints?: Array<{
        status: string;
        details: string;
        requirement: string;
      }>;
      improvements?: string[];
    };
  };
};

export type PromptHistoryEntry = {
  timestamp: Timestamp;
  content: string;
  qualityScore: number;
  goalScore?: number;
  contextScore?: number;
  expectationsScore?: number;
  sourceScore?: number;
  isGoodPrompt?: boolean;
  feedback?: {
    feedback?: string;
  } | null;
};

export const EvaluationHistoryItem = ({
  evaluation,
  index,
  totalCount,
  onExplainAttempt,
  onUseImprovement,
  onAskRequirement,
}: {
  evaluation: EvaluationHistoryEntry;
  index: number;
  totalCount: number;
  onExplainAttempt?: (evaluation: EvaluationHistoryEntry) => void;
  onUseImprovement?: (evaluation: EvaluationHistoryEntry, improvement: string) => void;
  onAskRequirement?: (evaluation: EvaluationHistoryEntry, requirement: string, details: string) => void;
}) => {
  const formattedDate = formatTimestamp(evaluation.timestamp);
  const improvements = evaluation.result?.rawContent?.improvements || [];
  const checkpoints = evaluation.result?.rawContent?.checkpoints || [];

  return (
    <Collapsible className="overflow-hidden rounded-lg border shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CollapsibleTrigger asChild>
        <div className="group flex cursor-pointer items-center justify-between border-b bg-gray-50 p-3 hover:bg-gray-100">
          <div className="flex items-center">
            <span className="font-medium">Attempt {totalCount - index}</span>
            <span className="mx-2">•</span>
            <span className="text-sm text-gray-500">{formattedDate}</span>
          </div>
          <div className="flex items-center">
            {typeof evaluation.score === 'number' && Number.isFinite(evaluation.score) ? (
              <ScoreBadge score={evaluation.score} />
            ) : evaluation.status && evaluation.status !== 'completed' ? (
              <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">Processing</span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">No Score</span>
            )}
            <ChevronDown className="ml-2 h-5 w-5 transform text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 bg-white p-4">
        {onExplainAttempt && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExplainAttempt(evaluation)}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Continue this attempt in Tutor
            </Button>
          </div>
        )}

        {evaluation.result?.rawContent?.summary && (
          <div>
            <h4 className="mb-1 text-sm font-semibold">Summary:</h4>
            <p className="text-sm text-gray-700">{evaluation.result.rawContent.summary}</p>
          </div>
        )}

        {checkpoints.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Requirements Status:</h4>
            <div className="space-y-3">
              {checkpoints.map((checkpoint, checkpointIndex) => (
                <div key={checkpointIndex} className="space-y-2">
                  <RequirementCheckpoint
                    status={checkpoint.status}
                    requirement={checkpoint.requirement}
                    details={checkpoint.details}
                  />
                  {onAskRequirement && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAskRequirement(evaluation, checkpoint.requirement, checkpoint.details)}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Ask Tutor about this requirement
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {improvements.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-semibold">Suggested Improvements:</h4>
            <div className="space-y-2">
              {improvements.map((improvement, improvementIndex) => (
                <div key={improvementIndex} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="flex-1 text-sm text-gray-700">{improvement}</span>
                  {onUseImprovement && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onUseImprovement(evaluation, improvement)}
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <SendHorizonal className="mr-1.5 h-3.5 w-3.5" />
                      Use in Tutor
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const PromptHistoryItem = ({
  prompt,
  onExplainPrompt,
}: {
  prompt: PromptHistoryEntry;
  onExplainPrompt?: (prompt: PromptHistoryEntry) => void;
}) => {
  const formattedDate = formatTimestamp(prompt.timestamp);

  const hasAnyScore = prompt.qualityScore !== undefined;
  const hasAnyDimensionScores =
    prompt.goalScore !== undefined &&
    prompt.contextScore !== undefined &&
    prompt.expectationsScore !== undefined &&
    prompt.sourceScore !== undefined;

  const hasValidFeedback =
    prompt.feedback &&
    typeof prompt.feedback.feedback === 'string' &&
    prompt.feedback.feedback.trim() !== '';

  if (!hasAnyScore && !hasAnyDimensionScores && !hasValidFeedback) {
    return null;
  }

  return (
    <Collapsible className="overflow-hidden rounded-lg border shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CollapsibleTrigger asChild>
        <div className="group flex cursor-pointer items-center justify-between bg-gray-50 p-3 hover:bg-gray-100">
          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${prompt.isGoodPrompt ? 'text-green-700' : 'text-red-700'}`}>
              {prompt.isGoodPrompt ? 'Good Prompt' : 'Needs Improvement'}
            </span>
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
          <div className="flex items-center">
            {hasAnyScore && <ScoreBadge score={prompt.qualityScore} />}
            <ChevronDown className="ml-2 h-5 w-5 transform text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="bg-white p-4">
        {onExplainPrompt && (
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExplainPrompt(prompt)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Improve this prompt in Tutor
            </Button>
          </div>
        )}
        <div className="mb-4">
          <PromptFeedbackDisplay
            feedback={hasValidFeedback ? prompt.feedback! : { feedback: undefined }}
            score={hasAnyScore ? prompt.qualityScore : undefined}
            goalScore={hasAnyDimensionScores ? prompt.goalScore : undefined}
            contextScore={hasAnyDimensionScores ? prompt.contextScore : undefined}
            expectationsScore={hasAnyDimensionScores ? prompt.expectationsScore : undefined}
            sourceScore={hasAnyDimensionScores ? prompt.sourceScore : undefined}
            size="md"
          />
        </div>
        <div className="mb-4">
          <h4 className="mb-1 text-sm font-semibold text-gray-800">Your Prompt:</h4>
          <div className="break-words rounded border bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
            {prompt.content}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const EmptyPromptHistory = () => (
  <div className="space-y-4">
    <div className="py-6 text-center">
      <Info className="mx-auto mb-2 h-12 w-12 text-rose-400" />
      <p className="mb-2 text-gray-600">No prompt feedback history available for this task yet.</p>
      <p className="text-sm text-gray-500">Try sending a message in the chat to receive personalized feedback on your prompt quality.</p>
    </div>
  </div>
);

export const EmptyEvaluationHistory = () => (
  <div className="py-10 text-center">
    <p className="text-gray-500">No evaluation history found for this task.</p>
  </div>
);
