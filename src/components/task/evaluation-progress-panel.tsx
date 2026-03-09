import React from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  FolderSearch,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface EvaluationProgressData {
  status?: string;
  statusMessage?: string;
  progressPercent?: number;
  stageKey?: string;
  stageTitle?: string;
  stageDetail?: string;
  progressStats?: {
    candidateFileCount?: number;
    selectedFileCount?: number;
    fetchedFileCount?: number;
    relevantFileCount?: number;
  };
}

const STAGES = [
  {
    key: 'queued',
    title: 'Queued',
    matchers: ['queued', 'pending'],
    icon: Loader2,
  },
  {
    key: 'repo',
    title: 'Reading Repo',
    matchers: [
      'starting_repository_review',
      'parsing_repository',
      'processing_repo',
      'repository_tree_loaded',
      'selecting_repository_files',
      'fetching_repository_files',
      'saving_repository_context',
      'repository_context_ready',
    ],
    icon: FolderSearch,
  },
  {
    key: 'evaluate',
    title: 'Evaluating',
    matchers: ['evaluating', 'evaluating_requirements'],
    icon: BrainCircuit,
  },
  {
    key: 'finalize',
    title: 'Finalizing',
    matchers: ['finalizing_report'],
    icon: Sparkles,
  },
  {
    key: 'complete',
    title: 'Done',
    matchers: ['completed', 'failed'],
    icon: CheckCircle2,
  },
] as const;

function getStageIndex(progress: EvaluationProgressData) {
  const stageKey = progress.stageKey || progress.status || 'queued';
  const matchedIndex = STAGES.findIndex((stage) => stage.matchers.includes(stageKey as never));

  if (matchedIndex >= 0) {
    return matchedIndex;
  }

  const percent = progress.progressPercent ?? 0;
  if (percent >= 100) return 4;
  if (percent >= 85) return 3;
  if (percent >= 60) return 2;
  if (percent >= 20) return 1;
  return 0;
}

function formatStats(progressStats?: EvaluationProgressData['progressStats']) {
  if (!progressStats) {
    return [];
  }

  return [
    progressStats.candidateFileCount ? `${progressStats.candidateFileCount} candidate files` : null,
    progressStats.selectedFileCount ? `${progressStats.selectedFileCount} selected` : null,
    progressStats.fetchedFileCount ? `${progressStats.fetchedFileCount} fetched` : null,
    progressStats.relevantFileCount ? `${progressStats.relevantFileCount} relevant` : null,
  ].filter((item): item is string => Boolean(item));
}

export function EvaluationProgressPanel({
  progress,
  className = '',
}: {
  progress: EvaluationProgressData | null;
  className?: string;
}) {
  const stageIndex = getStageIndex(progress || {});
  const progressPercent = Math.max(6, Math.min(progress?.progressPercent ?? 8, 100));
  const stats = formatStats(progress?.progressStats);

  return (
    <div className={`rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Evaluation Progress</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900">
            {progress?.stageTitle || 'Preparing your evaluation'}
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            {progress?.stageDetail || progress?.statusMessage || 'We are preparing the evaluation workflow.'}
          </p>
        </div>
        <div className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-sky-100">
          {progressPercent}%
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = index === stageIndex;
          const isCompleted = index < stageIndex || progress?.status === 'completed';
          const isFailed = progress?.status === 'failed' && index === STAGES.length - 1;

          return (
            <div
              key={stage.key}
              className={[
                'rounded-lg border px-2 py-2 text-center transition-colors',
                isFailed
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : isCompleted
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : isActive
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-400',
              ].join(' ')}
            >
              <Icon className={`mx-auto mb-1 h-4 w-4 ${isActive && !isCompleted ? 'animate-pulse' : ''}`} />
              <div className="text-[11px] font-medium leading-tight">{stage.title}</div>
            </div>
          );
        })}
      </div>

      {stats.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600 shadow-sm">
          <span className="font-medium text-slate-700">Live details:</span> {stats.join(' · ')}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        You can keep reading the task while we work. The result will appear automatically as soon as it is ready.
      </p>
    </div>
  );
}
