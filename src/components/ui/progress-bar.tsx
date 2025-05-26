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
          <span className="text-sm font-medium text-gray-700">
            Progress: {completedTasks}/{totalTasks} tasks
          </span>
          <span className="text-sm font-medium text-gray-700">
            {progress}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
          style={{ 
            width: `${progress}%`,
            boxShadow: isComplete ? '0 0 8px rgba(168, 85, 247, 0.5)' : 'none'
          }}
        />
      </div>
      {isComplete && showCompletionIcon && (
        <div className="text-xs text-green-600 font-medium flex items-center mt-1">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed all tasks!
        </div>
      )}
    </div>
  );
} 