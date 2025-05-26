import { ToastActionElement } from "@/components/ui/toast";

interface ToastOptions {
  /** Optional description text */
  description?: string;
  /** Optional action element */
  action?: ToastActionElement;
  /** Duration in milliseconds */
  duration?: number;
}

type ToastFunction = (options: {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
}) => void;

/**
 * Display a success toast notification
 */
export function showSuccessToast(
  toast: ToastFunction, 
  title: string, 
  options?: ToastOptions
) {
  toast({
    title,
    description: options?.description,
    action: options?.action,
    variant: "default"
  });
}

/**
 * Display an error toast notification
 */
export function showErrorToast(
  toast: ToastFunction, 
  title: string, 
  options?: ToastOptions
) {
  toast({
    title,
    description: options?.description || "An error occurred. Please try again.",
    action: options?.action,
    variant: "destructive"
  });
}

/**
 * Display an info toast notification
 */
export function showInfoToast(
  toast: ToastFunction, 
  title: string, 
  options?: ToastOptions
) {
  toast({
    title,
    description: options?.description,
    action: options?.action,
    variant: "default"
  });
}

/**
 * Display a toast for streak achievements
 */
export function showStreakToast(
  toast: ToastFunction,
  streakCount: number,
  bestStreak: number
) {
  // Create a more engaging message based on streak length
  let streakEmoji = "🔥";
  let streakTitle = `Prompt Streak: ${streakCount}`;
  let description = "You're creating high-quality prompts!";
  
  // Customize based on streak level
  if (streakCount >= 10) {
    streakEmoji = "🏆🔥🏆";
    streakTitle = `LEGENDARY STREAK: ${streakCount}!`;
    description = "Incredible! You're a prompt engineering master!";
  } else if (streakCount >= 7) {
    streakEmoji = "⭐🔥⭐";
    streakTitle = `AMAZING STREAK: ${streakCount}!`;
    description = "Outstanding prompt crafting skills!";
  } else if (streakCount >= 5) {
    streakEmoji = "🌟🔥";
    streakTitle = `Awesome Streak: ${streakCount}!`;
    description = "You're becoming a prompt expert!";
  } else if (streakCount >= 3) {
    streakEmoji = "✨🔥";
    streakTitle = `Great Streak: ${streakCount}!`;
    description = "Your prompts are consistently good!";
  }
  
  // Add special note if it's a new record
  if (streakCount === bestStreak && streakCount > 2) {
    description = `NEW RECORD! ${description}`;
  }
  
  toast({
    title: `${streakEmoji} ${streakTitle}`,
    description: description,
    variant: "default"
  });
} 