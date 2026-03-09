import { Participation, Project, Subtask, ChatMessage } from '@/lib/types';
import { updateParticipation } from '@/lib/firestore';

// Save GitHub repository URL
export const saveGitHubRepoURL = async (
  participationId: string,
  githubRepoUrl: string,
  subtaskId: string,
  completedSubtasks: string[],
  totalSubtasksCount: number
) => {
  // Only add if not already completed
  if (!completedSubtasks.includes(subtaskId)) {
    completedSubtasks.push(subtaskId);
  }
  
  const newProgress = Math.round((completedSubtasks.length / totalSubtasksCount) * 100);
  
  await updateParticipation(participationId, {
    studentGitHubRepo: githubRepoUrl,
    completedSubtasks,
    progress: newProgress
  });
  
  return {
    completedSubtasks,
    progress: newProgress,
    studentGitHubRepo: githubRepoUrl
  };
};

// Save chat history to Firebase
export const saveTaskChatHistory = async (
  participationId: string,
  subtaskId: string,
  currentChatHistory: Record<string, ChatMessage[]> | undefined,
  newMessages: ChatMessage[]
) => {
  try {
    const updatedChatHistory = {
      ...(currentChatHistory || {}),
      [subtaskId]: newMessages
    };
    
    await updateParticipation(participationId, {
      chatHistory: updatedChatHistory
    });
    
    return updatedChatHistory;
  } catch (error) {
    console.error('Error saving chat history:', error);
    throw error;
  }
};

// GitHubInfoButton component in task-utils.ts
export const GitHubInfoButton = () => {
  return null; // Placeholder - the actual component is defined elsewhere
};

// TaskNavigation component in task-utils.ts
export const TaskNavigation = () => {
  return null; // Placeholder - the actual component is defined elsewhere
};

// Check if a task is the last one in the project
export const isLastTask = (project: Project | null, subtask: Subtask | null): boolean => {
  if (!project || !subtask) return false;
  
  const sortedSubtasks = [...project.subtasks].sort((a, b) => a.order - b.order);
  return sortedSubtasks[sortedSubtasks.length - 1].id === subtask.id;
};

// Check if all tasks in a project are completed
export const areAllTasksCompleted = (project: Project | null, participation: Participation | null): boolean => {
  if (!project || !participation) return false;
  
  const completedSubtasks = participation.completedSubtasks || [];
  return project.subtasks.every(task => completedSubtasks.includes(task.id));
}; 