import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { ScoreBadge, MetricScoreCard } from './score-components';
import { RequirementCheckpoint } from './dialog-components';
import { AlertTriangle, Info } from 'lucide-react';

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

type PromptHistoryEntry = {
  timestamp: Timestamp;
  content: string;
  qualityScore: number;
  goalScore?: number;
  contextScore?: number;
  expectationsScore?: number;
  sourceScore?: number;
  isGoodPrompt?: boolean;
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
  const date = evaluation.timestamp?.toDate();
  const formattedDate = date ? new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date) : 'Unknown Date';
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
        <div className="flex items-center">
          <span className="font-medium">Attempt {totalCount - index}</span>
          <span className="mx-2">•</span>
          <span className="text-sm text-gray-500">{formattedDate}</span>
        </div>
        <ScoreBadge score={evaluation.score} />
      </div>
      
      <div className="p-4 space-y-4">
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
      </div>
    </div>
  );
};

export const PromptHistoryItem = ({ 
  prompt 
}: { 
  prompt: PromptHistoryEntry;
}) => {
  const date = prompt.timestamp?.toDate();
  const formattedDate = date ? new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date) : 'Unknown Date';
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
        <div className="flex items-center">
          <span className="font-medium">{prompt.isGoodPrompt ? 'Good Prompt' : 'Needs Improvement'}</span>
          <span className="mx-2">•</span>
          <span className="text-sm text-gray-500">{formattedDate}</span>
        </div>
        <ScoreBadge score={prompt.qualityScore} />
      </div>
      
      <div className="p-4 space-y-4">
        {/* Prompt Content */}
        <div>
          <h4 className="font-semibold text-sm mb-1">Prompt:</h4>
          <div className="bg-gray-50 p-3 rounded-md text-sm border">
            {prompt.content}
          </div>
        </div>
        
        {/* Component Scores */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Score Breakdown:</h4>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <MetricScoreCard 
              label="Goal" 
              score={prompt.goalScore || 0} 
              bgColor="bg-blue-50" 
              borderColor="border-blue-100" 
              barColor="bg-blue-600" 
            />
            <MetricScoreCard 
              label="Context" 
              score={prompt.contextScore || 0} 
              bgColor="bg-green-50" 
              borderColor="border-green-100" 
              barColor="bg-green-600" 
            />
            <MetricScoreCard 
              label="Expectations" 
              score={prompt.expectationsScore || 0} 
              bgColor="bg-purple-50" 
              borderColor="border-purple-100" 
              barColor="bg-purple-600" 
            />
            <MetricScoreCard 
              label="Source" 
              score={prompt.sourceScore || 0} 
              bgColor="bg-amber-50" 
              borderColor="border-amber-100" 
              barColor="bg-amber-600" 
            />
          </div>
        </div>
        
        {/* Tips based on scores */}
        <div>
          <h4 className="font-semibold text-sm mb-1">Tips for Improvement:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {(prompt.goalScore !== undefined && prompt.goalScore < 70) && (
              <li className="text-gray-700">Be more specific about what you're trying to achieve</li>
            )}
            {(prompt.contextScore !== undefined && prompt.contextScore < 70) && (
              <li className="text-gray-700">Provide more context about your task or problem</li>
            )}
            {(prompt.expectationsScore !== undefined && prompt.expectationsScore < 70) && (
              <li className="text-gray-700">Clarify what kind of response you expect</li>
            )}
            {(prompt.sourceScore !== undefined && prompt.sourceScore < 70) && (
              <li className="text-gray-700">Include references or examples to guide the response</li>
            )}
            {(prompt.goalScore !== undefined && prompt.contextScore !== undefined && 
              prompt.expectationsScore !== undefined && prompt.sourceScore !== undefined &&
              prompt.goalScore >= 70 && prompt.contextScore >= 70 && 
              prompt.expectationsScore >= 70 && prompt.sourceScore >= 70) && (
              <li className="text-green-700">Great prompt! It's clear, specific, and provides good context.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const EmptyPromptHistory = () => (
  <div className="space-y-4">
    <div className="text-center py-6">
      <Info className="w-12 h-12 mx-auto text-purple-500 mb-2" />
      <p className="text-gray-600 mb-2">No prompt history found for this task yet.</p>
      <p className="text-gray-500 text-sm">Try sending a message in the chat to generate prompt feedback.</p>
    </div>
  </div>
);

export const EmptyEvaluationHistory = () => (
  <div className="text-center py-10">
    <p className="text-gray-500">No evaluation history found for this task.</p>
  </div>
); 