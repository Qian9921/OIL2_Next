import React from 'react';

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  color: 'indigo' | 'purple' | 'blue' | 'amber' | 'green' | 'teal';
  children: React.ReactNode;
  className?: string;
}

const colorVariants = {
  indigo: {
    bg: "bg-gradient-to-br from-indigo-50 to-sky-50",
    border: "border-indigo-100",
    iconBg: "bg-gradient-to-br from-indigo-300 to-sky-400",
    progressBg: "bg-indigo-400"
  },
  purple: {
    bg: "bg-gradient-to-br from-rose-50 to-peach-50",
    border: "border-rose-100",
    iconBg: "bg-gradient-to-br from-rose-300 to-rose-400",
    progressBg: "bg-rose-400"
  },
  blue: {
    bg: "bg-gradient-to-br from-sky-50 to-blue-50",
    border: "border-sky-100",
    iconBg: "bg-gradient-to-br from-sky-300 to-blue-400",
    progressBg: "bg-sky-400"
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    border: "border-amber-100",
    iconBg: "bg-gradient-to-br from-amber-300 to-orange-400",
    progressBg: "bg-amber-400"
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    border: "border-emerald-100",
    iconBg: "bg-gradient-to-br from-emerald-300 to-teal-400",
    progressBg: "bg-emerald-400"
  },
  teal: {
    bg: "bg-gradient-to-br from-teal-50 to-cyan-50",
    border: "border-teal-100",
    iconBg: "bg-gradient-to-br from-teal-300 to-cyan-400",
    progressBg: "bg-teal-400"
  }
};

export function MetricCard({ title, icon, color, children, className = '' }: MetricCardProps) {
  const colorClasses = colorVariants[color];
  
  return (
    <div className={`flex flex-col p-4 ${colorClasses.bg} rounded-xl border ${colorClasses.border} shadow-sm ${className}`}>
      <div className="flex items-center mb-4">
        <div className={`w-12 h-12 ${colorClasses.iconBg} rounded-full flex items-center justify-center text-white mr-4 shadow-sm`}>
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-gray-900">{title}</h4>
        </div>
      </div>
      {children}
    </div>
  );
}

interface ProgressBarProps {
  progress: number;
  color: 'indigo' | 'purple' | 'blue' | 'amber' | 'green' | 'teal';
  showValue?: boolean;
  className?: string;
}

export function SimpleProgressBar({ progress, color, showValue = false, className = '' }: ProgressBarProps) {
  const colorClass = colorVariants[color].progressBg;
  
  return (
    <div className={`flex flex-col ${className}`}>
      {showValue && (
        <div className="flex justify-between items-center mb-1">
          <span className="font-medium text-sm">{progress}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className={`${colorClass} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
} 
