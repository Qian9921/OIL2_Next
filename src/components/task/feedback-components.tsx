import React from 'react';
import { Info } from 'lucide-react';
import { DimensionScoreDisplay } from './score-components';

/**
 * Reusable component for displaying prompt feedback
 */
export interface PromptFeedbackData {
  feedback?: string;
}

interface PromptFeedbackDisplayProps {
  feedback: PromptFeedbackData;
  score?: number;
  goalScore?: number;
  contextScore?: number;
  expectationsScore?: number;
  sourceScore?: number;
  showTitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Simple wrapper component for prompt feedback display with default styling
 */
export const PromptFeedbackMessage = ({ 
  feedback, 
  className = "mb-4",
  size = "md"
}: { 
  feedback: PromptFeedbackData;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  if (!feedback || !feedback.feedback) return null;
  
  return (
    <div className={`text-sm ${className}`}>
      <PromptFeedbackDisplay 
        feedback={feedback}
        size={size}
      />
    </div>
  );
};

export const PromptFeedbackDisplay = ({ 
  feedback, 
  score,
  goalScore,
  contextScore,
  expectationsScore,
  sourceScore,
  showTitle = true, 
  size = 'md',
  className = ''
}: PromptFeedbackDisplayProps) => {
  // Determine text size based on the size prop
  const textSizes = {
    sm: {
      title: 'text-xs',
      content: 'text-xs',
    },
    md: {
      title: 'text-sm',
      content: 'text-xs',
    },
    lg: {
      title: 'text-base',
      content: 'text-sm',
    }
  };
  
  // Check if we have feedback to display
  const hasFeedback = typeof feedback?.feedback === 'string' && feedback.feedback.trim() !== '';
  
  // Check if we have ANY scores to display (even if low)
  const hasAnyScore = score !== undefined;
  const hasAnyDimensionScores = 
    goalScore !== undefined &&
    contextScore !== undefined &&
    expectationsScore !== undefined && 
    sourceScore !== undefined;
  
  // If we have no feedback and no scores at all, don't render anything
  if (!hasFeedback && !hasAnyScore && !hasAnyDimensionScores) {
    return null;
  }
  
  // We have something to display
  const fontSize = textSizes[size];
  
  return (
    <div className={`rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-sky-50 p-3 ${className}`}>
      <div className="flex items-start">
        <Info className={`mr-2 mt-0.5 flex-shrink-0 text-rose-500 ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}`} />
        <div className="space-y-2 flex-1">
          {showTitle && (
            <p className={`font-medium text-slate-900 ${fontSize.title}`}>
              Prompt Quality Feedback
              {hasAnyScore && `: ${score!.toFixed(0)}%`}
            </p>
          )}
          
          {/* Always display dimension scores when available */}
          {hasAnyDimensionScores && (
            <div className="grid grid-cols-2 gap-2 mb-2 sm:grid-cols-4">
              <DimensionScoreDisplay label="Goal" score={goalScore!} size={size as 'sm' | 'md' | 'lg'} />
              <DimensionScoreDisplay label="Context" score={contextScore!} size={size as 'sm' | 'md' | 'lg'} />
              <DimensionScoreDisplay label="Expectations" score={expectationsScore!} size={size as 'sm' | 'md' | 'lg'} />
              <DimensionScoreDisplay label="Source" score={sourceScore!} size={size as 'sm' | 'md' | 'lg'} />
            </div>
          )}
          
          {/* Display the feedback paragraph */}
          {hasFeedback && (
            <div className="mt-2">
              <p className={`${fontSize.content} text-slate-700`}>
                {feedback.feedback}
              </p>
            </div>
          )}
          
          {/* Show message if no detailed feedback but score exists */}
          {hasAnyScore && !hasFeedback && (
            <p className={`${fontSize.content} text-slate-700`}>
              Score calculated based on your prompt quality.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 
