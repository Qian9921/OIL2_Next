import React from 'react';
import { MessageCircleQuestion, MessageSquare, Sparkles, X } from 'lucide-react';

import { EvaluationHistoryEntry, PromptHistoryEntry } from '@/components/task/history-components';
import { Button } from '@/components/ui/button';

function clampText(text: string, fallback: string) {
  const value = text?.trim() || fallback;
  return value.length > 110 ? `${value.slice(0, 107)}…` : value;
}

export function TutorInsightsStrip({
  latestEvaluationAttempt,
  latestPromptAttempt,
  onContinueEvaluation,
  onImprovePrompt,
  onDismiss,
  onStartFreshChat,
  compact = false,
}: {
  latestEvaluationAttempt: EvaluationHistoryEntry | null;
  latestPromptAttempt: PromptHistoryEntry | null;
  onContinueEvaluation: (evaluation: EvaluationHistoryEntry) => void;
  onImprovePrompt: (prompt: PromptHistoryEntry) => void;
  onDismiss?: () => void;
  onStartFreshChat?: () => void;
  compact?: boolean;
}) {
  if (!latestEvaluationAttempt && !latestPromptAttempt) {
    return null;
  }

  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            Continue learning
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {latestEvaluationAttempt && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onContinueEvaluation(latestEvaluationAttempt)}
                className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Latest evaluation
              </Button>
            )}
            {latestPromptAttempt && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onImprovePrompt(latestPromptAttempt)}
                className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" />
                Latest prompt
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            Continue where you left off
          </div>
          <p className="mt-1 text-sm text-slate-500">Pick one path, or close this and start a completely free chat.</p>
        </div>
        <div className="flex items-center gap-2">
          {onStartFreshChat && (
            <button
              type="button"
              onClick={onStartFreshChat}
              className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
            >
              Start free chat
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
              aria-label="Hide Tutor suggestions"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {latestEvaluationAttempt && (
          <div className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">Latest evaluation</p>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-900">
                  {clampText(
                    latestEvaluationAttempt.result?.rawContent?.summary || latestEvaluationAttempt.feedback || '',
                    'Your latest evaluation is ready to review.',
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onContinueEvaluation(latestEvaluationAttempt)}
                className="h-8 shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Continue
              </Button>
            </div>
          </div>
        )}

        {latestPromptAttempt && (
          <div className="rounded-xl border border-rose-100 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">Latest prompt coaching</p>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-900">
                  {clampText(
                    latestPromptAttempt.feedback?.feedback || '',
                    `Your latest prompt scored ${latestPromptAttempt.qualityScore}% and is ready for improvement.`,
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onImprovePrompt(latestPromptAttempt)}
                className="h-8 shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" />
                Improve
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
