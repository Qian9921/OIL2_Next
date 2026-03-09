'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';

// UI Components
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { SubmitProjectDialog } from '@/components/project/submit-project-dialog';

// Icons
import { 
  Send, CheckCircle, BookOpen, AlertTriangle, Bot, 
  Trash2, Paperclip, Lock, Loader2, Github, Info, 
  ChevronLeft, Clock, X as XIcon,
  MessageCircleQuestion, XCircle, MessageSquare, SendHorizonal
} from 'lucide-react';

// Project-specific components
import { ChatMessage as ChatMessageComponent } from '@/components/chat/chat-message';
import { TutorInsightsStrip } from '@/components/chat/tutor-insights-strip';
import { TutorQuickActions } from '@/components/chat/tutor-quick-actions';
import { TutorContextPills } from '@/components/chat/tutor-context-pills';
import { LoadingState } from '@/components/ui/loading-state';
import { ScoreDisplay, ScoreProgressBar, StreakBadge } from '@/components/task/score-components';
import { SafeAlertDialogDescription, ConfirmationDialog, RequirementCheckpoint } from '@/components/task/dialog-components';
import { EvaluationProgressPanel, EvaluationProgressData } from '@/components/task/evaluation-progress-panel';
import { EvaluationHistoryItem, EvaluationHistoryEntry, PromptHistoryItem, EmptyPromptHistory, EmptyEvaluationHistory, PromptHistoryEntry } from '@/components/task/history-components';

// Utils and data
import { getProject, getParticipationByProjectAndStudent, updateParticipation } from '@/lib/firestore';
import { Project, Subtask, Participation, ChatMessage } from '@/lib/types';
import { showSuccessToast, showErrorToast, showInfoToast, showFeedbackToast } from '@/lib/toast-utils';
import { GITHUB_SUBMISSION_SUBTASK_ID } from '@/lib/constants';
import { saveTaskChatHistory, saveGitHubRepoURL } from '@/lib/task-utils';
import { isProjectExpired } from '@/lib/utils';
import { buildEvaluationChatDraft, buildPromptFeedbackChatDraft, buildQuickActionDraft, TutorContextPill } from '@/lib/tutor-chat-context';

// Navigation
import { TaskNavigation } from '@/components/task/task-navigation';
import { GitHubInfoButton } from '@/components/task/github-info-button';

interface TeachingFeedback {
  strengths?: string[];
  missingRequirements?: string[];
  nextSteps?: string[];
  minimumToPass?: string[];
}

interface TaskEvaluationResult {
  rawContent?: {
    summary?: string;
    assessment?: number;
    checkpoints?: Array<{
      status: string;
      details: string;
      requirement: string;
    }>;
    improvements?: string[];
  };
  comments?: string;
  suggestions?: string[];
  teachingFeedback?: TeachingFeedback;
}

interface TaskEvaluationResponse extends EvaluationProgressData {
  score: number;
  feedback: string;
  success?: boolean;
  message?: string;
  evaluationId?: string;
  status?: string;
  result?: TaskEvaluationResult;
}

/**
 * Page component for individual project tasks.
 * 
 * FEEDBACK FORMAT STANDARDIZATION
 * We've standardized the feedback format across the app:
 * 1. API always returns feedback as: { feedback: string }
 * 2. Frontend components display this single paragraph feedback
 * 3. Storage in Firebase uses this consistent format
 * 4. Any old format with arrays is converted to the new format
 */
export default function ProjectTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const currentProjectId = params.id as string;
  const subtaskId = params.subtaskId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [subtask, setSubtask] = useState<Subtask | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSubtaskCompletedByStudent, setIsSubtaskCompletedByStudent] = useState(false);
  const [copiedCodeBlockKey, setCopiedCodeBlockKey] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [isCurrentSequentially, setIsCurrentSequentially] = useState(false);
  const [githubRepoUrlInput, setGithubRepoUrlInput] = useState('');
  const [isSavingRepo, setIsSavingRepo] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showEvaluationFeedbackDialog, setShowEvaluationFeedbackDialog] = useState(false);
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [promptStreak, setPromptStreak] = useState<{ currentStreak: number; bestStreak: number; isGoodPrompt: boolean } | null>(null);
  const [isStreakAnimating, setIsStreakAnimating] = useState(false);
  const [currentPromptFeedback, setCurrentPromptFeedback] = useState<{
    feedback?: string;
  } | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<TaskEvaluationResponse | null>(null);
  const [evaluationProgress, setEvaluationProgress] = useState<EvaluationProgressData | null>(null);
  const [tutorContextPills, setTutorContextPills] = useState<TutorContextPill[]>([]);
  const [showTutorGuidance, setShowTutorGuidance] = useState(false);
  const [showTutorQuickActions, setShowTutorQuickActions] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPageDisabled, setIsPageDisabled] = useState(false);
  
  // Add state for evaluation history
  const [evaluationHistory, setEvaluationHistory] = useState<Array<{
    timestamp: Timestamp;
    score: number;
    feedback: string;
    success?: boolean;
    message?: string;
    evaluationId?: string;
    status?: string;
    result?: TaskEvaluationResult;
  }> | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[] | null>(null);
  const [showPromptHistoryDialog, setShowPromptHistoryDialog] = useState(false);
  const [showSubmitProjectDialog, setShowSubmitProjectDialog] = useState(false);

  const MAX_USER_INPUT_LENGTH = 3000; // Increased from 500 to 3000 for better Gemini compatibility
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadTask = async () => {
      if (!currentProjectId || !subtaskId || !session?.user) return;
      
      try {
        const projectData = await getProject(currentProjectId);
        if (!projectData) {
          router.push('/student/my-projects');
          return;
        }
        
        setProject(projectData);
        
        // Find the current subtask
        const targetSubtask = projectData.subtasks.find(st => st.id === subtaskId);
        if (!targetSubtask) {
        router.push(`/projects/${currentProjectId}`);
        return;
      }
        
        setSubtask(targetSubtask);
        
        // Get the user's participation in this project
        const participationData = await getParticipationByProjectAndStudent(
          currentProjectId, 
          session.user.id
        );
        
        if (!participationData) {
        router.push('/student/my-projects');
        return;
      }
        
        setParticipation(participationData);
        
        // Set GitHub repo URL if available
        if (participationData.studentGitHubRepo) {
          setGithubRepoUrlInput(participationData.studentGitHubRepo);
        }
        
        // Set completed status
        const isCompleted = participationData.completedSubtasks?.includes(subtaskId) || false;
        setIsSubtaskCompletedByStudent(isCompleted);
        
        // Check if this task is available sequentially
        const sortedSubtasks = [...projectData.subtasks].sort((a, b) => a.order - b.order);
        const currentTaskIndex = sortedSubtasks.findIndex(t => t.id === subtaskId);
        
        // Task is available sequentially if:
        // 1. It's the first task OR
        // 2. All previous tasks are completed
        const isAvailableSequentially = 
          currentTaskIndex === 0 || 
          sortedSubtasks
            .slice(0, currentTaskIndex)
            .every(t => participationData.completedSubtasks?.includes(t.id));
        
        setIsCurrentSequentially(isAvailableSequentially);
        
        // Load chat history for this task
        if (participationData.chatHistory && participationData.chatHistory[subtaskId]) {
          setChatMessages(participationData.chatHistory[subtaskId]);
        } else {
          // Initialize with a system message
          const systemMessage: ChatMessage = {
            id: `system-${Date.now()}`,
        role: 'system',
            content: `Welcome to the task: "${targetSubtask.title}". I'm here to help you complete this task. What questions do you have?`,
            createdAt: new Date().toISOString(),
          };
          setChatMessages([systemMessage]);
        }
    } catch (error) {
        console.error("Error loading task:", error);
        showErrorToast(toast, "Error", { description: "Failed to load task details" });
    } finally {
      setIsLoading(false);
    }
  };
    
    loadTask();
  }, [currentProjectId, subtaskId, session, router, toast]);

  useEffect(() => {
    if (chatContainerRef.current) {
      // Create a reliable way to scroll to bottom after content is rendered
      const timer = setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 50);
      
      // Clean up the timeout to prevent memory leaks
      return () => clearTimeout(timer);
    }
  }, [chatMessages]);

  // Effect to handle streak animation
  useEffect(() => {
    if (promptStreak?.isGoodPrompt && promptStreak.currentStreak > 1) {
      setIsStreakAnimating(true);
      const timer = setTimeout(() => {
        setIsStreakAnimating(false);
      }, 2000); // Animation duration
      
      return () => clearTimeout(timer);
    }
  }, [promptStreak]);

  // Load evaluation history when the component mounts
  useEffect(() => {
    if (participation && subtask) {
      // If there's evaluation history for this subtask, load it
      const history = participation.evaluationHistory?.[subtask.id] || [];
      setEvaluationHistory(history);
    }
  }, [participation, subtask]);

  // Load prompt history when the component mounts
  useEffect(() => {
    if (participation && subtask) {
      // If there's prompt history for this subtask, load it
      
      const history = participation.promptHistory?.[subtask.id] || [];
      setPromptHistory(history);
    }
  }, [participation, subtask]);

  const handleSaveGitHubRepo = async () => {
    if (!participation?.id || !subtask || !project) return;

    if (!githubRepoUrlInput.includes('github.com')) {
      showErrorToast(toast, "Invalid URL", { description: "Please enter a valid GitHub repository URL" });
      return;
    }

    setIsSavingRepo(true);
    
    try {
      const result = await saveGitHubRepoURL(
        participation.id,
        githubRepoUrlInput,
        subtask.id,
        participation.completedSubtasks || [],
        project.subtasks.length
      );
      
      setParticipation({
        ...participation,
        completedSubtasks: result.completedSubtasks,
        progress: result.progress,
        studentGitHubRepo: githubRepoUrlInput
      });
      
      setIsSubtaskCompletedByStudent(true);
      showSuccessToast(toast, "Repository Saved", { description: "GitHub repository URL saved successfully" });
    } catch (error) {
      console.error('Error saving GitHub repo:', error);
      showErrorToast(toast, "Error", { description: "Failed to save GitHub repository URL" });
    } finally {
      setIsSavingRepo(false);
    }
  };

  // Generic function to update history in Firebase
  const updateHistoryInFirebase = async <T extends { timestamp: Timestamp }>(
    participationId: string,
    subtaskId: string,
    historyType: 'evaluationHistory' | 'promptHistory',
    entry: T,
    currentHistory: T[] | null
  ): Promise<{ success: boolean; newHistory?: T[]; historyUpdate?: any; error?: any }> => {
    try {
      
      // Create the new history array
      const newHistory = [...(currentHistory || []), entry];
      
      // Log the update for debugging
      
      // Get the current data from participation
      const currentData = participation?.[historyType] || {};
      
      // Prepare the update data
      const historyUpdate = {
        ...currentData,
        [subtaskId]: newHistory
      };
      
      
      // Update Firebase
      await updateParticipation(participationId, {
        [historyType]: historyUpdate
      });
      
      
      return { 
        success: true, 
        newHistory,
        historyUpdate
      };
    } catch (error) {
      console.error(`HISTORY DEBUG - Error updating ${historyType}:`, error);
      return { success: false, error };
    }
  };

  // Create a helper function for updating evaluation history
  const updateEvaluationHistory = async (participationId: string, subtaskId: string, result: any, currentHistory: any[] | null) => {
    try {
      // Create the evaluation entry
      const evaluationResult = {
        ...result,
        timestamp: Timestamp.now()
      };
      
      // Update in Firebase and get result
      const updateResult = await updateHistoryInFirebase<typeof evaluationResult>(
        participationId,
        subtaskId,
        'evaluationHistory',
        evaluationResult,
        currentHistory as (typeof evaluationResult)[] | null
      );
      
      if (!updateResult.success) {
        throw updateResult.error;
      }
      
      // Update the local state
      if (updateResult.newHistory) {
        setEvaluationHistory(updateResult.newHistory as any);
      }
      
      return { 
        success: true, 
        evaluationHistoryUpdate: updateResult.historyUpdate,
        latestResult: evaluationResult
      };
    } catch (error) {
      console.error("Error preparing evaluation history:", error);
      return { success: false, error };
    }
  };

  // Function to handle viewing prompt history
  const handleViewPromptHistory = () => {
    
    // Add detailed debugging for feedback
    if (promptHistory && promptHistory.length > 0) {
    }
    
    // Always show the dialog, even if history is empty
    setShowPromptHistoryDialog(true);
  };

  // Helper function to save prompt history
  const savePromptHistory = async (
    participationId: string,
    subtaskId: string,
    promptContent: string,
    qualityData: {
      qualityScore: number;
      goalScore?: number;
      contextScore?: number;
      expectationsScore?: number;
      sourceScore?: number;
      isGoodPrompt?: boolean;
    },
    feedback?: {
      feedback?: string;
    } | null
  ) => {
    
    try {
      // Check if we have valid feedback
      const hasValidFeedback = feedback && typeof feedback.feedback === 'string' && feedback.feedback.trim() !== '';
      
      // Skip saving only if we have neither scores nor feedback
      const hasAnyScore = typeof qualityData.qualityScore === 'number';
      const hasAnyDimensionScore = 
        typeof qualityData.goalScore === 'number' || 
        typeof qualityData.contextScore === 'number' || 
        typeof qualityData.expectationsScore === 'number' || 
        typeof qualityData.sourceScore === 'number';
      
      if (!hasAnyScore && !hasAnyDimensionScore && !hasValidFeedback) {
        return { success: false, error: "No scores or feedback available" };
      }
      
      // Create a timestamp for this prompt entry
      const timestamp = Timestamp.now();
      
      // Create the new prompt entry object
      const promptEntry = {
        timestamp,
        content: promptContent,
        qualityScore: qualityData.qualityScore,
        goalScore: qualityData.goalScore,
        contextScore: qualityData.contextScore,
        expectationsScore: qualityData.expectationsScore,
        sourceScore: qualityData.sourceScore,
        isGoodPrompt: qualityData.isGoodPrompt,
        feedback: feedback // Use the standardized feedback format
      };
      
      // Log for debugging
      
      // Use the common function to update history in Firebase
      const result = await updateHistoryInFirebase(
        participationId,
        subtaskId,
        'promptHistory',
        promptEntry,
        promptHistory
      );
      
      if (result.success && result.newHistory) {
        setPromptHistory(result.newHistory);
        return { success: true, entry: promptEntry };
      } else {
        console.error("PROMPT HISTORY ERROR - Failed to save prompt history:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("PROMPT HISTORY ERROR - Exception in savePromptHistory:", error);
      return { success: false, error };
    }
  };

  const updateEvaluationProgressState = (payload: Partial<EvaluationProgressData> | null | undefined) => {
    if (!payload) return null;

    const nextProgress: EvaluationProgressData = {
      status: payload.status,
      statusMessage: payload.statusMessage,
      progressPercent: typeof payload.progressPercent === 'number' ? payload.progressPercent : undefined,
      stageKey: payload.stageKey,
      stageTitle: payload.stageTitle,
      stageDetail: payload.stageDetail,
      progressStats: payload.progressStats,
    };

    setEvaluationProgress(nextProgress);
    return nextProgress;
  };

  const focusTutorComposer = () => {
    window.setTimeout(() => {
      chatInputRef.current?.focus();
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 120);
  };

  const queueTutorDraft = (draft: string, contextPills: TutorContextPill[]) => {
    setTutorContextPills(contextPills);
    setShowTutorGuidance(false);
    setShowTutorQuickActions(false);
    setUserInput((currentValue) => currentValue.trim().length > 0 ? `${currentValue}

${draft}` : draft);
    setShowEvaluationFeedbackDialog(false);
    setShowHistoryDialog(false);
    showInfoToast(toast, 'Tutor draft ready', {
      description: 'We added this guidance to your Tutor chat. You can edit it before sending.',
    });
    focusTutorComposer();
  };

  const handleTutorQuickAction = (action: Parameters<typeof buildQuickActionDraft>[1]) => {
    if (!subtask) return;
    const { draft, contextPills } = buildQuickActionDraft(subtask.title, action);
    queueTutorDraft(draft, contextPills);
  };

  const handleTutorSuggestion = ({
    suggestion,
    requirement,
    details,
  }: {
    suggestion?: string;
    requirement?: string;
    details?: string;
  }) => {
    if (!subtask) return;

    const { draft, contextPills } = buildEvaluationChatDraft({
      currentTask: subtask.title,
      suggestion,
      requirement,
      details,
      summary: evaluationFeedback?.result?.rawContent?.summary,
    });

    queueTutorDraft(draft, contextPills);
  };

  const removeTutorContextPill = (id: string) => {
    setTutorContextPills((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const clearTutorContextPills = () => {
    setTutorContextPills([]);
  };

  const handleAskTutorAboutEvaluation = () => {
    handleTutorSuggestion({
      details: evaluationFeedback?.feedback,
    });
  };

  const handleTutorSuggestionFromHistory = ({
    evaluation,
    suggestion,
    requirement,
    details,
  }: {
    evaluation: EvaluationHistoryEntry;
    suggestion?: string;
    requirement?: string;
    details?: string;
  }) => {
    if (!subtask) return;

    const { draft, contextPills } = buildEvaluationChatDraft({
      currentTask: subtask.title,
      suggestion,
      requirement,
      details,
      summary: evaluation.result?.rawContent?.summary || evaluation.feedback,
    });

    queueTutorDraft(draft, contextPills);
  };

  const handleExplainHistoryAttempt = (evaluation: EvaluationHistoryEntry) => {
    const fallbackSuggestion = evaluation.result?.rawContent?.improvements?.[0];

    handleTutorSuggestionFromHistory({
      evaluation,
      suggestion: fallbackSuggestion,
      details: evaluation.result?.rawContent?.summary || evaluation.feedback,
    });
  };


  const handleImprovePromptFromHistory = (prompt: PromptHistoryEntry) => {
    if (!subtask) return;

    const { draft, contextPills } = buildPromptFeedbackChatDraft({
      currentTask: subtask.title,
      promptContent: prompt.content,
      feedback: prompt.feedback?.feedback,
      qualityScore: prompt.qualityScore,
    });

    queueTutorDraft(draft, contextPills);
  };

  const handleDismissTutorGuidance = () => {
    setShowTutorGuidance(false);
  };

  const handleStartFreshTutorChat = () => {
    setShowTutorGuidance(false);
    setShowTutorQuickActions(false);
    setTutorContextPills([]);
    focusTutorComposer();
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isChatLoading) return;
    
    const currentInput = userInput.trim();
    const currentTutorContext = [...tutorContextPills];
    setUserInput('');
    setTutorContextPills([]);
    setShowTutorQuickActions(false);
    
    if (!session?.user?.id || !participation?.id || !subtask) {
      showErrorToast(toast, "Error", { description: "User or task information is missing." });
      return;
    }
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: currentInput,
      role: 'user',
      createdAt: new Date().toISOString(),
      userId: session.user.id,
      userName: session.user.name || 'User',
    };
    
    if (selectedFile && selectedFilePreview) {
      userMessage.imageData = selectedFilePreview;
      setSelectedFile(null);
      setSelectedFilePreview(null);
    }
    
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    // Prepare an AI message object to be updated with streamed content
    const aiMessageId = `ai-${Date.now()}`;
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      content: '', // Start with empty content
      role: 'model',
      createdAt: new Date().toISOString(),
      userId: 'ai',
      userName: 'AI Assistant',
    };
    setChatMessages(prevMessages => [...prevMessages, initialAiMessage]);

    try {
      const endpoint = `/api/chat`;
      
      // Log the API request details
      
      // Convert chat messages to the format expected by the API
      const formattedChatHistory = chatMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [
          ...(msg.content ? [{ text: msg.content }] : []),
          ...(msg.imageData ? [{ 
            inlineData: { 
              data: msg.imageData.split(',')[1], 
              mimeType: msg.imageData.split(';')[0].split(':')[1] 
            } 
          }] : [])
        ]
      }));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          projectId: currentProjectId,
          subtaskId: subtask.id,
          message: currentInput,
          chatHistory: formattedChatHistory,
          tutorContext: currentTutorContext.map((item) => item.instruction || `${item.label}: ${item.value}`),
          evaluatePromptQuality: true,
          requestPersonalizedFeedback: true,
          ...(userMessage.imageData && {
            imageData: userMessage.imageData.split(',')[1],
            imageMimeType: userMessage.imageData.split(';')[0].split(':')[1],
          }),
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to get a valid response from the server.' }));
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
      }

      // Handle prompt quality headers before starting to stream content
      const headers = response.headers;
      let promptQualityData = {
        qualityScore: 0, // Default to 0 (invalid) instead of 50
        goalScore: 0,
        contextScore: 0,
        expectationsScore: 0,
        sourceScore: 0,
        isGoodPrompt: false
      };
      
      // Debug log all headers related to prompt quality

      if (headers.get('x-prompt-quality-score')) {
        const qualityScore = parseInt(headers.get('x-prompt-quality-score') || '0');
        const isGoodPrompt = qualityScore >= 60;
        const goalScore = parseInt(headers.get('x-prompt-goal-score') || '0');
        const contextScore = parseInt(headers.get('x-prompt-context-score') || '0');
        const expectationsScore = parseInt(headers.get('x-prompt-expectations-score') || '0');
        const sourceScore = parseInt(headers.get('x-prompt-source-score') || '0');
        
        // Update promptQualityData with the actual scores from the API
        promptQualityData = {
          qualityScore,
          goalScore,
          contextScore,
          expectationsScore,
          sourceScore,
          isGoodPrompt
        };
        
        // Get personalized feedback from API response headers
        const personalisedFeedbackHeader = headers.get('x-prompt-feedback');
        if (personalisedFeedbackHeader) {
          try {
            const parsedFeedback = JSON.parse(decodeURIComponent(personalisedFeedbackHeader));
            
            // Set standardized feedback format
            if (typeof parsedFeedback.feedback === 'string') {
              const feedbackData = {
                feedback: parsedFeedback.feedback
              };
              setCurrentPromptFeedback(feedbackData);
              
              // Always save to history if we have participation and subtask IDs
              if (participation?.id && subtask?.id) {
                await savePromptHistory(
                  participation.id,
                  subtask.id,
                  currentInput,
                  promptQualityData,
                  feedbackData
                );
              }
              
              // Show toast about feedback
              showFeedbackToast(toast, 'info', "Feedback Available", "Detailed prompt feedback has been saved. Click 'View Prompt Feedback' to see tips and suggestions.", 5000);
            } else {
              setCurrentPromptFeedback(null);
            }
          } catch (e) {
            console.error("Error parsing personalised feedback:", e);
            setCurrentPromptFeedback(null);
          }
        } else {
          setCurrentPromptFeedback(null);
        }
        
        // Always update streak and show score toasts
        if (qualityScore > 0 && goalScore > 0 && contextScore > 0 && expectationsScore > 0 && sourceScore > 0) {
          const newStreakInfo = isGoodPrompt
            ? { currentStreak: (promptStreak?.currentStreak || 0) + 1, bestStreak: Math.max((promptStreak?.bestStreak || 0), (promptStreak?.currentStreak || 0) + 1), isGoodPrompt }
            : { currentStreak: 0, bestStreak: promptStreak?.bestStreak || 0, isGoodPrompt };
          setPromptStreak(newStreakInfo);
          
          if (isGoodPrompt) {
            showFeedbackToast(toast, 'streak', "Prompt Analysis", `Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100`, 2000);
            setIsStreakAnimating(true);
            setTimeout(() => setIsStreakAnimating(false), 2000);
          } else {
            showFeedbackToast(toast, 'info', "Prompt Feedback", `Your prompt needs improvement. Scores - Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100`, 5000);
          }
        } else {
        }
      } else if (headers.get('x-prompt-streak')) {
        try {
          const streakInfoString = headers.get('x-prompt-streak');
          if (streakInfoString) {
            const parsedStreakInfo = JSON.parse(decodeURIComponent(streakInfoString));
            setPromptStreak(parsedStreakInfo);
            const promptEval = headers.get('x-prompt-evaluation');
            let goalScore = 0, contextScore = 0, expectationsScore = 0, sourceScore = 0;
            let hasValidScores = false;
            let hasValidFeedback = false;

            if (promptEval) {
              try {
                const evalData = JSON.parse(decodeURIComponent(promptEval));
                
                // Always assign scores if they're provided by the API, even if low
                if (typeof evalData.goalScore === 'number') goalScore = evalData.goalScore;
                if (typeof evalData.contextScore === 'number') contextScore = evalData.contextScore;
                if (typeof evalData.expectationsScore === 'number') expectationsScore = evalData.expectationsScore;
                if (typeof evalData.sourceScore === 'number') sourceScore = evalData.sourceScore;
                
                // Check if all dimension scores are available
                hasValidScores = 
                  typeof evalData.goalScore === 'number' && 
                  typeof evalData.contextScore === 'number' && 
                  typeof evalData.expectationsScore === 'number' && 
                  typeof evalData.sourceScore === 'number';
                
                
                // Always create promptQualityData with all available scores
                promptQualityData = {
                  qualityScore: hasValidScores ? 
                    (goalScore + contextScore + expectationsScore + sourceScore) / 4 : 
                    evalData.overallScore || 0,
                  goalScore,
                  contextScore,
                  expectationsScore,
                  sourceScore,
                  isGoodPrompt: parsedStreakInfo.isGoodPrompt
                };
                
                
                // Check if it's already in the standardized format
                let feedbackData = null;
                
                if (evalData.feedback && typeof evalData.feedback === 'object') {
                  
                  // Check if it's already in the standardized format
                  if (typeof evalData.feedback.feedback === 'string') {
                    feedbackData = {
                      feedback: evalData.feedback.feedback
                    };
                  }
                  // Handle old format if needed (in case we get old format from API)
                  else if ((evalData.feedback.strengths && Array.isArray(evalData.feedback.strengths)) || 
                          (evalData.feedback.tips && Array.isArray(evalData.feedback.tips))) {
                    // Convert old format to new format
                    const strengths = evalData.feedback.strengths && Array.isArray(evalData.feedback.strengths) 
                      ? evalData.feedback.strengths.join(' ') 
                      : '';
                    const tips = evalData.feedback.tips && Array.isArray(evalData.feedback.tips) 
                      ? evalData.feedback.tips.join(' ') 
                      : '';
                    
                    feedbackData = {
                      feedback: `${strengths} ${tips}`.trim()
                    };
                  }
                } else {
                  console.warn("PROMPT FEEDBACK WARNING: No feedback found in evaluation data");
                }
                
                // Set feedback if we have content
                if (feedbackData && feedbackData.feedback && feedbackData.feedback.trim() !== '') {
                  setCurrentPromptFeedback(feedbackData);
                  hasValidFeedback = true;
                  
                  
                  // Show toast about feedback
                  showFeedbackToast(toast, 'info', "Feedback Available", "Prompt feedback has been saved. Click 'View Prompt Feedback' to see details.", 5000);
                } else {
                  // Don't set feedback if not available
                  setCurrentPromptFeedback(null);
                  
                  // Update hasValidFeedback based on currentPromptFeedback
                  hasValidFeedback = 
                    !!currentPromptFeedback && 
                    typeof currentPromptFeedback.feedback === 'string' && 
                    currentPromptFeedback.feedback.trim() !== '';
                  
                }
              } catch (e) {
                console.error('Error parsing prompt evaluation:', e);
              }
            }
            
            // Only save the prompt to history if we have valid scores or feedback
            if (participation?.id && subtask?.id) {
              // Check if we have any scores or feedback worth saving
              if (hasValidScores || hasValidFeedback || 
                  (typeof promptQualityData.goalScore === 'number' && promptQualityData.goalScore > 0) || 
                  (typeof promptQualityData.contextScore === 'number' && promptQualityData.contextScore > 0) ||
                  (typeof promptQualityData.expectationsScore === 'number' && promptQualityData.expectationsScore > 0) ||
                  (typeof promptQualityData.sourceScore === 'number' && promptQualityData.sourceScore > 0)) {
                
                try {
                  await savePromptHistory(
                    participation.id,
                    subtask.id,
                    currentInput,
                    promptQualityData,
                    currentPromptFeedback
                  );
                } catch (savingError) {
                  console.error("PROMPT HISTORY DEBUG - Failed to save prompt history:", savingError);
                }
              } else {
              }
            }
            
            // Only display quality score toasts if we have valid scores
            if (parsedStreakInfo.isGoodPrompt && hasValidScores) {
              showFeedbackToast(toast, 'streak', "Prompt Analysis", `Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100`, 2000);
              setIsStreakAnimating(true);
              setTimeout(() => setIsStreakAnimating(false), 2000);
            } else if (hasValidScores) {
              showFeedbackToast(toast, 'info', "Prompt Feedback", `Your prompt needs improvement. Scores - Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100`, 5000);
            } else {
              // Don't show score-related toast if scores are invalid
            }
          }
        } catch (e) { 
          console.error('Error parsing streak info from header:', e); 
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            streamedContent += chunk;
            setChatMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === aiMessageId ? { ...msg, content: streamedContent } : msg
              )
            );
          }
          // After stream is finished, save the complete chat history
          setChatMessages(prevMessages => prevMessages.map(msg => msg.id === aiMessageId ? { ...msg, content: streamedContent } : msg));
          if (participation?.id && subtask?.id) {
            await saveTaskChatHistory(
              participation.id,
              subtask.id,
              participation.chatHistory,
              [...newMessages, { ...initialAiMessage, content: streamedContent }]
            );
          }
        } catch (streamError) {
          console.error('Error reading stream:', streamError);
          setChatMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === aiMessageId ? { ...msg, content: "Error receiving AI response." } : msg
            )
          );
          showErrorToast(toast, "Chat Error", { description: "Error processing AI response stream." });
        } finally {
          setIsChatLoading(false);
        }
      };

      await readStream();

    } catch (error: any) {
      console.error('Error sending message:', error);
      showErrorToast(toast, "Chat Error", { description: error.message || "Failed to send message. Please try again." });
      setTutorContextPills(currentTutorContext);
      setUserInput(currentInput);
      // Remove the placeholder AI message if an error occurred before streaming
      setChatMessages(prevMessages => prevMessages.filter(msg => msg.id !== aiMessageId));
      setIsChatLoading(false);
    }
  };

  // Function to check if this is the last task in the project
  const isLastTask = (project: Project | null, subtask: Subtask | null): boolean => {
    if (!project || !subtask) return false;
    
    const sortedSubtasks = [...project.subtasks].sort((a, b) => a.order - b.order);
    return sortedSubtasks[sortedSubtasks.length - 1].id === subtask.id;
  };

  // Function to check if all tasks are completed
  const areAllTasksCompleted = (project: Project | null, participation: Participation | null): boolean => {
    if (!project || !participation) return false;
    
    const completedSubtasks = participation.completedSubtasks || [];
    return project.subtasks.every(task => completedSubtasks.includes(task.id));
  };

  const pollEvaluationUntilComplete = async (evaluationId: string) => {
    const maxAttempts = 40;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/evaluate-proxy?evaluationId=${evaluationId}&timeoutMs=15000&pollIntervalMs=3000`, {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();
      updateEvaluationProgressState(result);

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to fetch evaluation status');
      }

      if (response.status !== 202 && typeof result.score === 'number') {
        return result as TaskEvaluationResponse;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error('Evaluation is still processing. Please try again in a moment.');
  };

  const handleCompleteTask = async () => {
    if (!participation || !project || !subtask) return;
    
    try {
      const completedSubtasks = participation.completedSubtasks || [];
      
      // For GitHub submission subtask, enforce GitHub repo submission
      if (subtask.id === GITHUB_SUBMISSION_SUBTASK_ID && !participation.studentGitHubRepo) {
        setShowCompleteDialog(false);
        showInfoToast(toast, "GitHub repository required", {
          description: "Please add your GitHub repository URL before marking this step complete.",
        });
        return;
      }
      
      // Only add if not already completed
      if (!completedSubtasks.includes(subtask.id)) {
        // Disable the entire page during evaluation
        setIsEvaluating(true);
        setIsPageDisabled(true);
        setEvaluationProgress({
          status: 'pending',
          statusMessage: 'Preparing your evaluation…',
          progressPercent: 8,
          stageKey: 'queued',
          stageTitle: 'Evaluation queued',
          stageDetail: 'We are starting the evaluation workflow for this task.',
        });
        
        // Make API call to evaluate the task completion
        try {

          // Use a Next.js API route as a proxy to avoid CORS issues
          const response = await fetch('/api/evaluate-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectDetail: project.title,
              tasks: project.subtasks.map(st => st.title),
              currentTask: subtask.title,
              githubRepoUrl: participation.studentGitHubRepo || "",
              evidence: subtask.description || "Task completion criteria",
              youtubeLink: null,
              waitForResult: true
            })
          });
            
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error: ${response.status}`, errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
          }
            
          let result = await response.json() as TaskEvaluationResponse;
          updateEvaluationProgressState(result);

          if (response.status === 202 && result.evaluationId) {
            showFeedbackToast(toast, 'info', 'Evaluation in Progress', "We're still reviewing your work. Please wait a few more seconds…", 3000);
            result = await pollEvaluationUntilComplete(result.evaluationId);
          }

          setEvaluationFeedback(result);
          updateEvaluationProgressState({
            status: result.status,
            statusMessage: result.statusMessage,
            progressPercent: 100,
            stageKey: 'completed',
            stageTitle: 'Evaluation complete',
            stageDetail: result.feedback || result.statusMessage || 'The evaluation report is ready.',
          });

          // Ensure the score is a valid number
          const score = typeof result.score === 'number' ? result.score : 0;

          // Save evaluation history only after we have a completed result
          const historyUpdate = await updateEvaluationHistory(
            participation.id, 
            subtask.id, 
            result, 
            evaluationHistory
          );
          
          if (!historyUpdate.success) {
            throw new Error("Failed to prepare evaluation history update");
          }
          
          // Check if the score meets the threshold (80%)
          if (!result.score || typeof result.score !== 'number' || score < 80) {
            // Even if the score is low, save the evaluation history to Firebase
            await updateParticipation(participation.id, {
              evaluationHistory: historyUpdate.evaluationHistoryUpdate
            });
            
            showErrorToast(toast, "Task Incomplete", { 
              description: `Your work does not meet the required criteria (${score}%).`
            });
            setShowCompleteDialog(false);
            setShowEvaluationFeedbackDialog(true);
            setIsEvaluating(false);
            setIsPageDisabled(false);
            return;
          }

          // If evaluation passed, continue with marking the task complete
          const newCompletedSubtasks = [...completedSubtasks, subtask.id];
          const totalSubtasks = project.subtasks.length;
          const newProgress = Math.round((newCompletedSubtasks.length / totalSubtasks) * 100);
          
          // Single Firebase update with all changes
          await updateParticipation(participation.id, {
            completedSubtasks: newCompletedSubtasks,
            progress: newProgress,
            evaluationHistory: historyUpdate.evaluationHistoryUpdate
          });
          
          // Update local state
          setParticipation({
            ...participation,
            completedSubtasks: newCompletedSubtasks,
            progress: newProgress,
            evaluationHistory: historyUpdate.evaluationHistoryUpdate
          });
          
          setIsSubtaskCompletedByStudent(true);
          showSuccessToast(toast, "Task Completed", { description: `You've completed this task with a score of ${score}%!` });

          // New code: Check if this is the last task and show submit dialog
          if (isLastTask(project, subtask) && newCompletedSubtasks.length === project.subtasks.length) {
            setTimeout(() => {
              setShowSubmitProjectDialog(true);
            }, 1000);
          }

        } catch (apiError) {
          console.error("Error evaluating task:", apiError);
          showErrorToast(toast, "Evaluation Error", { 
            description: "We couldn't evaluate your work. Please try again later."
          });
          setEvaluationProgress({
            status: 'failed',
            statusMessage: 'Evaluation failed',
            progressPercent: 100,
            stageKey: 'failed',
            stageTitle: 'Evaluation failed',
            stageDetail: 'We hit an error while reviewing your work. Please try again.',
          });
          setIsEvaluating(false);
          setIsPageDisabled(false);
          return;
        }
      }
      
      setShowCompleteDialog(false);
      setIsEvaluating(false);
      setIsPageDisabled(false);
    } catch (error) {
      console.error('Error completing task:', error);
      showErrorToast(toast, "Error", { description: "Failed to complete task. Please try again." });
      setIsEvaluating(false);
      setIsPageDisabled(false);
    }
  };

  const handleCompleteSubtaskIntent = () => {
    if (!isCurrentSequentially) {
      toast({ title: 'Task Locked', description: 'Please complete previous tasks in sequence before marking this one as complete.', variant: 'destructive' });
      return;
    }
    
    if (!isSubtaskCompletedByStudent) {
      // Reset evaluation state when opening dialog
      setEvaluationFeedback(null);
      setEvaluationProgress(null);
      setShowCompleteDialog(true);
    }
  };

  // Function to handle viewing evaluation history
  const handleViewEvaluationHistory = () => {
    if (evaluationHistory && evaluationHistory.length > 0) {
      setShowHistoryDialog(true);
    } else {
      showFeedbackToast(toast, 'info', "No History", "No evaluation attempts found for this task.", 5000);
    }
  };

  const latestEvaluationAttempt = evaluationHistory && evaluationHistory.length > 0
    ? [...evaluationHistory].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0]
    : null;

  const latestPromptAttempt = promptHistory && promptHistory.length > 0
    ? [...promptHistory].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0]
    : null;

  // Custom component for CardDescription with lock status to avoid hydration errors
  const CardDescriptionWithLock = ({ 
    project, 
    isLocked 
  }: { 
    project: Project | null;
    isLocked: boolean;
  }) => {
    return (
      <>
        <CardDescription>
          Part of: {project?.title}
        </CardDescription>
        {isLocked && (
          <div className="flex items-center mt-1">
            <div className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              <span>Complete previous tasks first</span>
            </div>
          </div>
        )}
      </>
    );
  };

  // Handle admin direct task completion
  const handleAdminCompleteTask = async () => {
    if (!participation || !project || !subtask) return;
    
    try {
      // Create mock evaluation result with 100% score
      const mockEvaluationResult = {
        score: 100,
        feedback: "Task completed successfully by admin test account.",
        success: true,
        status: "completed",
        result: {
          rawContent: {
            summary: "Task automatically approved for testing purposes.",
            assessment: 100,
            checkpoints: [
              {
                status: "passed",
                details: "Automatically approved for testing.",
                requirement: "Admin test approval"
              }
            ]
          }
        },
        timestamp: Timestamp.now()
      };
        
      // Save evaluation history
      const historyUpdate = await updateEvaluationHistory(
        participation.id, 
        subtask.id, 
        mockEvaluationResult, 
        evaluationHistory
      );
        
      if (!historyUpdate.success) {
        throw new Error("Failed to prepare evaluation history update");
      }
        
      // Update completed subtasks
      const completedSubtasks = participation.completedSubtasks || [];
      const newCompletedSubtasks = [...completedSubtasks, subtask.id];
      const totalSubtasks = project.subtasks.length;
      const newProgress = Math.round((newCompletedSubtasks.length / totalSubtasks) * 100);
        
      // Update Firebase
      await updateParticipation(participation.id, {
        completedSubtasks: newCompletedSubtasks,
        progress: newProgress,
        evaluationHistory: historyUpdate.evaluationHistoryUpdate
      });
        
      // Update local state
      setParticipation({
        ...participation,
        completedSubtasks: newCompletedSubtasks,
        progress: newProgress,
        evaluationHistory: historyUpdate.evaluationHistoryUpdate
      });
        
      setIsSubtaskCompletedByStudent(true);
    
      // Show success toast
      showSuccessToast(toast, "Admin Test Complete", { 
        description: "Task automatically marked as complete with 100% score." 
      });
        
    } catch (error) {
      console.error('Error in admin complete:', error);
      showErrorToast(toast, "Error", { description: "Failed to complete task using admin function." });
    }
  };

  // Compact prompt history button for the Tutor workspace
  const FloatingPromptHistoryButton = () => {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewPromptHistory}
        className="h-9 shrink-0 rounded-full border-indigo-200/80 bg-white text-indigo-600 hover:bg-indigo-50"
        title="Review your prompts and get quality feedback to improve your prompt writing skills"
      >
        <Info className="w-4 h-4" />
        <span>Prompt history</span>
        {promptHistory && promptHistory.length > 0 && (
          <span className="bg-indigo-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {promptHistory.length}
          </span>
        )}
      </Button>
    );
  };

  // Handle clearing chat history
  const handleClearChat = async () => {
    if (!participation?.id || !subtask) return;
    
    try {
      const updatedChatHistory = { ...(participation.chatHistory || {}) };
      delete updatedChatHistory[subtask.id];
      
      await updateParticipation(participation.id, {
        chatHistory: updatedChatHistory
      });
      
      setChatMessages([]);
      setParticipation({
        ...participation,
        chatHistory: updatedChatHistory
      });
      
      showFeedbackToast(toast, 'success', "Chat Cleared", "Chat history cleared successfully", 5000);
      setShowClearChatDialog(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
      showErrorToast(toast, "Error", { description: "Failed to clear chat history" });
    }
  };

  const handleCopyCode = async (codeToCopy: string, key: string) => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCodeBlockKey(key);
      toast({ title: "Copied!", description: "Code block copied to clipboard.", variant: "default" });
      setTimeout(() => setCopiedCodeBlockKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
      toast({ title: "Copy Failed", description: "Could not copy code to clipboard.", variant: "destructive" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image smaller than 2MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setSelectedFilePreview(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearChatIntent = () => {
    setShowClearChatDialog(true);
  };

  const projectSubtasks = project?.subtasks ?? [];
  const totalRealSubtasks = projectSubtasks.filter((taskItem) => taskItem.id !== GITHUB_SUBMISSION_SUBTASK_ID).length;
  const completedRealSubtasks = (participation?.completedSubtasks || []).filter((completedId) => completedId !== GITHUB_SUBMISSION_SUBTASK_ID).length;
  const taskProgress = totalRealSubtasks > 0 ? Math.round((completedRealSubtasks / totalRealSubtasks) * 100) : 0;
  const orderedVisibleSubtasks = projectSubtasks.filter((taskItem) => taskItem.id !== GITHUB_SUBMISSION_SUBTASK_ID);
  const currentTaskNumber = subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID
    ? 'Setup'
    : `${Math.max(1, orderedVisibleSubtasks.findIndex((taskItem) => taskItem.id === subtask?.id) + 1)}/${Math.max(orderedVisibleSubtasks.length, 1)}`;
  const latestEvaluationScore = evaluationFeedback?.score ?? latestEvaluationAttempt?.score ?? null;
  const taskStateSummary = isSubtaskCompletedByStudent
    ? 'Completed and locked in'
    : (project ? isProjectExpired(project.deadline) : false)
      ? 'Read-only because the project deadline passed'
      : !isCurrentSequentially
        ? 'Locked until previous tasks are complete'
        : 'Open for focused work right now';

  if (isLoading && !project) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100dvh-var(--header-height,4rem))] items-center justify-center">
          <LoadingState text="Loading task data..." />
        </div>
      </MainLayout>
    );
  }
  
  if (!project || !subtask) {
    return (
      <MainLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Task Information Not Available</h1>
          <p className="text-gray-600 mb-4">Could not load the project or task details. Please try again or go back.</p>
          <Link href={participation ? `/student/my-projects/${participation.projectId}` : '/student/projects' } passHref> 
            <Button variant="outline">Go Back</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Add a full-page overlay when the page is disabled */}
      {isPageDisabled && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <LoadingState 
              size="lg" 
              text="Evaluating your work... Please wait while we analyze your GitHub repository." 
              fullHeight={false} 
            />
          </div>
        </div>
      )}
      
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-6 md:px-6 xl:grid xl:h-[calc(100dvh-4rem)] xl:max-h-[calc(100dvh-4rem)] xl:grid-rows-[auto_minmax(0,1fr)] xl:overflow-hidden xl:pb-0">
        <Card className="overflow-hidden border-white/80 bg-white/88 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] xl:flex-shrink-0">
          <CardContent className="p-3 sm:p-3.5">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
                    {subtask.id === GITHUB_SUBMISSION_SUBTASK_ID ? 'Repository onboarding' : `Task ${currentTaskNumber}`}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
                    {taskStateSummary}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
                    Progress {taskProgress}%
                  </span>
                  {latestEvaluationScore !== null ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
                      Eval {latestEvaluationScore}%
                    </span>
                  ) : null}
                  {project && isProjectExpired(project.deadline) && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 shadow-sm">
                      Project expired
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.45rem]">
                    {subtask.title}
                  </h1>
                  <p className="truncate text-sm text-slate-600">
                    {project.title}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:max-w-[60%] xl:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/student/my-projects')}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <GitHubInfoButton />
                <Link href={`/projects/${currentProjectId}`} passHref>
                  <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Project Details
                  </Button>
                </Link>
                {participation?.studentGitHubRepo && subtask?.id !== GITHUB_SUBMISSION_SUBTASK_ID && (
                  <Link href={participation.studentGitHubRepo} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Github className="mr-2 h-4 w-4" />
                      Repository
                    </Button>
                  </Link>
                )}
                <TaskNavigation 
                  project={project}
                  participation={participation}
                  currentSubtaskId={subtaskId}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 items-start gap-4 xl:min-h-0 xl:grid-cols-[minmax(280px,0.62fr)_minmax(820px,1.38fr)] 2xl:grid-cols-[minmax(300px,0.6fr)_minmax(960px,1.4fr)]">
          <div className="flex flex-col self-start xl:h-full xl:min-h-0">
            <Card className="overflow-hidden xl:flex xl:h-full xl:min-h-0 xl:flex-col">
              <CardHeader className="flex-shrink-0 space-y-2 border-b border-slate-100 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <BookOpen className="mr-2 h-5 w-5 text-indigo-600" />
                    Subtask detail
                  </CardTitle>
                  {project && (
                    <div className="flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                      <span className="font-medium">
                        {subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID ? 
                          'Repository Setup' :
                          `Task ${subtask?.order || '?'} of ${project.subtasks.filter(st => st.id !== GITHUB_SUBMISSION_SUBTASK_ID).length}`
                        }
                      </span>
                    </div>
                  )}
                </div>
                <CardDescription className="hidden text-sm text-slate-500 2xl:block">
                  Read requirements, resources, and completion criteria without losing sight of the Tutor conversation.
                </CardDescription>
                <CardDescriptionWithLock 
                  project={project} 
                  isLocked={!isCurrentSequentially && !isSubtaskCompletedByStudent} 
                />
              </CardHeader>
              <CardContent className="py-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
                <div className="space-y-4">
                  {subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID ? (
                  <div className="space-y-4 py-4">
                    <div className="mb-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-3">
                      <h3 className="mb-1 text-sm font-medium text-indigo-800">About This Task</h3>
                      <p className="text-sm leading-normal text-slate-700">{subtask.description}</p>
                    </div>
                    <div>
                      <label htmlFor="githubRepoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                        GitHub Repository URL:
                      </label>
                      <Input 
                        id="githubRepoUrl"
                        type="url" 
                        placeholder="https://github.com/your-username/your-repo-name"
                        value={githubRepoUrlInput}
                        onChange={(e) => setGithubRepoUrlInput(e.target.value)}
                        disabled={isSubtaskCompletedByStudent || isSavingRepo}
                        className="focus-visible:ring-1 focus-visible:ring-indigo-400"
                      />
                    </div>
                    {subtask.resources && subtask.resources.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Need help?</h4>
                        <ul className="list-disc list-inside space-y-0.5 text-sm text-indigo-600">
                          {subtask.resources.map((res, i) => {
                            const parts = res.split(': ');
                            return (
                              <li key={i}>
                                {parts[1] ? (
                                  <a href={parts[1]} target="_blank" rel="noopener noreferrer" className="hover:underline">{parts[0]}</a>
                                ) : res}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <Button 
                      onClick={handleSaveGitHubRepo}
                      disabled={isSubtaskCompletedByStudent || isSavingRepo || !githubRepoUrlInput.trim()}
                      className="w-full mt-3"
                    >
                      {isSavingRepo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                      {isSubtaskCompletedByStudent ? 'Repository Saved' : 'Save and Continue'}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-3">
                      <h3 className="mb-1 text-sm font-medium text-indigo-800">Task Description</h3>
                      <p className="text-sm leading-normal text-slate-700">{subtask?.description}</p>
                    </div>
                      
                    {subtask?.estimatedHours && (
                      <div className="flex items-center border-b pb-3">
                        <Clock className="w-4 h-4 text-gray-500 mr-2" />
                        <h4 className="text-sm font-medium text-gray-700">Estimated Time: <span className="font-normal">{subtask?.estimatedHours} hours</span></h4>
                      </div>
                    )}
                      
                    {subtask?.resources && subtask?.resources.length > 0 && (
                      <div className="border-b pb-3">
                        <h4 className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          <BookOpen className="w-4 h-4 text-gray-500 mr-2" />
                          Suggested Resources:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-6">
                          {subtask?.resources.map((res, i) => <li key={i}>{res}</li>)}
                        </ul>
                      </div>
                    )}
                      
                    {subtask?.completionCriteria && subtask?.completionCriteria.length > 0 && (
                      <div>
                        <h4 className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          Completion Criteria:
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                          <p className="text-sm text-gray-600 mb-2">To complete this task, you must:</p>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-6">
                            {subtask?.completionCriteria.map((crit, i) => <li key={i}>{crit}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </CardContent>
              {subtask?.id !== GITHUB_SUBMISSION_SUBTASK_ID && (
                <div className="border-t p-4 pt-3 xl:flex-shrink-0">
                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={handleCompleteSubtaskIntent}
                      disabled={isSubtaskCompletedByStudent || isLoading || !isCurrentSequentially || isProjectExpired(project?.deadline)}
                      className={`w-full ${isSubtaskCompletedByStudent ? '' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      variant={isSubtaskCompletedByStudent ? "outline" : "default"}
                      size="lg"
                      title={
                        isProjectExpired(project?.deadline) ? "Project has expired" :
                        !isCurrentSequentially && !isSubtaskCompletedByStudent ? "Complete previous tasks first" :
                        isSubtaskCompletedByStudent ? "Task already completed" : "Mark as complete"
                      }
                    >
                      {isSubtaskCompletedByStudent ? (
                          <><CheckCircle className="w-5 h-5 mr-2 text-green-600" /> Task Marked Complete</>
                      ) : isProjectExpired(project?.deadline) ? (
                          <><Clock className="w-5 h-5 mr-2 text-gray-500" /> Project Expired</>
                      ) : !isCurrentSequentially ? (
                          <><Lock className="w-5 h-5 mr-2 text-gray-500" /> Task Locked (Complete Previous)</>
                      ) : (
                          <><CheckCircle className="w-5 h-5 mr-2" /> Mark Task as Complete</>
                      )}
                    </Button>
                    
                    {/* Test Admin Button - Only visible for openimpactlab@gmail.com */}
                    {session?.user?.email === 'openimpactlab@gmail.com' && !isSubtaskCompletedByStudent && (
                      <Button 
                        onClick={handleAdminCompleteTask} 
                        className="w-full bg-indigo-400 hover:bg-indigo-500 text-white"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Test Admin Complete (100%)
                      </Button>
                    )}
                    
                    {/* Button to view evaluation history */}
                    <Button
                      onClick={handleViewEvaluationHistory}
                      variant="outline"
                      size="sm"
                      disabled={!evaluationHistory || evaluationHistory.length === 0}
                      className="w-full mt-2"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      View Previous Evaluation Attempts ({evaluationHistory?.length || 0})
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className={`flex flex-col ${subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID ? 'hidden xl:hidden' : ''} xl:h-full xl:min-h-0`}>
            <Card className="overflow-hidden xl:flex xl:h-full xl:min-h-0 xl:flex-col">
              <CardHeader className="space-y-2 border-b border-slate-100 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-600 shadow-sm">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Tutor chat</CardTitle>
                        <CardDescription className="mt-0.5 hidden text-sm 2xl:block">
                          Keep the conversation active while you read and build.
                        </CardDescription>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSubtaskCompletedByStudent && <FloatingPromptHistoryButton />}

                    {(latestEvaluationAttempt || latestPromptAttempt) && (
                      <button
                        type="button"
                        onClick={() => setShowTutorGuidance((current) => !current)}
                        className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
                      >
                        {showTutorGuidance ? 'Hide suggestions' : 'Show suggestions'}
                      </button>
                    )}

                    {chatMessages.some(msg => msg.role === 'user' || msg.role === 'model') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearChatIntent}
                        disabled={isChatLoading || isSubtaskCompletedByStudent}
                        title="Clear chat history"
                        className="shrink-0"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {showTutorGuidance && (
                  <TutorInsightsStrip
                    latestEvaluationAttempt={latestEvaluationAttempt}
                    latestPromptAttempt={latestPromptAttempt}
                    onContinueEvaluation={handleExplainHistoryAttempt}
                    onImprovePrompt={handleImprovePromptFromHistory}
                    onDismiss={handleDismissTutorGuidance}
                    onStartFreshChat={handleStartFreshTutorChat}
                    compact
                  />
                )}
              </CardHeader>
              
              <CardContent 
                ref={chatContainerRef} 
                className="rounded-b-none bg-slate-50/85 px-4 py-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain"
              >
                <div className="space-y-4">
                  {chatMessages.map((msg, index) => (
                    <React.Fragment key={`message-${index}-${msg.id || index}`}>
                      <ChatMessageComponent
                        message={msg}
                        onCopyCode={(code, key) => {
                          handleCopyCode(code, key);
                          setCopiedCodeBlockKey(key);
                        }}
                        copiedCodeBlockKey={copiedCodeBlockKey}
                        sessionUserId={session?.user?.id || ''}
                        sessionUserName={session?.user?.name || ''}
                      />
                    </React.Fragment>
                  ))}
                  {isChatLoading && (
                    <div className="w-fit rounded-2xl rounded-bl-sm border border-indigo-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">Tutor is thinking</div>
                          <div className="mt-1 flex space-x-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <div className="space-y-2 rounded-b-lg border-t bg-white p-3 xl:flex-shrink-0">
                {selectedFilePreview && (
                  <div className="mb-2 flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 p-2">
                    <div className="flex items-center space-x-2">
                      <Image 
                        src={selectedFilePreview} 
                        alt="Preview" 
                        width={40}
                        height={40}
                        className="object-cover rounded"
                      />
                      <span className="max-w-[150px] truncate text-xs text-slate-600">{selectedFile?.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeSelectedFile} className="h-7 w-7 text-slate-500 hover:text-red-500">
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="text-[11px] text-slate-600">
                    {showTutorQuickActions ? 'Starter actions are visible below.' : 'Free chat mode is active.'}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setShowTutorQuickActions((current) => !current)}
                      className="text-slate-500 transition hover:text-slate-700"
                    >
                      {showTutorQuickActions ? 'Hide starters' : 'Show starters'}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartFreshTutorChat}
                      className="text-slate-500 transition hover:text-slate-700"
                    >
                      Free chat
                    </button>
                  </div>
                </div>

                {showTutorQuickActions && (
                  <TutorQuickActions
                    canReviewEvaluation={Boolean(evaluationFeedback || (evaluationHistory && evaluationHistory.length > 0))}
                    disabled={isChatLoading || isSubtaskCompletedByStudent || !isCurrentSequentially}
                    onExplainTask={() => handleTutorQuickAction('explain-task')}
                    onPlanNextSteps={() => handleTutorQuickAction('plan-next-steps')}
                    onReviewLatestEvaluation={() => handleTutorQuickAction('review-latest-evaluation')}
                  />
                )}

                <TutorContextPills
                  items={tutorContextPills}
                  onRemove={removeTutorContextPill}
                  onClearAll={clearTutorContextPills}
                />

                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/70">
                  <div className="flex items-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isChatLoading || isSubtaskCompletedByStudent || !!selectedFile}
                      className="mb-1 text-slate-500 hover:text-indigo-500"
                      title="Attach image"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      accept="image/*" 
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <Textarea 
                        ref={chatInputRef}
                        placeholder={isSubtaskCompletedByStudent ? "Task completed. Chat disabled." : (!isCurrentSequentially ? "Complete previous tasks to enable chat." : (selectedFile ? "Add a caption..." : "Ask Tutor anything about this task, or keep refining your evaluation feedback..."))} 
                        value={userInput}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          if (e.target.value.length <= MAX_USER_INPUT_LENGTH) {
                            setUserInput(e.target.value);
                          }
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!isChatLoading && !isSubtaskCompletedByStudent && isCurrentSequentially) {
                              handleSendMessage();
                            }
                          }
                        }}
                        disabled={isChatLoading || isSubtaskCompletedByStudent || !isCurrentSequentially}
                        className="min-h-[96px] max-h-[220px] resize-y border-0 bg-transparent text-sm text-slate-950 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        autoFocus
                      />

                      <div className="flex items-center justify-between gap-3 px-1 pb-1">
                        <div className="text-xs text-slate-600">
                          {promptStreak?.bestStreak && promptStreak.bestStreak > 0 && (
                            <span title="Your best streak of good prompts">Best streak: {promptStreak.bestStreak} 🏆</span>
                          )}
                        </div>
                        <p className={`text-xs text-right ${userInput.length > MAX_USER_INPUT_LENGTH ? 'text-red-500' : 'text-slate-600'}`}>
                          {userInput.length}/{MAX_USER_INPUT_LENGTH} characters
                          {userInput.length > 0 && userInput.length < 500 && (
                            <span className="ml-1 text-indigo-600">
                              • Tip: Detailed prompts usually lead to stronger tutoring
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {promptStreak && promptStreak.currentStreak > 0 && (
                      <div className="mb-1 hidden xl:block">
                        <StreakBadge 
                          currentStreak={promptStreak.currentStreak}
                          bestStreak={promptStreak.bestStreak}
                          isAnimating={isStreakAnimating}
                        />
                      </div>
                    )}

                    <Button onClick={handleSendMessage} disabled={isChatLoading || (!userInput.trim() && !selectedFile) || isSubtaskCompletedByStudent || !isCurrentSequentially} size="icon" className="mb-1 h-11 w-11 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Dialog for confirming task completion */}
        <ConfirmationDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          title="Mark Task as Complete"
          description={!isEvaluating ? "Are you sure you want to mark this task as complete? Your work will be evaluated against the task criteria." : ""}
          confirmText="Evaluate & Complete"
          confirmVariant="default"
          onConfirm={handleCompleteTask}
          isLoading={isEvaluating}
          loadingText={evaluationProgress?.stageTitle || "Starting evaluation..."}
          confirmDisabled={isEvaluating}
          cancelDisabled={isEvaluating}
          confirmIcon={<CheckCircle className="w-4 h-4" />}
        >
          {isEvaluating && <EvaluationProgressPanel progress={evaluationProgress} className="mt-2" />}
        </ConfirmationDialog>

        {/* Dialog for displaying evaluation feedback */}
        <AlertDialog 
          open={showEvaluationFeedbackDialog} 
          onOpenChange={setShowEvaluationFeedbackDialog}
        >
          <AlertDialogContent className="max-h-[90dvh] max-w-5xl overflow-hidden p-0">
            <div className="flex max-h-[90dvh] flex-col">
              <AlertDialogHeader className="border-b border-slate-200 bg-white px-6 py-5">
                <AlertDialogTitle>Task Evaluation Results</AlertDialogTitle>
                <SafeAlertDialogDescription>
                  Review your evaluation results below and continue improving without losing your place.
                </SafeAlertDialogDescription>
              </AlertDialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {evaluationFeedback && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.86fr_1.14fr]">
                      <div className="space-y-4 xl:sticky xl:top-0">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-slate-700">Evaluation Score</p>
                              <p className="text-xs text-slate-500">A stronger score means your evidence is more clearly visible in the current task work.</p>
                            </div>
                            <ScoreDisplay score={evaluationFeedback.score} />
                          </div>
                          <ScoreProgressBar score={evaluationFeedback.score} className="mt-3" />
                        </div>

                        {evaluationFeedback.feedback && (
                          <div>
                            <h4 className="mb-2 font-semibold text-slate-900">Overall Result</h4>
                            <div className={`rounded-xl p-4 text-sm ${
                              evaluationFeedback.score >= 80 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {evaluationFeedback.feedback}
                            </div>
                          </div>
                        )}

                        {evaluationFeedback.score < 80 && (
                          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">Your work doesn&apos;t meet the required criteria yet.</p>
                              <p className="mt-1">Use the Tutor actions on this page to turn missing requirements or suggestions into your next draft.</p>
                            </div>
                          </div>
                        )}

                        {evaluationFeedback.result?.rawContent?.summary && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-semibold text-slate-900">Summary</h4>
                                <p className="text-xs text-slate-500">A concise explanation of how your current work was interpreted.</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAskTutorAboutEvaluation}
                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              >
                                <MessageSquare className="mr-1.5 h-4 w-4" />
                                Ask Tutor to explain
                              </Button>
                            </div>
                            <p className="text-sm leading-6 text-slate-700">{evaluationFeedback.result.rawContent.summary}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {evaluationFeedback.result?.teachingFeedback && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {evaluationFeedback.result.teachingFeedback.strengths && evaluationFeedback.result.teachingFeedback.strengths.length > 0 && (
                              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                <h4 className="font-semibold text-green-900">What you already did well</h4>
                                <ul className="mt-3 space-y-2 text-sm text-green-800">
                                  {evaluationFeedback.result.teachingFeedback.strengths.map((item, index) => (
                                    <li key={index} className="flex gap-2"><CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> <span>{item}</span></li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {evaluationFeedback.result.teachingFeedback.missingRequirements && evaluationFeedback.result.teachingFeedback.missingRequirements.length > 0 && (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <h4 className="font-semibold text-amber-900">What is still missing</h4>
                                <ul className="mt-3 space-y-2 text-sm text-amber-800">
                                  {evaluationFeedback.result.teachingFeedback.missingRequirements.map((item, index) => (
                                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2">
                                      <span className="flex-1">{item}</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTutorSuggestion({ requirement: item })}
                                        className="h-8 border-amber-200 text-amber-700 hover:bg-amber-100"
                                      >
                                        <MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" />
                                        Ask Tutor
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {evaluationFeedback.result.teachingFeedback.nextSteps && evaluationFeedback.result.teachingFeedback.nextSteps.length > 0 && (
                              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                <h4 className="font-semibold text-blue-900">Recommended next steps</h4>
                                <div className="mt-3 space-y-2">
                                  {evaluationFeedback.result.teachingFeedback.nextSteps.map((item, index) => (
                                    <div key={index} className="flex items-start justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-blue-800">
                                      <span className="flex-1">{item}</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTutorSuggestion({ suggestion: item })}
                                        className="h-8 border-blue-200 text-blue-700 hover:bg-blue-100"
                                      >
                                        <SendHorizonal className="mr-1.5 h-3.5 w-3.5" />
                                        Use in Tutor
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {evaluationFeedback.result.teachingFeedback.minimumToPass && evaluationFeedback.result.teachingFeedback.minimumToPass.length > 0 && (
                              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                                <h4 className="font-semibold text-indigo-900">Minimum needed to pass</h4>
                                <ul className="mt-3 space-y-2 text-sm text-indigo-800">
                                  {evaluationFeedback.result.teachingFeedback.minimumToPass.map((item, index) => (
                                    <li key={index} className="rounded-lg bg-white/80 px-3 py-2">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {evaluationFeedback.result?.rawContent?.checkpoints && evaluationFeedback.result.rawContent.checkpoints.length > 0 && (
                          <div>
                            <h4 className="mb-2 font-semibold text-slate-900">Requirements Status</h4>
                            <div className="space-y-3">
                              {evaluationFeedback.result.rawContent.checkpoints.map((checkpoint, index) => (
                                <div key={index} className="space-y-2">
                                  <RequirementCheckpoint
                                    status={checkpoint.status}
                                    requirement={checkpoint.requirement}
                                    details={checkpoint.details}
                                  />
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTutorSuggestion({ requirement: checkpoint.requirement, details: checkpoint.details })}
                                      className="border-slate-200 text-slate-700 hover:bg-slate-50"
                                    >
                                      <MessageSquare className="mr-1.5 h-4 w-4" />
                                      Ask Tutor about this requirement
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {evaluationFeedback.result?.rawContent?.improvements && evaluationFeedback.result.rawContent.improvements.length > 0 && (
                          <div>
                            <h4 className="mb-2 font-semibold text-slate-900">Suggested Improvements</h4>
                            <div className="space-y-2">
                              {evaluationFeedback.result.rawContent.improvements.map((improvement, index) => (
                                <div key={index} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                  <span className="flex-1">{improvement}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTutorSuggestion({ suggestion: improvement })}
                                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                  >
                                    <SendHorizonal className="mr-1.5 h-3.5 w-3.5" />
                                    Use in Tutor
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <AlertDialogFooter className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAskTutorAboutEvaluation}
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Continue in Tutor
                </Button>
                <AlertDialogAction 
                  onClick={() => setShowEvaluationFeedbackDialog(false)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Review & Try Again
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <ConfirmationDialog
          open={showClearChatDialog}
          onOpenChange={setShowClearChatDialog}
          title="Clear Chat History"
          description="Are you sure you want to clear the chat history? This action cannot be undone."
          confirmText="Clear Chat"
          confirmVariant="destructive"
          onConfirm={handleClearChat}
        />

        {/* Evaluation History Dialog */}
        <AlertDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <AlertDialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Evaluation History</AlertDialogTitle>
              <SafeAlertDialogDescription>
                Your previous evaluation attempts for this task
              </SafeAlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4 space-y-6">
              {evaluationHistory?.length ? (
                <div className="space-y-6">
                  {[...evaluationHistory]
                    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                    .map((evaluation, index) => (
                    <EvaluationHistoryItem 
                      key={index}
                      evaluation={evaluation}
                      index={index}
                      totalCount={evaluationHistory.length}
                      onExplainAttempt={handleExplainHistoryAttempt}
                      onUseImprovement={(historyEvaluation, improvement) => handleTutorSuggestionFromHistory({
                        evaluation: historyEvaluation,
                        suggestion: improvement,
                      })}
                      onAskRequirement={(historyEvaluation, requirement, details) => handleTutorSuggestionFromHistory({
                        evaluation: historyEvaluation,
                        requirement,
                        details,
                      })}
                    />
                  ))}
                </div>
              ) : (
                <EmptyEvaluationHistory />
              )}
            </div>
            
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowHistoryDialog(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Prompt History Dialog */}
        <Dialog open={showPromptHistoryDialog} onOpenChange={setShowPromptHistoryDialog}>
          <DialogContent className="flex max-h-[80dvh] max-w-4xl flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Your Prompt History & Feedback</DialogTitle>
              <DialogDescription>
                View your previous prompts and their quality scores for this task.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-1 space-y-4">
              {promptHistory && promptHistory.length > 0 ? (
                [...promptHistory]
                  .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                  .map((prompt, index) => (
                  <PromptHistoryItem
                    key={`prompt-${index}-${prompt.timestamp.toMillis()}`}
                    prompt={prompt}
                    onExplainPrompt={handleImprovePromptFromHistory}
                  />
                ))
              ) : (
                <EmptyPromptHistory />
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowPromptHistoryDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project Submission Dialog */}
        <SubmitProjectDialog 
          project={project}
          participation={participation}
          showDialog={showSubmitProjectDialog}
          setShowDialog={setShowSubmitProjectDialog}
          hideFloatingButton={!isSubtaskCompletedByStudent || !areAllTasksCompleted(project, participation)}
        />
      </div>
    </MainLayout>
  );
} 
