import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FeatureBadgeProps {
  text: string;
  icon: LucideIcon | React.ReactNode;
  color: 'indigo' | 'purple' | 'green' | 'blue' | 'amber' | 'red';
  className?: string;
}

const colorVariants = {
  indigo: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  purple: "bg-rose-50 text-rose-700 border border-rose-100",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  blue: "bg-sky-50 text-sky-700 border border-sky-100",
  amber: "bg-amber-50 text-amber-700 border border-amber-100",
  red: "bg-rose-50 text-rose-700 border border-rose-100"
};

export function FeatureBadge({ text, icon, color, className = '' }: FeatureBadgeProps) {
  const colorClass = colorVariants[color];
  
  return (
    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-sm ${colorClass} ${className}`}>
      <span className="mr-1">
        {React.isValidElement(icon) ? icon : React.createElement(icon as LucideIcon, { className: "h-4 w-4" })}
      </span>
      {text}
    </div>
  );
} 
