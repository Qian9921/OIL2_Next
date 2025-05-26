import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /** Additional CSS classes */
  className?: string;
  /** Size of the spinner (defaults to medium) */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display beneath the spinner */
  text?: string;
  /** Full height container (default: true) */
  fullHeight?: boolean;
}

/**
 * Reusable loading indicator component that can be used across the application
 */
export function LoadingState({ 
  className, 
  size = 'md', 
  text, 
  fullHeight = true 
}: LoadingStateProps) {
  const sizeClasses = {
    'sm': 'w-6 h-6',
    'md': 'w-12 h-12',
    'lg': 'w-16 h-16'
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center", 
      fullHeight && "h-[calc(100vh-var(--header-height,4rem))]",
      className
    )}>
      <Loader2 className={cn(
        "text-purple-600 animate-spin", 
        sizeClasses[size]
      )} />
      {text && (
        <p className="mt-4 text-gray-600">{text}</p>
      )}
    </div>
  );
} 