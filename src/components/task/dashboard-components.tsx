import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, MessageSquare, TrendingUp, Trophy, Brain } from 'lucide-react';
import { ScoreBadge, ScoreProgressBar } from './score-components';
import Link from 'next/link';

/**
 * Displays a summary of a student's prompt quality statistics
 */
export const PromptQualitySummary = ({
  averageScore,
  bestStreak,
  totalPrompts,
  goodPromptsPercentage,
}: {
  averageScore: number;
  bestStreak: number;
  totalPrompts: number;
  goodPromptsPercentage: number;
}) => {
  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Prompt Quality
        </CardTitle>
        <Brain className="h-4 w-4 text-purple-600" />
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <div className="text-2xl font-bold text-purple-600">
            {averageScore.toFixed(0)}%
          </div>
          <ScoreBadge score={averageScore} className="ml-auto" />
        </div>
        <ScoreProgressBar score={averageScore} className="mb-2" />
        <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
          <span>Best streak: <span className="font-semibold text-purple-600">{bestStreak}🔥</span></span>
          <span>{goodPromptsPercentage}% good prompts</span>
          <span>Total: {totalPrompts}</span>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Displays a list of recent prompts with quality metrics
 */
export const RecentPromptsCard = ({
  prompts,
  onViewAllClick,
}: {
  prompts: Array<{
    id: string;
    projectTitle: string;
    taskTitle: string;
    content: string;
    qualityScore: number;
    timestamp: Date;
    projectId: string;
    subtaskId: string;
  }>;
  onViewAllClick?: () => void;
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span>Recent Prompts</span>
          </CardTitle>
          {onViewAllClick && (
            <button 
              onClick={onViewAllClick}
              className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
            >
              View all
            </button>
          )}
        </div>
        <CardDescription>
          Your recent AI interactions and their quality ratings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {prompts.length > 0 ? (
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <Link 
                key={prompt.id} 
                href={`/projects/${prompt.projectId}/task/${prompt.subtaskId}`}
                className="block"
              >
                <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">{prompt.projectTitle}</div>
                    <ScoreBadge score={prompt.qualityScore} />
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-1">{prompt.content}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{prompt.taskTitle}</span>
                    <span>{formatDate(prompt.timestamp)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p>No prompts found</p>
            <p className="text-sm">Start interacting with AI in your projects!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Displays prompt improvement tips based on a student's metrics
 */
export const PromptTipsCard = ({
  averageGoalScore,
  averageContextScore,
  averageExpectationsScore,
  averageSourceScore,
}: {
  averageGoalScore: number;
  averageContextScore: number;
  averageExpectationsScore: number;
  averageSourceScore: number;
}) => {
  // Determine which areas need improvement (scores below 70)
  const needsImprovementAreas = [];
  
  if (averageGoalScore < 70) {
    needsImprovementAreas.push({
      name: 'Goal Clarity',
      score: averageGoalScore,
      tips: [
        'Clearly state what you want to achieve',
        'Be specific about your desired outcome',
        'Start with action verbs like "create", "explain", or "solve"'
      ]
    });
  }
  
  if (averageContextScore < 70) {
    needsImprovementAreas.push({
      name: 'Context',
      score: averageContextScore,
      tips: [
        'Provide relevant background information',
        'Explain what you\'ve already tried',
        'Share constraints or requirements'
      ]
    });
  }
  
  if (averageExpectationsScore < 70) {
    needsImprovementAreas.push({
      name: 'Expectations',
      score: averageExpectationsScore,
      tips: [
        'Specify the format you want the response in',
        'Indicate the level of detail needed',
        'Mention if you need step-by-step guidance'
      ]
    });
  }
  
  if (averageSourceScore < 70) {
    needsImprovementAreas.push({
      name: 'Source Material',
      score: averageSourceScore,
      tips: [
        'Reference specific examples or resources',
        'Include relevant code snippets when applicable',
        'Mention related concepts you\'re familiar with'
      ]
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span>Prompt Improvement Tips</span>
        </CardTitle>
        <CardDescription>
          {needsImprovementAreas.length > 0 
            ? 'Focus on these areas to improve your AI interactions' 
            : 'Great job! Your prompts are well-crafted'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {needsImprovementAreas.length > 0 ? (
          <div className="space-y-4">
            {needsImprovementAreas.map((area) => (
              <div key={area.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{area.name}</h3>
                  <ScoreBadge score={area.score} />
                </div>
                <ul className="text-sm text-gray-600 space-y-1 pl-5 list-disc">
                  {area.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center p-4 bg-green-50 text-green-800 rounded-lg">
            <Trophy className="w-5 h-5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">Excellent prompt skills!</p>
              <p className="text-sm">Your prompts are well-structured with clear goals, context, expectations, and references.</p>
            </div>
          </div>
        )}
        
        <div className="bg-purple-50 p-3 rounded-lg mt-4 text-sm text-purple-800">
          <div className="flex items-start">
            <Info className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
            <p>High-quality prompts lead to better AI responses and can save you time on projects.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to format date
const formatDate = (date: Date): string => {
  // If date is today, show time
  const today = new Date();
  const isToday = date.getDate() === today.getDate() &&
                 date.getMonth() === today.getMonth() &&
                 date.getFullYear() === today.getFullYear();
  
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  
  // If date is within last 7 days, show day name
  const diffTime = Math.abs(today.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  
  // Otherwise show date
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}; 