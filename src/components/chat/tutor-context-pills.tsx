import React from 'react';
import { Sparkles, X } from 'lucide-react';

import { TutorContextPill } from '@/lib/tutor-chat-context';

const TONE_STYLES: Record<NonNullable<TutorContextPill['tone']>, string> = {
  task: 'border-blue-200/80 bg-blue-50/80 text-blue-700',
  evaluation: 'border-amber-200/80 bg-amber-50/80 text-amber-700',
  suggestion: 'border-rose-200/80 bg-rose-50/80 text-rose-700',
  general: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function TutorContextPills({
  items,
  onRemove,
  onClearAll,
}: {
  items: TutorContextPill[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-rose-400" />
          Attached context for next reply
        </div>
        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-medium text-slate-500 transition hover:text-slate-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[item.tone || 'general']}`}
          >
            <span className="whitespace-nowrap">{item.label}</span>
            <span className="max-w-[220px] truncate opacity-90">{item.value}</span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="rounded-full p-0.5 transition hover:bg-white/80"
              aria-label={`Remove ${item.label} context`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
