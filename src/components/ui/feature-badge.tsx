import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FeatureBadgeProps {
  text: string;
  icon: LucideIcon | React.ReactNode;
  color: 'indigo' | 'purple' | 'green' | 'blue' | 'amber' | 'red';
  className?: string;
}

const colorVariants = {
  indigo: "bg-indigo-100 text-indigo-800",
  purple: "bg-purple-100 text-purple-800",
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800"
};

export function FeatureBadge({ text, icon, color, className = '' }: FeatureBadgeProps) {
  const colorClass = colorVariants[color];
  
  return (
    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass} ${className}`}>
      <span className="mr-1">
        {React.isValidElement(icon) ? icon : React.createElement(icon as LucideIcon, { className: "h-4 w-4" })}
      </span>
      {text}
    </div>
  );
} 