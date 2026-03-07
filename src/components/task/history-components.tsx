import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { StudentDashboard, Participation } from '@/lib/types'; // Assuming these exist
import { ScoreBadge, DimensionScoreDisplay } from './score-components';
import { RequirementCheckpoint } from './dialog-components';
import { AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { PromptFeedbackDisplay } from './feedback-components';
import { formatTimestamp } from '@/lib/utils';

type EvaluationHistoryEntry = {
  timestamp: Timestamp;
  score: number;
  feedback: string;
  success?: boolean;
  message?: string;
  evaluationId?: string;
  status?: string;
  result?: {
    rawContent?: {
      summary?: string;
      assessment?: number;
      checkpoints?: Array<{
        status: string;
        details: string;
        requirement: string;
      }>;
      improvements?: string[];
    }
  }
};

export type PromptHistoryEntry = {
  timestamp: Timestamp;
  content: string;
  qualityScore: number;
  goalScore?: number;
  contextScore?: number;
  expectationsScore?: number;
  sourceScore?: number;
  isGoodPrompt?: boolean;
  feedback?: {
    feedback?: string;
  } | null;
};

export const EvaluationHistoryItem = ({ 
  evaluation, 
  index, 
  totalCount
}: { 
  evaluation: EvaluationHistoryEntry; 
  index: number;
  totalCount: number;
}) => {
  const formattedDate = formatTimestamp(evaluation.timestamp);
  
  return (
    <Collapsible className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <CollapsibleTrigger asChild>
        <div className="flex justify-between items-center p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 group border-b">
          <div className="flex items-center">
            <span className="font-medium">Attempt {totalCount - index}</span>
            <span className="mx-2">•</span>
            <span className="text-sm text-gray-500">{formattedDate}</span>
          </div>
          <div className="flex items-center">
            {typeof evaluation.score === 'number' && Number.isFinite(evaluation.score) ? (
              <ScoreBadge score={evaluation.score} />
            ) : evaluation.status && evaluation.status !== 'completed' ? (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Processing</span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">No Score</span>
            )}
            <ChevronDown className="h-5 w-5 text-gray-400 ml-2 transform transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="p-4 bg-white space-y-4">
        {/* Summary */}
        {evaluation.result?.rawContent?.summary && (
          <div>
            <h4 className="font-semibold text-sm mb-1">Summary:</h4>
            <p className="text-sm text-gray-700">{evaluation.result.rawContent.summary}</p>
          </div>
        )}
        
        {/* Requirements */}
        {evaluation.result?.rawContent?.checkpoints && evaluation.result.rawContent.checkpoints.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Requirements Status:</h4>
            <div className="space-y-2">
              {evaluation.result.rawContent.checkpoints.map((checkpoint, checkpointIndex) => (
                <RequirementCheckpoint
                  key={checkpointIndex}
                  status={checkpoint.status}
                  requirement={checkpoint.requirement}
                  details={checkpoint.details}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Improvements */}
        {evaluation.result?.rawContent?.improvements && evaluation.result.rawContent.improvements.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-1">Suggested Improvements:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {evaluation.result.rawContent.improvements.map((improvement, improvementIndex) => (
                <li key={improvementIndex} className="text-gray-700">{improvement}</li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const PromptHistoryItem = ({ 
  prompt 
}: { 
  prompt: PromptHistoryEntry;
}) => {
  const formattedDate = formatTimestamp(prompt.timestamp);
  
  // Check if we have ANY scores to display (even if low)
  const hasAnyScore = prompt.qualityScore !== undefined;
  const hasAnyDimensionScores = 
    prompt.goalScore !== undefined &&
    prompt.contextScore !== undefined &&
    prompt.expectationsScore !== undefined &&
    prompt.sourceScore !== undefined;
  
  // Check if we have valid feedback
  const hasValidFeedback = 
    prompt.feedback && 
    typeof prompt.feedback.feedback === 'string' && 
    prompt.feedback.feedback.trim() !== '';
  
  // Don't render anything if we have neither scores nor valid feedback
  if (!hasAnyScore && !hasAnyDimensionScores && !hasValidFeedback) {
    return null;
  }
  
  return (
    <Collapsible className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <CollapsibleTrigger asChild>
        <div className="flex justify-between items-center p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 group">
          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${prompt.isGoodPrompt ? 'text-green-700' : 'text-red-700'}`}>
              {prompt.isGoodPrompt ? 'Good Prompt' : 'Needs Improvement'}
            </span>
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
          <div className="flex items-center">
            {hasAnyScore && <ScoreBadge score={prompt.qualityScore} />}
            <ChevronDown className="h-5 w-5 text-gray-400 ml-2 transform transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 bg-white">
        {/* Display feedback and scores when available */}
        <div className="mb-4">
          <PromptFeedbackDisplay 
            feedback={hasValidFeedback ? prompt.feedback! : { feedback: undefined }} 
            score={hasAnyScore ? prompt.qualityScore : undefined}
            goalScore={hasAnyDimensionScores ? prompt.goalScore : undefined}
            contextScore={hasAnyDimensionScores ? prompt.contextScore : undefined}
            expectationsScore={hasAnyDimensionScores ? prompt.expectationsScore : undefined}
            sourceScore={hasAnyDimensionScores ? prompt.sourceScore : undefined}
            size="md" 
          />
        </div>
        <div className="mb-4">
          <h4 className="font-semibold text-sm text-gray-800 mb-1">Your Prompt:</h4>
          <div className="p-3 bg-gray-50 rounded border text-sm text-gray-700 whitespace-pre-wrap break-words">
            {prompt.content}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const EmptyPromptHistory = () => (
  <div className="space-y-4">
    <div className="text-center py-6">
      <Info className="w-12 h-12 mx-auto text-purple-500 mb-2" />
      <p className="text-gray-600 mb-2">No prompt feedback history available for this task yet.</p>
      <p className="text-gray-500 text-sm">Try sending a message in the chat to receive personalized feedback on your prompt quality.</p>
    </div>
  </div>
);

export const EmptyEvaluationHistory = () => (
  <div className="text-center py-10">
    <p className="text-gray-500">No evaluation history found for this task.</p>
  </div>
); 