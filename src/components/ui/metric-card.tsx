import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  color: 'indigo' | 'purple' | 'blue' | 'amber' | 'green' | 'teal';
  children: React.ReactNode;
  className?: string;
}

const colorVariants = {
  indigo: {
    bg: "bg-gradient-to-br from-indigo-50 to-indigo-100",
    border: "border-indigo-200",
    iconBg: "bg-gradient-to-br from-indigo-400 to-indigo-600",
    progressBg: "bg-indigo-600"
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50 to-purple-100",
    border: "border-purple-200",
    iconBg: "bg-gradient-to-br from-purple-400 to-purple-600",
    progressBg: "bg-purple-600"
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100",
    border: "border-blue-200",
    iconBg: "bg-gradient-to-br from-blue-400 to-blue-600",
    progressBg: "bg-blue-600"
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100",
    border: "border-amber-200",
    iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    progressBg: "bg-amber-600"
  },
  green: {
    bg: "bg-gradient-to-br from-green-50 to-green-100",
    border: "border-green-200",
    iconBg: "bg-gradient-to-br from-green-400 to-green-600",
    progressBg: "bg-green-600"
  },
  teal: {
    bg: "bg-gradient-to-br from-green-50 to-teal-50",
    border: "border-green-100",
    iconBg: "bg-gradient-to-br from-green-500 to-teal-600",
    progressBg: "bg-teal-600"
  }
};

export function MetricCard({ title, icon, color, children, className = '' }: MetricCardProps) {
  const colorClasses = colorVariants[color];
  
  return (
    <div className={`flex flex-col p-4 ${colorClasses.bg} rounded-xl border ${colorClasses.border} ${className}`}>
      <div className="flex items-center mb-4">
        <div className={`w-12 h-12 ${colorClasses.iconBg} rounded-full flex items-center justify-center text-white mr-4 shadow-md`}>
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