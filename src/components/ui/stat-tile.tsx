import React from 'react';
import { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShineBorder } from '@/components/ui/shine-border';

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'purple' | 'amber';
  hint?: string;
}

const TONE_MAP: Record<NonNullable<StatTileProps['tone']>, string> = {
  blue: 'from-blue-100 to-cyan-100 text-blue-700',
  green: 'from-green-100 to-emerald-100 text-green-700',
  purple: 'from-purple-100 to-fuchsia-100 text-purple-700',
  amber: 'from-amber-100 to-yellow-100 text-amber-700',
};

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  hint,
}: StatTileProps) {
  const renderValue = () => {
    if (typeof value === 'number') {
      return <NumberTicker value={value} className="text-3xl font-semibold tracking-tight text-slate-900" />;
    }

    const percentMatch = typeof value === 'string' ? value.match(/^(\d+(?:\.\d+)?)%$/) : null;

    if (percentMatch) {
      return (
        <NumberTicker
          value={Number(percentMatch[1])}
          suffix="%"
          className="text-3xl font-semibold tracking-tight text-slate-900"
        />
      );
    }

    return <span className="text-3xl font-semibold tracking-tight text-slate-900">{value}</span>;
  };

  return (
    <Card className="relative overflow-hidden border-white/70 bg-white/85 backdrop-blur-xl">
      <ShineBorder borderWidth={1} duration={12} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${TONE_MAP[tone]} opacity-20 blur-2xl`} />
      <CardContent className="relative p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${TONE_MAP[tone]} shadow-md shadow-slate-200/70`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <div>{renderValue()}</div>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            {hint && <p className="text-xs leading-5 text-slate-500">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
