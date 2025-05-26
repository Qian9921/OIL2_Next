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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
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
  ArrowLeft, Send, CheckCircle, BookOpen, AlertTriangle, Bot, 
  UserCircle2, Trash2, Paperclip, Lock, Loader2, Github, Info, 
  ChevronUp, ChevronDown, ChevronLeft, Circle, Clock, X as XIcon,
  MessageCircleQuestion, XCircle, AlertCircle, MessageSquare, Copy, FileText, PlusCircle, Download, SendHorizonal
} from 'lucide-react';

// Project-specific components
import { ChatMessage as ChatMessageComponent } from '@/components/chat/chat-message';
import { LoadingState } from '@/components/ui/loading-state';
import { ScoreDisplay, ScoreProgressBar, ScoreBadge, MetricScoreCard, StreakBadge } from '@/components/task/score-components';
import { SafeAlertDialogDescription, EvaluationLoadingState, ConfirmationDialog, RequirementCheckpoint } from '@/components/task/dialog-components';
import { EvaluationHistoryItem, PromptHistoryItem, EmptyPromptHistory, EmptyEvaluationHistory, PromptHistoryEntry } from '@/components/task/history-components';
import { PromptFeedbackDisplay, PromptFeedbackMessage } from '@/components/task/feedback-components';
import { DimensionScoreDisplay } from '@/components/task/score-components';

// Utils and data
import { getProject, getParticipationByProjectAndStudent, updateParticipation } from '@/lib/firestore';
import { Project, Subtask, Participation, ChatMessage } from '@/lib/types';
import { showSuccessToast, showErrorToast, showStreakToast, showInfoToast, showFeedbackToast } from '@/lib/toast-utils';
import { GITHUB_SUBMISSION_SUBTASK_ID } from '@/lib/constants';
import { saveTaskChatHistory, saveGitHubRepoURL } from '@/lib/task-utils';
import { generateAvatar, formatRelativeTime, getRawBase64 } from '@/lib/utils';
import { fetchData } from '@/lib/fetch-utils';

// Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Navigation
import { TaskNavigation } from '@/components/task/task-navigation';
import { GitHubInfoButton } from '@/components/task/github-info-button';

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
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [copiedCodeBlockKey, setCopiedCodeBlockKey] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [isCurrentSequentially, setIsCurrentSequentially] = useState(false);
  const [githubRepoUrlInput, setGithubRepoUrlInput] = useState('');
  const [isSavingRepo, setIsSavingRepo] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showEvaluationFeedbackDialog, setShowEvaluationFeedbackDialog] = useState(false);
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [isGithubNoticeOpen, setIsGithubNoticeOpen] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);
  const [promptStreak, setPromptStreak] = useState<{ currentStreak: number; bestStreak: number; isGoodPrompt: boolean } | null>(null);
  const [isStreakAnimating, setIsStreakAnimating] = useState(false);
  const [currentPromptFeedback, setCurrentPromptFeedback] = useState<{
    feedback?: string;
  } | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<{
    score: number;
    feedback: string;
    success?: boolean;
    message?: string;
    evaluationId?: string;
    status?: string;
    result?: {
      rawContent?: {
        summary?: string;
        assessment?: number;
        checkpoints?: Array<{
          status: string;
          details: string;
          requirement: string;
        }>;
        improvements?: string[];
      }
    }
  } | null>(null);
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
    result?: {
      rawContent?: {
        summary?: string;
        assessment?: number;
        checkpoints?: Array<{
          status: string;
          details: string;
          requirement: string;
        }>;
        improvements?: string[];
      }
    }
  }> | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[] | null>(null);
  const [showPromptHistoryDialog, setShowPromptHistoryDialog] = useState(false);
  const [showSubmitProjectDialog, setShowSubmitProjectDialog] = useState(false);

  const MAX_USER_INPUT_LENGTH = 500;
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
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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
      console.log("PROMPT HISTORY DEBUG - Initial check:", {
        hasPromptHistory: !!participation.promptHistory,
        subtaskId: subtask.id,
        allHistoryKeys: participation.promptHistory ? Object.keys(participation.promptHistory) : [],
        fullPromptHistory: participation.promptHistory
      });
      
      const history = participation.promptHistory?.[subtask.id] || [];
      console.log(`PROMPT HISTORY DEBUG - Loading for subtask ${subtask.id}:`, history);
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
      setIsGithubNoticeOpen(false);
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
      console.log(`HISTORY DEBUG - ${historyType} update starting:`, {
        participationId,
        subtaskId,
        currentHistoryLength: currentHistory?.length || 0,
        entry
      });
      
      // Create the new history array
      const newHistory = [...(currentHistory || []), entry];
      
      // Log the update for debugging
      console.log(`HISTORY DEBUG - ${historyType} array created:`, newHistory);
      
      // Get the current data from participation
      const currentData = participation?.[historyType] || {};
      console.log(`HISTORY DEBUG - Current ${historyType} data:`, currentData);
      
      // Prepare the update data
      const historyUpdate = {
        ...currentData,
        [subtaskId]: newHistory
      };
      
      console.log(`HISTORY DEBUG - ${historyType} update prepared:`, historyUpdate);
      
      // Update Firebase
      await updateParticipation(participationId, {
        [historyType]: historyUpdate
      });
      
      console.log(`HISTORY DEBUG - ${historyType} Firebase update completed`);
      
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
    console.log("PROMPT HISTORY DEBUG - handleViewPromptHistory called, current history:", promptHistory);
    
    // Add detailed debugging for feedback
    if (promptHistory && promptHistory.length > 0) {
      console.log("PROMPT HISTORY DEBUG - Feedback check:", 
        promptHistory.map(p => ({
          id: p.timestamp.toMillis(),
          qualityScore: p.qualityScore,
          hasFeedback: !!p.feedback,
          feedbackDetails: p.feedback ? {
            hasFeedbackProp: typeof p.feedback.feedback === 'string',
            feedbackLength: p.feedback.feedback ? p.feedback.feedback.length : 0
          } : null
        }))
      );
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
    console.log("PROMPT HISTORY DEBUG - Starting savePromptHistory with feedback:", feedback);
    
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
        console.log("PROMPT HISTORY DEBUG - Skipping save due to missing scores and feedback");
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
      console.log("PROMPT HISTORY DEBUG - Created new prompt entry:", promptEntry);
      
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

  const handleSendMessage = async () => {
    if (!userInput.trim() || isChatLoading) return;
    
    const currentInput = userInput.trim();
    setUserInput('');
    
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
      console.log("PROMPT QUALITY DEBUG - Sending chat API request with params:", {
        userId: session.user.id,
        projectId: currentProjectId,
        subtaskId: subtask.id,
        messageLength: currentInput.length,
        evaluatePromptQuality: true,
        requestPersonalizedFeedback: true,
        hasImageData: !!userMessage.imageData
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          projectId: currentProjectId,
          subtaskId: subtask.id,
          message: currentInput,
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
      let finalPromptStreak = promptStreak;
      let promptQualityData = {
        qualityScore: 0, // Default to 0 (invalid) instead of 50
        goalScore: 0,
        contextScore: 0,
        expectationsScore: 0,
        sourceScore: 0,
        isGoodPrompt: false
      };
      
      // Debug log all headers related to prompt quality
      console.log("PROMPT QUALITY DEBUG - Headers:", {
        qualityScore: headers.get('x-prompt-quality-score'),
        goalScore: headers.get('x-prompt-goal-score'),
        contextScore: headers.get('x-prompt-context-score'),
        expectationsScore: headers.get('x-prompt-expectations-score'),
        sourceScore: headers.get('x-prompt-source-score'),
        streak: headers.get('x-prompt-streak'),
        evaluation: headers.get('x-prompt-evaluation')
      });

      if (headers.get('x-prompt-quality-score')) {
        const qualityScore = parseInt(headers.get('x-prompt-quality-score') || '0');
        const isGoodPrompt = qualityScore >= 60;
        const goalScore = parseInt(headers.get('x-prompt-goal-score') || '0');
        const contextScore = parseInt(headers.get('x-prompt-context-score') || '0');
        const expectationsScore = parseInt(headers.get('x-prompt-expectations-score') || '0');
        const sourceScore = parseInt(headers.get('x-prompt-source-score') || '0');
        
        // Check if we have real scores (not all 50)
        const hasRealScores = [goalScore, contextScore, expectationsScore, sourceScore].some(score => score !== 50);
        
        let strengths: string[] = [];
        let tips: string[] = [];
        let componentFeedback: {
          goal?: string;
          context?: string;
          expectations?: string;
          source?: string;
        } = {};

        // Get personalized feedback from API response headers
        const personalisedFeedbackHeader = headers.get('x-prompt-feedback');
        if (personalisedFeedbackHeader) {
          try {
            const parsedFeedback = JSON.parse(decodeURIComponent(personalisedFeedbackHeader));
            console.log("PROMPT FEEDBACK DEBUG - Parsed feedback from headers:", parsedFeedback);
            
            // Set standardized feedback format
            if (typeof parsedFeedback.feedback === 'string') {
              const feedbackData = {
                feedback: parsedFeedback.feedback
              };
              console.log("PROMPT FEEDBACK DEBUG - Setting feedback state:", feedbackData);
              setCurrentPromptFeedback(feedbackData);
              
              // Always save to history if we have participation and subtask IDs
              if (participation?.id && subtask?.id) {
                console.log("PROMPT FEEDBACK DEBUG - Saving feedback to history");
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
              console.log("PROMPT FEEDBACK DEBUG - No valid feedback string in data");
              setCurrentPromptFeedback(null);
            }
          } catch (e) {
            console.error("Error parsing personalised feedback:", e);
            setCurrentPromptFeedback(null);
          }
        } else {
          console.log("PROMPT FEEDBACK DEBUG - No feedback header found");
          setCurrentPromptFeedback(null);
        }
        
        // Always update streak and show score toasts
        if (qualityScore > 0 && goalScore > 0 && contextScore > 0 && expectationsScore > 0 && sourceScore > 0) {
          const newStreakInfo = isGoodPrompt
            ? { currentStreak: (promptStreak?.currentStreak || 0) + 1, bestStreak: Math.max((promptStreak?.bestStreak || 0), (promptStreak?.currentStreak || 0) + 1), isGoodPrompt }
            : { currentStreak: 0, bestStreak: promptStreak?.bestStreak || 0, isGoodPrompt };
          setPromptStreak(newStreakInfo);
          finalPromptStreak = newStreakInfo;
          
          if (isGoodPrompt) {
            showFeedbackToast(toast, 'streak', "Prompt Analysis", `Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100`, 2000);
            setIsStreakAnimating(true);
            setTimeout(() => setIsStreakAnimating(false), 2000);
          } else {
            showFeedbackToast(toast, 'info', "Prompt Feedback", `Your prompt needs improvement. Scores - Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100`, 5000);
          }
        } else {
          console.log("PROMPT QUALITY DEBUG - Not showing score toast due to missing or invalid scores");
        }
      } else if (headers.get('x-prompt-streak')) {
        try {
          const streakInfoString = headers.get('x-prompt-streak');
          if (streakInfoString) {
            const parsedStreakInfo = JSON.parse(decodeURIComponent(streakInfoString));
            setPromptStreak(parsedStreakInfo);
            finalPromptStreak = parsedStreakInfo;
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
                
                console.log("PROMPT QUALITY DEBUG - Scores from evaluation header:", {
                  goalScore,
                  contextScore,
                  expectationsScore,
                  sourceScore,
                  hasValidScores,
                  rawEvalData: evalData
                });
                
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
                  console.log("PROMPT FEEDBACK DEBUG - Found feedback in evaluation data:", evalData.feedback);
                  
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
                  
                  console.log("PROMPT FEEDBACK DEBUG - Using feedback from evaluation:", feedbackData);
                  
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
                  
                  console.log("PROMPT FEEDBACK DEBUG - No valid feedback available");
                }
              } catch (e) {
                console.error('Error parsing prompt evaluation:', e);
              }
            }
            
            // Only save the prompt to history if we have valid scores or feedback
            if (participation?.id && subtask?.id) {
              // Check if we have any scores or feedback worth saving
              if (hasValidScores || hasValidFeedback || 
                  (typeof promptQualityData.goalScore === 'number') || 
                  (typeof promptQualityData.contextScore === 'number') ||
                  (typeof promptQualityData.expectationsScore === 'number') ||
                  (typeof promptQualityData.sourceScore === 'number')) {
                
                console.log("PROMPT HISTORY DEBUG - Saving prompt with quality data:", promptQualityData);
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
                console.log("PROMPT HISTORY DEBUG - Not saving to history due to missing scores and feedback");
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
              console.log("PROMPT QUALITY DEBUG - Not showing toast due to invalid scores");
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

  const handleCompleteTask = async () => {
    if (!participation || !project || !subtask) return;
    
    try {
      const completedSubtasks = participation.completedSubtasks || [];
      
      // For GitHub submission subtask, enforce GitHub repo submission
      if (subtask.id === GITHUB_SUBMISSION_SUBTASK_ID && !participation.studentGitHubRepo) {
        setShowCompleteDialog(false);
        setIsGithubNoticeOpen(true);
        return;
      }
      
      // Only add if not already completed
      if (!completedSubtasks.includes(subtask.id)) {
        // Disable the entire page during evaluation
        setIsEvaluating(true);
        setIsPageDisabled(true);
        
        // Make API call to evaluate the task completion
        try {
          console.log("Sending evaluation request with data:", {
            projectDetail: project.title,
            tasks: project.subtasks.map(st => st.title),
            currentTask: subtask.title,
            githubRepoUrl: participation.studentGitHubRepo || "",
            evidence: subtask.description || "Task completion criteria",
          });

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
            
          const result = await response.json();
          console.log("Evaluation result (full response):", JSON.stringify(result, null, 2));
          setEvaluationFeedback(result);
          
          // Ensure the score is a valid number
          const score = typeof result.score === 'number' ? result.score : 0;
          
          // Save evaluation history
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

  // Add a floating "View Prompts" button that's more visible
  const FloatingPromptHistoryButton = () => {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewPromptHistory}
        className="flex items-center gap-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700"
        title="Review your prompts and get quality feedback to improve your prompt writing skills"
      >
        <Info className="w-4 h-4" />
        <span>View Prompt Feedback</span>
        {promptHistory && promptHistory.length > 0 && (
          <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
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

  if (isLoading && !project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-var(--header-height,4rem))]">
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
      
      <div className="max-w-6xl mx-auto p-4 md:p-6 flex flex-col flex-1 h-full space-y-4">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/student/my-projects')}
              className="mr-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to My Projects
            </Button>
            <TaskNavigation 
              project={project}
              participation={participation}
              currentSubtaskId={subtaskId}
            />
          </div>
          <div className="flex items-center gap-2">
            <GitHubInfoButton />
            <Link href={`/projects/${currentProjectId}`} passHref>
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                Project Details
              </Button>
            </Link>
            {participation?.studentGitHubRepo && subtask?.id !== GITHUB_SUBMISSION_SUBTASK_ID && (
              <Link href={participation.studentGitHubRepo} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Github className="w-4 h-4 mr-2" />
                  View Repository
                </Button>
              </Link>
            )}
        </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col h-[calc(100vh-12rem)]">
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-xl">
                    <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                    {subtask?.title}
                  </CardTitle>
                  {project && (
                    <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                      <span className="font-medium">
                        {subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID ? 
                          'Repository Setup' :
                          `Task ${subtask?.order || '?'} of ${project.subtasks.filter(st => st.id !== GITHUB_SUBMISSION_SUBTASK_ID).length}`
                        }
                      </span>
                    </div>
                  )}
                </div>
                <CardDescriptionWithLock 
                  project={project} 
                  isLocked={!isCurrentSequentially && !isSubtaskCompletedByStudent} 
                />
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto py-4 min-h-0">
                <div className="space-y-4">
                  {subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID ? (
                  <div className="space-y-4 py-4">
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                      <h3 className="text-sm font-medium text-blue-800 mb-1">About This Task</h3>
                      <p className="text-gray-700 text-sm leading-normal">{subtask.description}</p>
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
                        className="focus-visible:ring-1 focus-visible:ring-purple-500"
                      />
                    </div>
                    {subtask.resources && subtask.resources.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Need help?</h4>
                        <ul className="list-disc list-inside text-sm text-blue-600 space-y-0.5">
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
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                      <h3 className="text-sm font-medium text-blue-800 mb-1">Task Description</h3>
                      <p className="text-gray-700 text-sm leading-normal">{subtask?.description}</p>
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
                <div className="mt-auto p-4 pt-3 border-t flex-shrink-0">
                  <div className="flex flex-col space-y-2">
                    <Button 
                      onClick={handleCompleteSubtaskIntent} 
                      disabled={isSubtaskCompletedByStudent || isLoading || !isCurrentSequentially}
                      className={`w-full ${isSubtaskCompletedByStudent ? '' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      variant={isSubtaskCompletedByStudent ? "outline" : "default"}
                      size="lg"
                      title={!isCurrentSequentially && !isSubtaskCompletedByStudent ? "Complete previous tasks first" : isSubtaskCompletedByStudent ? "Task already completed" : "Mark as complete"}
                    >
                      {isSubtaskCompletedByStudent ? (
                          <><CheckCircle className="w-5 h-5 mr-2 text-green-600" /> Task Marked Complete</>
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
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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

          <div className={`flex flex-col h-[calc(100vh-12rem)] ${subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID ? 'hidden' : ''}`}>
            <Card className="flex flex-col h-full overflow-hidden">
              <CardHeader className="flex-shrink-0 pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bot className="w-6 h-6 mr-2 text-purple-600" />
                    AI Task Assistant
                  </div>
                  <div className="flex items-center gap-2">
                    {!isSubtaskCompletedByStudent && <FloatingPromptHistoryButton />}
                    
                    {chatMessages.some(msg => msg.role === 'user' || msg.role === 'model') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearChatIntent}
                        disabled={isChatLoading || isSubtaskCompletedByStudent}
                        title="Clear chat history"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Clear Chat
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  Ask questions about this task and get help from our AI assistant
                </CardDescription>
              </CardHeader>
              
              <CardContent 
                ref={chatContainerRef} 
                className="flex-grow overflow-y-auto px-4 py-4 bg-slate-50 rounded-b-none min-h-0"
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
                      <div className="flex items-center space-x-2 py-2 px-4 rounded-lg bg-gray-50 w-fit">
                        <div className="text-sm text-gray-600">AI is typing</div>
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                  )}
                </div>
              </CardContent>
              
              <div className="p-3 border-t bg-white rounded-b-lg mt-auto flex-shrink-0">
                {selectedFilePreview && (
                  <div className="mb-2 p-2 border border-slate-300 rounded-md bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Image 
                        src={selectedFilePreview} 
                        alt="Preview" 
                        width={40}
                        height={40}
                        className="object-cover rounded"
                      />
                      <span className="text-xs text-slate-600 truncate max-w-[150px]">{selectedFile?.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeSelectedFile} className="h-7 w-7 text-slate-500 hover:text-red-500">
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isChatLoading || isSubtaskCompletedByStudent || !!selectedFile}
                    className="text-slate-500 hover:text-purple-600"
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
                  
                  {/* Display streak badge when streak exists */}
                  {promptStreak && promptStreak.currentStreak > 0 && (
                    <StreakBadge 
                      currentStreak={promptStreak.currentStreak}
                      bestStreak={promptStreak.bestStreak}
                      isAnimating={isStreakAnimating}
                    />
                  )}
                  
                  <Input 
                    type="text" 
                    placeholder={isSubtaskCompletedByStudent ? "Task completed. Chat disabled." : (!isCurrentSequentially ? "Complete previous tasks to enable chat." : (selectedFile ? "Add a caption..." : "Ask your AI assistant..."))} 
                    value={userInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      if (e.target.value.length <= MAX_USER_INPUT_LENGTH) {
                        setUserInput(e.target.value);
                      }
                    }}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !isChatLoading && !isSubtaskCompletedByStudent && isCurrentSequentially && handleSendMessage()}
                    disabled={isChatLoading || isSubtaskCompletedByStudent || !isCurrentSequentially}
                    className="flex-1 text-sm focus-visible:ring-1 focus-visible:ring-purple-500"
                  />
                  <Button onClick={handleSendMessage} disabled={isChatLoading || (!userInput.trim() && !selectedFile) || isSubtaskCompletedByStudent || !isCurrentSequentially} size="icon" className="rounded-full w-9 h-9">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-gray-500">
                    {promptStreak?.bestStreak && promptStreak.bestStreak > 0 && (
                      <span title="Your best streak of good prompts">Best: {promptStreak.bestStreak} 🏆</span>
                    )}
                  </div>
                  <p className={`text-xs text-right ${userInput.length > MAX_USER_INPUT_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
                  {userInput.length}/{MAX_USER_INPUT_LENGTH}
                </p>
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
          loadingText="Evaluating..."
          confirmDisabled={isEvaluating}
          cancelDisabled={isEvaluating}
          confirmIcon={<CheckCircle className="w-4 h-4" />}
        />

        {/* Dialog for displaying evaluation feedback */}
        <AlertDialog 
          open={showEvaluationFeedbackDialog} 
          onOpenChange={setShowEvaluationFeedbackDialog}
        >
          <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Task Evaluation Results</AlertDialogTitle>
              <SafeAlertDialogDescription>
                Review your evaluation results below
              </SafeAlertDialogDescription>
            </AlertDialogHeader>

            {evaluationFeedback && (
              <div className="space-y-4 py-2">
                {/* Score */}
                <div className="flex items-center justify-between">
                  <span className="font-medium">Evaluation Score:</span>
                  <ScoreDisplay score={evaluationFeedback.score} />
                </div>
                <ScoreProgressBar score={evaluationFeedback.score} className="mb-2" />
                
                {/* Summary */}
                {evaluationFeedback.result?.rawContent?.summary && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <h4 className="font-semibold mb-2">Summary:</h4>
                    <p className="text-sm text-gray-700">{evaluationFeedback.result.rawContent.summary}</p>
                  </div>
                )}
                
                {/* Requirements and Status */}
                {evaluationFeedback.result?.rawContent?.checkpoints && evaluationFeedback.result.rawContent.checkpoints.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Requirements Status:</h4>
                    <div className="space-y-3">
                      {evaluationFeedback.result.rawContent.checkpoints.map((checkpoint, index) => (
                        <RequirementCheckpoint
                          key={index}
                          status={checkpoint.status}
                          requirement={checkpoint.requirement}
                          details={checkpoint.details}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Improvements */}
                {evaluationFeedback.result?.rawContent?.improvements && evaluationFeedback.result.rawContent.improvements.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Suggested Improvements:</h4>
                    <ul className="list-disc pl-5 space-y-2">
                      {evaluationFeedback.result.rawContent.improvements.map((improvement, index) => (
                        <li key={index} className="text-sm text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* General feedback */}
                {evaluationFeedback.feedback && (
                  <div className="mt-2">
                    <h4 className="font-semibold mb-2">Evaluation Result:</h4>
                    <div className={`p-3 rounded-md text-sm ${
                      evaluationFeedback.score >= 80 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {evaluationFeedback.feedback}
                    </div>
                  </div>
                )}
                
                {evaluationFeedback.score < 80 && (
                  <div className="flex items-start gap-2 text-red-600 text-sm mt-4 p-3 bg-red-50 rounded-md">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Your work doesn't meet the required criteria yet.</p>
                      <p className="mt-1">Please review the feedback above and make the necessary improvements before trying again.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogAction 
                onClick={() => setShowEvaluationFeedbackDialog(false)} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Review & Try Again
              </AlertDialogAction>
            </AlertDialogFooter>
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
          <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
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