import React from 'react';
import { CheckCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  completedTasks?: number;
  totalTasks?: number;
  showCompletionIcon?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  completedTasks,
  totalTasks,
  showCompletionIcon = true,
  className = ""
}: ProgressBarProps) {
  const isComplete = progress === 100;
  
  return (
    <div className={`mb-3 ${className}`}>
      {completedTasks !== undefined && totalTasks !== undefined && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-slate-700">
            Progress: {completedTasks}/{totalTasks} tasks
          </span>
          <span className="text-sm font-medium text-slate-700">
            {progress}%
          </span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 transition-all duration-500 ease-in-out"
          style={{ 
            width: `${progress}%`,
            boxShadow: isComplete ? '0 0 8px rgba(99, 102, 241, 0.28)' : 'none'
          }}
        />
      </div>
      {isComplete && showCompletionIcon && (
        <div className="mt-1 flex items-center text-xs font-medium text-emerald-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed all tasks!
        </div>
      )}
    </div>
  );
} 
