import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShineBorder } from '@/components/ui/shine-border';
import { analyzeProjectAuthoringQuality } from '@/lib/project-authoring-quality';
import { Subtask } from '@/lib/types';

interface ProjectQualityAssistantProps {
  formData: {
    title: string;
    shortDescription?: string;
    description: string;
    deadline?: string;
    difficulty?: string;
    tags: string[];
    requirements: string[];
    learningGoals: string[];
  };
  subtasks: Omit<Subtask, 'id'>[];
  mode?: 'create' | 'edit';
}

export function ProjectQualityAssistant({
  formData,
  subtasks,
  mode = 'create',
}: ProjectQualityAssistantProps) {
  const analysis = analyzeProjectAuthoringQuality(formData, subtasks);

  const scoreTone =
    analysis.score >= 85
      ? 'bg-green-50 border-green-200 text-green-700'
      : analysis.score >= 60
        ? 'bg-blue-50 border-blue-200 text-blue-700'
        : 'bg-amber-50 border-amber-200 text-amber-700';

  return (
    <Card className="relative overflow-hidden border-white/70 bg-white/88 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <ShineBorder borderWidth={1} duration={14} shineColor={["rgba(129,140,248,0.1)", "rgba(251,191,186,0.08)", "rgba(125,211,252,0.08)"]} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-rose-100/60 via-transparent to-sky-100/50" />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Project Quality Assistant
          </span>
          <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${scoreTone}`}>
            <NumberTicker value={analysis.score} suffix="/100" />
          </div>
        </CardTitle>
        <p className="text-sm text-slate-600">
          This live review checks whether the project is clear for students and specific enough for strong evaluation feedback.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Current publishing readiness</p>
              <p className="text-xs text-slate-500">
                {mode === 'create'
                  ? 'Use this as a guide before you publish a new project.'
                  : 'Use this to see whether the edited project still feels clear and teachable.'}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${scoreTone}`}>
              {analysis.statusLabel}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 transition-all duration-500"
              style={{ width: `${analysis.score}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {analysis.highlights.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-green-900">
                <CheckCircle2 className="h-4 w-4" />
                What already looks strong
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-green-800">
                {analysis.highlights.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.blockers.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                Gaps students may feel immediately
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-amber-800">
                {analysis.blockers.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Lightbulb className="h-4 w-4" />
              Recommended improvements before publish
            </h4>
            <ol className="mt-3 space-y-2 text-sm text-blue-800">
              {analysis.suggestions.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-blue-700 shadow-sm">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <GraduationCap className="h-4 w-4" />
              What students will likely experience
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-indigo-800">
              {analysis.studentPreview.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4" />
              Publishing checklist
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {analysis.checks.map((check) => (
                <div
                  key={check.key}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    check.passed
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{check.label}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                    {check.passed ? 'Ready' : 'Needs work'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
