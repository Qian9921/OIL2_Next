import React from 'react';
import { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { ShineBorder } from '@/components/ui/shine-border';

interface FilterShellProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  children: React.ReactNode;
}

export function FilterShell({
  title,
  description,
  icon: Icon,
  meta,
  children,
}: FilterShellProps) {
  return (
    <Card className="relative overflow-hidden border-white/70 bg-white/85 backdrop-blur-xl">
      <ShineBorder borderWidth={1} duration={14} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-purple-100/50 via-transparent to-cyan-100/40" />
      <CardContent className="relative p-5">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {Icon && (
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 text-purple-700 shadow-md shadow-slate-200/60">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </div>
            {meta}
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
