import React from 'react';
import { AlertCircle, MessageCircleQuestion, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function TutorQuickActions({
  canReviewEvaluation,
  disabled,
  onExplainTask,
  onPlanNextSteps,
  onReviewLatestEvaluation,
}: {
  canReviewEvaluation: boolean;
  disabled: boolean;
  onExplainTask: () => void;
  onPlanNextSteps: () => void;
  onReviewLatestEvaluation: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quick actions</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExplainTask}
          disabled={disabled}
          className="h-8 shrink-0 rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" />
          Explain task
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPlanNextSteps}
          disabled={disabled}
          className="h-8 shrink-0 rounded-full border-sky-200 text-sky-700 hover:bg-sky-50"
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Next steps
        </Button>
        {canReviewEvaluation && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReviewLatestEvaluation}
            disabled={disabled}
            className="h-8 shrink-0 rounded-full border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
            Review evaluation
          </Button>
        )}
      </div>
    </div>
  );
}
