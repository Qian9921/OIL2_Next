import React from 'react';
import { LucideIcon } from 'lucide-react';

import { GridPattern } from '@/components/ui/grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { ShineBorder } from '@/components/ui/shine-border';

interface PageHeroProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function PageHero({
  title,
  description,
  icon: Icon,
  eyebrow,
  actions,
}: PageHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-rose-50/75 to-sky-50/80 p-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.16)] sm:p-7">
      <ShineBorder borderWidth={1} duration={14} shineColor={["rgba(129,140,248,0.1)", "rgba(251,191,186,0.1)", "rgba(125,211,252,0.08)"]} />
      <GridPattern
        width={44}
        height={44}
        x={-1}
        y={-1}
        strokeDasharray="2 4"
        squares={[
          [0, 1],
          [2, 0],
          [5, 1],
          [8, 0],
        ]}
        className="opacity-60 [mask-image:radial-gradient(500px_circle_at_top_right,white,transparent_80%)]"
      />
      <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-rose-100/55 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-32 w-44 rounded-full bg-sky-100/45 blur-3xl" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-50/55 via-transparent to-transparent" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          {(eyebrow || Icon) && (
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {Icon && (
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 via-rose-100 to-sky-100 text-indigo-600 shadow-sm shadow-indigo-100/70">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              {eyebrow && <AnimatedGradientText className="text-[11px] font-semibold">{eyebrow}</AnimatedGradientText>}
            </div>
          )}
          <div className="space-y-3">
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem]">
              <AnimatedGradientText>{title}</AnimatedGradientText>
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              {description}
            </p>
          </div>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-3 lg:justify-end lg:pl-6">{actions}</div>}
      </div>
    </div>
  );
}
