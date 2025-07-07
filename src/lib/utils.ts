import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate an avatar URL from a seed (e.g., email or ID)
export const generateAvatar = (seed: string | undefined): string => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed || 'default'}`;
};

// Function to get Tailwind CSS classes for project status
export const getStatusColor = (status: string | undefined): string => {
  if (status === 'draft') return 'bg-gray-100 text-gray-800';
  if (status === 'published') return 'bg-blue-100 text-blue-800';
  if (status === 'completed') return 'bg-green-100 text-green-800';
  if (status === 'archived') return 'bg-red-100 text-red-800';
  if (status === 'active') return 'bg-yellow-100 text-yellow-800'; // For participation status
  return 'bg-gray-100 text-gray-800'; // Default or other statuses
};

// Function to get Tailwind CSS classes for project difficulty
export const getDifficultyColor = (difficulty: string | undefined): string => {
  if (difficulty === 'beginner') return 'bg-green-100 text-green-800';
  if (difficulty === 'intermediate') return 'bg-yellow-100 text-yellow-800';
  if (difficulty === 'advanced') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800'; // Default or other difficulties
};

// Function to format a date object into a relative time string (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date | Timestamp): string => {
  if (!date) {
    return "Invalid date";
  }

  // Convert Firebase Timestamp to JS Date if necessary
  const jsDate = typeof (date as Timestamp).toDate === 'function' ? (date as Timestamp).toDate() : date as Date;

  if (!(jsDate instanceof Date) || isNaN(jsDate.getTime())) {
    return "Invalid date"; 
  }

  const now = new Date();
  const seconds = Math.round((now.getTime() - jsDate.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30.44); // Average days in a month
  const years = Math.round(days / 365.25); // Account for leap years

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  if (weeks < 5) return `${weeks} weeks ago`; // Up to 4 weeks
  if (months < 12) return `${months} months ago`;
  return `${years} years ago`;
};

// Function to get raw base64 data from a data URL string
export const getRawBase64 = (dataUrl?: string): string | undefined => {
  if (!dataUrl) return undefined;
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    // It might already be a raw base64 string, or an invalid data URL.
    // For robustness, let's assume if no comma, it might be raw, or needs to be handled by caller.
    // console.warn("getRawBase64: No comma found, returning original string. Might not be a data URL.");
    return dataUrl; 
  }
  return dataUrl.substring(commaIndex + 1);
};

/**
 * Estimates a reasonable number of days to complete a project based on difficulty
 * @param difficulty Project difficulty level
 * @returns Number of days estimated to complete the project
 */
export function estimateDaysFromDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): number {
  switch (difficulty) {
    case 'beginner':
      return 21; // 3 weeks
    case 'intermediate':
      return 35; // 5 weeks
    case 'advanced':
      return 49; // 7 weeks
    default:
      return 28; // 4 weeks as a fallback
  }
}

/**
 * Calculates a deadline date based on the current date and estimated days to complete
 * @param estimatedDays Number of days estimated to complete the project
 * @param fromDate Optional start date (defaults to current date)
 * @returns Date object representing the deadline
 */
export function calculateDeadlineFromDays(estimatedDays: number, fromDate: Date = new Date()): Date {
  const deadline = new Date(fromDate);
  deadline.setDate(deadline.getDate() + estimatedDays);
  return deadline;
}

/**
 * Formats a deadline date for display in the UI with optional fallback text
 * @param deadline Date or Timestamp object representing the deadline
 * @param fallbackText Text to display if no deadline is provided
 * @returns Formatted deadline string
 */
export function formatDeadline(deadline: Date | Timestamp | undefined | null, fallbackText: string = 'No deadline'): string {
  if (!deadline) return fallbackText;
  
  let dateObj: Date;
  if (deadline instanceof Date) {
    dateObj = deadline;
  } else if (typeof deadline === 'object' && deadline !== null && typeof deadline.toDate === 'function') {
    dateObj = deadline.toDate();
  } else {
    // Fallback: treat as Date-like object or convert to Date
    dateObj = new Date(deadline as any);
  }
  
  return dateObj.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Calculates estimated hours to complete a project based on subtasks or difficulty
 * @param project Project object with subtasks and difficulty
 * @returns Estimated hours as a number
 */
export function calculateEstimatedHours(project: { 
  subtasks?: { id: string; estimatedHours?: number }[]; 
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}): number {
  if (!project.subtasks?.length) return 0;
  
  // First try to sum up actual estimatedHours from subtasks if available
  const subtasksWithHours = project.subtasks.filter(st => typeof st.estimatedHours === 'number' && st.estimatedHours > 0);
  if (subtasksWithHours.length > 0) {
    const totalHours = subtasksWithHours.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);
    return totalHours;
  }
  
  // Fallback to calculation based on difficulty if no explicit hours are defined
  const subtaskCount = project.subtasks.length;
  const hoursPerSubtask = project.difficulty === 'advanced' ? 8 : 
                         project.difficulty === 'intermediate' ? 5 : 3;
  
  return subtaskCount * hoursPerSubtask;
}

/**
 * Format a Firestore timestamp into a human-readable date/time string
 */
export const formatTimestamp = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'Unknown Date';
  
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

// Firebase connection management utilities
export function getFirebaseConnectionStatus() {
  try {
    // 动态导入以避免服务器端错误
    const { getConnectionStatus, getPersistenceStatus } = require('./firebase');
    return {
      isOnline: getConnectionStatus(),
      persistenceEnabled: getPersistenceStatus(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Failed to get Firebase connection status:', error);
    return {
      isOnline: false,
      persistenceEnabled: false,
      timestamp: new Date().toISOString()
    };
  }
}

export async function forceFirebaseReconnect() {
  try {
    const { forceReconnect } = require('./firebase');
    await forceReconnect();
    return true;
  } catch (error) {
    console.error('Failed to force Firebase reconnect:', error);
    return false;
  }
}

// Enhanced error handling for Firebase operations
export function isFirebaseAvailable(): boolean {
  try {
    const { getConnectionStatus } = require('./firebase');
    return getConnectionStatus();
  } catch (error) {
    return false;
  }
}

export function logFirebaseError(error: any, context: string = 'Firebase Operation'): void {
  if (error?.code === 'unavailable') {
    // Don't log unavailable errors as they're expected during network issues
    return;
  }
  
  console.error(`${context} Error:`, {
    code: error?.code,
    message: error?.message,
    timestamp: new Date().toISOString(),
    context
  });
}
