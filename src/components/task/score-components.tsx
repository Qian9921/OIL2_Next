import React from 'react';

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
    <div className={`w-full bg-gray-200 rounded-full h-${height} ${className}`}>
      <div
        className={`h-${height} rounded-full ${score >= threshold ? 'bg-green-600' : 'bg-red-600'}`}
        style={{ width: `${score}%` }}
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
    if (score >= 90) return 'bg-purple-100 text-purple-800';
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatScoreText = (score: number) => {
    if (score >= 90) return `${score}% 🌟`;
    if (score >= 80) return `${score}% ✨`;
    if (score >= 60) return `${score}% ✅`;
    if (score >= 40) return `${score}% ⚠️`;
    return `${score}% ❗`;
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(score)} ${className}`}>
      {text || formatScoreText(score)}
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
    if (streak >= 5) return 'bg-purple-100 text-purple-800 border border-purple-300';
    if (streak >= 3) return 'bg-green-100 text-green-800 border border-green-300';
    return 'bg-blue-100 text-blue-800 border border-blue-300';
  };

  return (
    <div 
      className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStreakClass(currentStreak)} ${isAnimating ? 'animate-bounce-short' : ''}`}
      title={`You have a streak of ${currentStreak} good prompts! Your best streak is ${bestStreak}.`}
    >
      <span className="mr-1">🔥</span>
      <span className={isAnimating ? 'animate-pulse' : ''}>{currentStreak}</span>
    </div>
  );
}; 