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
      fullHeight && "min-h-[calc(100dvh-var(--app-shell-top-offset,6rem))]",
      className
    )}>
      <Loader2 className={cn(
        "text-indigo-500 animate-spin", 
        sizeClasses[size]
      )} />
      {text && (
        <p className="mt-4 text-slate-600">{text}</p>
      )}
    </div>
  );
}

// Firebase connection status indicator
interface FirebaseConnectionIndicatorProps {
  showStatus?: boolean;
  className?: string;
}

export function FirebaseConnectionIndicator({ 
  showStatus = false, 
  className = '' 
}: FirebaseConnectionIndicatorProps) {
  const [connectionStatus, setConnectionStatus] = React.useState<{
    isOnline: boolean;
    persistenceEnabled: boolean;
    timestamp: string;
  } | null>(null);

  React.useEffect(() => {
    if (!showStatus) return;

    const checkConnection = async () => {
      try {
        const { getFirebaseConnectionStatus } = await import('@/lib/utils');
        const status = getFirebaseConnectionStatus();
        setConnectionStatus(status);
      } catch (error) {
        console.warn('Failed to check Firebase connection:', error);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [showStatus]);

  if (!showStatus || !connectionStatus) return null;

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      Firebase: {connectionStatus.isOnline ? '🟢' : '🔴'} 
      {connectionStatus.persistenceEnabled ? ' 💾' : ''}
    </div>
  );
} 
