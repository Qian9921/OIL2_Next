import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Github, ChevronUp, ChevronDown, CheckCircle, Lock, Circle } from 'lucide-react';
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import Link from 'next/link';
import { Project, Participation, ChatMessage } from '@/lib/types';
import { updateParticipation } from '@/lib/firestore';
import { GITHUB_SUBMISSION_SUBTASK_ID } from '@/lib/constants';

/**
 * GitHubInfoButton component - Provides GitHub repository information in a popover
 */
export const GitHubInfoButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center ${isOpen ? 'bg-blue-50 border-blue-200' : ''}`}
        aria-label="GitHub repository information"
      >
        <Github className="w-4 h-4 mr-2" />
        GitHub Info
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-lg border z-50 w-72 p-4">
          <h4 className="font-semibold text-base mb-2 text-gray-900">GitHub Repository Reminder</h4>
          <p className="text-sm text-gray-700">
            Remember to upload your work to your GitHub repository. Your project will be assessed based on 
            the code you commit to your repository.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Utility function to save task-specific chat history
 */
export const saveTaskChatHistory = async (
  participationId: string,
  subtaskId: string,
  currentChatHistory: { [key: string]: ChatMessage[] } | undefined,
  messages: ChatMessage[]
) => {
  const chatHistory = {
    ...(currentChatHistory || {}),
    [subtaskId]: messages
  };
  
  await updateParticipation(participationId, { chatHistory });
};

/**
 * TaskNavigation component - Displays navigation for project subtasks
 */
export const TaskNavigation = ({ 
  project, 
  participation, 
  currentSubtaskId 
}: { 
  project: Project | undefined; 
  participation: Participation | null | undefined;
  currentSubtaskId: string;
}) => {
  const [isProgressExpanded, setIsProgressExpanded] = useState(false); // Initially collapsed
  const navRef = useRef<HTMLDivElement>(null);
  
  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node) && isProgressExpanded) {
        setIsProgressExpanded(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProgressExpanded]);

  if (!project || !participation) return null;

  // Sort subtasks by order
  const sortedSubtasks = [...project.subtasks].sort((a, b) => a.order - b.order);
  
  // Find the current subtask index
  const currentIndex = sortedSubtasks.findIndex(task => task.id === currentSubtaskId);
  
  // Determine if GitHub submission task is present and adjust the task count
  const hasGitHubTask = sortedSubtasks.some(task => task.id === GITHUB_SUBMISSION_SUBTASK_ID);
  const isCurrentGitHubTask = currentSubtaskId === GITHUB_SUBMISSION_SUBTASK_ID;
  
  // Calculate the actual task count excluding GitHub task
  const totalRealTasks = hasGitHubTask ? sortedSubtasks.length - 1 : sortedSubtasks.length;
  
  // Calculate the current task number (if current is GitHub task, show it as "Setup" instead of a number)
  let currentTaskNumber;
  if (isCurrentGitHubTask) {
    currentTaskNumber = "Setup";
  } else if (hasGitHubTask) {
    // If there's a GitHub task, adjust the current index accordingly
    const gitHubTaskIndex = sortedSubtasks.findIndex(task => task.id === GITHUB_SUBMISSION_SUBTASK_ID);
    currentTaskNumber = currentIndex > gitHubTaskIndex ? currentIndex : currentIndex + 1;
  } else {
    currentTaskNumber = currentIndex + 1;
  }
  
  return (
    <div className="flex flex-col" ref={navRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsProgressExpanded(!isProgressExpanded)}
        className="p-1.5 h-auto flex items-center"
        aria-label={isProgressExpanded ? "Collapse task progress" : "Expand task progress"}
      >
        <span className="text-sm font-medium mr-2">
          {isCurrentGitHubTask ? 
            `Repository Setup` : 
            `Task ${currentTaskNumber} of ${totalRealTasks}`}
        </span>
        {isProgressExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>
      
      <Collapsible open={isProgressExpanded} className="relative">
        <CollapsibleContent className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-md border p-3 z-40 w-auto min-w-[280px] max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {sortedSubtasks.map((task, index) => {
              const isCompleted = participation.completedSubtasks?.includes(task.id);
              const isCurrent = task.id === currentSubtaskId;
              // Calculate if this task is available based on sequential completion
              const previousTasksCompleted = index === 0 || 
                sortedSubtasks
                  .slice(0, index)
                  .every(t => participation.completedSubtasks?.includes(t.id));
              
              // Skip rendering the GitHub task in the task list display
              const isGitHubTask = task.id === GITHUB_SUBMISSION_SUBTASK_ID;
              const displayIndex = isGitHubTask ? "Setup" : 
                (hasGitHubTask && index > sortedSubtasks.findIndex(t => t.id === GITHUB_SUBMISSION_SUBTASK_ID)) ? 
                  index : index + 1;
              
              return (
                <Link
                  key={task.id}
                  href={`/projects/${project.id}/task/${task.id}`}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm mb-2
                    ${isCurrent ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}
                    ${isCompleted ? 'text-green-700' : ''}
                    ${!previousTasksCompleted && !isCompleted ? 'text-gray-500' : ''}
                  `}
                >
                  <div className="flex items-center min-w-0">
                    <span className="w-6 flex-shrink-0 flex justify-center">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : !previousTasksCompleted ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                    </span>
                    <span className="ml-2 truncate">
                      {isGitHubTask ? "Setup" : `${displayIndex}. `} {task.title}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

/**
 * Utility function to save GitHub repository URL and update task completion status
 */
export const saveGitHubRepoURL = async (
  participationId: string,
  repoUrl: string,
  subtaskId: string,
  completedSubtasks: string[] = [],
  totalSubtasks: number
) => {
  // Calculate new progress
  const newCompletedSubtasks = completedSubtasks.includes(subtaskId)
    ? completedSubtasks
    : [...completedSubtasks, subtaskId];
  
  const newProgress = Math.round((newCompletedSubtasks.length / totalSubtasks) * 100);
  
  // Use the properly typed update object
  const updateData: Partial<Participation> = {
    completedSubtasks: newCompletedSubtasks,
    progress: newProgress,
    studentGitHubRepo: repoUrl
  };
  
  await updateParticipation(participationId, updateData);
  
  return {
    completedSubtasks: newCompletedSubtasks,
    progress: newProgress
  };
};