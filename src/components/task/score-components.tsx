import React from 'react';

import { Flame, Sparkles, TriangleAlert } from 'lucide-react';

/**
 * Component for displaying a score value with color coding
 */
export const ScoreDisplay = ({ 
  score, 
  threshold = 80, 
  showPercentage = true 
}: { 
  score: number; 
  threshold?: number;
  showPercentage?: boolean;
}) => {
  return (
    <span className={`font-bold ${score >= threshold ? 'text-green-600' : 'text-red-600'}`}>
      {score}{showPercentage ? '%' : ''}
    </span>
  );
};

/**
 * Component for displaying a progress bar based on a score
 */
export const ScoreProgressBar = ({ 
  score, 
  threshold = 80,
  height = 2.5,
  className = ''
}: { 
  score: number; 
  threshold?: number;
  height?: number;
  className?: string;
}) => {
  return (
    <div className={`w-full rounded-full bg-slate-200/80 ${className}`} style={{ height: `${height * 4}px` }}>
      <div
        className={`rounded-full ${score >= threshold ? 'bg-emerald-500' : 'bg-rose-400'}`}
        style={{ width: `${score}%`, height: `${height * 4}px` }}
      ></div>
    </div>
  );
};

/**
 * Component for displaying a score badge with appropriate styling based on score value
 */
export const ScoreBadge = ({
  score,
  text,
  className = ''
}: {
  score: number;
  text?: string;
  className?: string;
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'border border-indigo-100 bg-indigo-50 text-indigo-700';
    if (score >= 80) return 'border border-emerald-100 bg-emerald-50 text-emerald-700';
    if (score >= 60) return 'border border-sky-100 bg-sky-50 text-sky-700';
    if (score >= 40) return 'border border-amber-100 bg-amber-50 text-amber-700';
    return 'border border-rose-100 bg-rose-50 text-rose-700';
  };

  const formatScoreText = (score: number) => {
    return `${score}%`;
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <Sparkles className="h-3.5 w-3.5" />;
    if (score >= 80) return <Sparkles className="h-3.5 w-3.5" />;
    if (score >= 60) return <Sparkles className="h-3.5 w-3.5" />;
    return <TriangleAlert className="h-3.5 w-3.5" />;
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(score)} ${className}`}>
      {getScoreIcon(score)}
      <span>{text || formatScoreText(score)}</span>
    </span>
  );
};

/**
 * Component for displaying a small metric score with label and progress indicator
 */
export const MetricScoreCard = ({
  label,
  score,
  bgColor = 'bg-blue-50',
  borderColor = 'border-blue-100',
  barColor = 'bg-blue-600'
}: {
  label: string;
  score: number;
  bgColor?: string;
  borderColor?: string;
  barColor?: string;
}) => {
  return (
    <div className={`${bgColor} p-2 rounded-md border ${borderColor}`}>
      <p className="text-xs text-gray-600">{label}</p>
      <div className="flex justify-between items-center">
        <span className="font-medium text-sm">{score}/100</span>
        <div className="w-16 bg-gray-200 rounded-full h-1.5">
          <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${score}%` }}></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component for displaying a simple dimension score (e.g., Goal: 75%)
 */
export const DimensionScoreDisplay = ({
  label,
  score,
  size = 'md'
}: {
  label: string;
  score: number;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const textSizes = {
    sm: { label: 'text-xs', score: 'text-xs' },
    md: { label: 'text-sm', score: 'text-sm' },
    lg: { label: 'text-base', score: 'text-base' },
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-2 text-center shadow-sm shadow-slate-100/80">
      <p className={`font-medium ${textSizes[size].label} text-slate-700`}>{label}</p>
      <p className={`${textSizes[size].score} text-indigo-600`}>{score.toFixed(0)}%</p>
    </div>
  );
};

/**
 * Component for displaying a streak badge
 */
export const StreakBadge = ({
  currentStreak,
  bestStreak,
  isAnimating = false
}: {
  currentStreak: number;
  bestStreak: number;
  isAnimating?: boolean;
}) => {
  const getStreakClass = (streak: number) => {
    if (streak >= 5) return 'bg-rose-100 text-rose-800 border border-rose-200';
    if (streak >= 3) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    return 'bg-sky-100 text-sky-800 border border-sky-200';
  };

  return (
    <div 
      className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStreakClass(currentStreak)} ${isAnimating ? 'animate-bounce-short' : ''}`}
      title={`You have a streak of ${currentStreak} good prompts! Your best streak is ${bestStreak}.`}
    >
      <Flame className="mr-1 h-3.5 w-3.5" />
      <span className={isAnimating ? 'animate-pulse' : ''}>{currentStreak}</span>
    </div>
  );
};
