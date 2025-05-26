import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, MessageSquare, TrendingUp, Trophy, Brain, Clock, Calendar, BookOpen, Award, FileText, CheckCircle } from 'lucide-react';
import { ScoreBadge, ScoreProgressBar } from './score-components';
import Link from 'next/link';
import { Activity } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';

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
        </div>
        <ScoreProgressBar score={averageScore} className="mb-2" />
        <div className="text-xs text-gray-500 mt-2">
          {bestStreak > 1 && <span className="mr-2">Best streak: <span className="font-semibold text-purple-600">{bestStreak}🔥</span></span>}
          <span>Total prompts: {totalPrompts}</span>
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
 * Displays recent student activities across projects
 */
export const RecentActivityCard = ({
  activities,
  onViewAllClick,
}: {
  activities: Activity[];
  onViewAllClick?: () => void;
}) => {
  // Helper function to get icon by activity type
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'project_joined':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'subtask_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'submission_made':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'certificate_earned':
        return <Award className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>Recent Activity</span>
          </CardTitle>
          {onViewAllClick && (
            <button 
              onClick={onViewAllClick}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              View all
            </button>
          )}
        </div>
        <CardDescription>
          Your latest learning milestones and achievements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <span className="text-xs text-gray-500">{formatRelativeTime(activity.timestamp.toDate())}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p>No recent activity</p>
            <p className="text-sm">Start working on projects to see your activity here!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// For backwards compatibility - keep the PromptTipsCard export but implement it as empty
export const PromptTipsCard = () => {
  // This component is kept for backwards compatibility but doesn't render anything
  return null;
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
  
  // If date is in the last 7 days, show day name
  const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
  
  // Otherwise show date
  return date.toLocaleDateString();
}; 