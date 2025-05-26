'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { getProject, getParticipationByProjectAndStudent, updateParticipation } from '@/lib/firestore';
import { Project, Subtask, Participation, ChatMessage } from '@/lib/types';
import { generateAvatar, formatRelativeTime, getRawBase64 } from '@/lib/utils';
import { fetchData } from '@/lib/fetch-utils';
import { showSuccessToast, showErrorToast, showStreakToast, showInfoToast } from '@/lib/toast-utils';
import { ArrowLeft, Send, CheckCircle, BookOpen, AlertTriangle, Bot, UserCircle2, Copy as CopyIcon, Check as CheckIcon, Trash2, Paperclip, X as XIcon, Lock, Loader2, Github, Info, ChevronUp, ChevronDown, ChevronLeft, Circle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GITHUB_SUBMISSION_SUBTASK_ID } from '@/lib/constants';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ChatMessage as ChatMessageComponent } from '@/components/chat/chat-message';
import { LoadingState } from '@/components/ui/loading-state';
import { GitHubInfoButton, TaskNavigation, saveTaskChatHistory, saveGitHubRepoURL } from '@/lib/task-utils';
import { Timestamp } from 'firebase/firestore';

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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          projectId: currentProjectId,
          subtaskId: subtask.id,
          message: currentInput,
          evaluatePromptQuality: true,
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
      if (headers.get('x-prompt-quality-score')) {
        const qualityScore = parseInt(headers.get('x-prompt-quality-score') || '0');
        const isGoodPrompt = qualityScore >= 60;
        const goalScore = parseInt(headers.get('x-prompt-goal-score') || '0');
        const contextScore = parseInt(headers.get('x-prompt-context-score') || '0');
        const expectationsScore = parseInt(headers.get('x-prompt-expectations-score') || '0');
        const sourceScore = parseInt(headers.get('x-prompt-source-score') || '0');

        const newStreakInfo = isGoodPrompt
          ? { currentStreak: (promptStreak?.currentStreak || 0) + 1, bestStreak: Math.max((promptStreak?.bestStreak || 0), (promptStreak?.currentStreak || 0) + 1), isGoodPrompt }
          : { currentStreak: 0, bestStreak: promptStreak?.bestStreak || 0, isGoodPrompt };
        setPromptStreak(newStreakInfo);
        finalPromptStreak = newStreakInfo;
        if (isGoodPrompt) {
          showStreakToast(toast, newStreakInfo.currentStreak, newStreakInfo.bestStreak);
          showInfoToast(toast, "Prompt Analysis", { description: `Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100` });
          setIsStreakAnimating(true);
          setTimeout(() => setIsStreakAnimating(false), 2000);
        } else {
          showInfoToast(toast, "Prompt Feedback", { description: `Your prompt needs improvement. Scores - Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100` });
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
            if (promptEval) {
              try {
                const evalData = JSON.parse(decodeURIComponent(promptEval));
                goalScore = evalData.goalScore || 0; contextScore = evalData.contextScore || 0; expectationsScore = evalData.expectationsScore || 0; sourceScore = evalData.sourceScore || 0;
              } catch (e) { console.error('Error parsing prompt evaluation:', e); }
            }
            if (parsedStreakInfo.isGoodPrompt) {
              showStreakToast(toast, parsedStreakInfo.currentStreak, parsedStreakInfo.bestStreak);
              if (promptEval) showInfoToast(toast, "Prompt Analysis", { description: `Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100` });
              setIsStreakAnimating(true); setTimeout(() => setIsStreakAnimating(false), 2000);
            } else {
              showInfoToast(toast, "Prompt Feedback", { description: promptEval ? `Your prompt needs improvement. Scores - Goal: ${goalScore}/100 | Context: ${contextScore}/100 | Expectations: ${expectationsScore}/100 | Source: ${sourceScore}/100` : "Try to be more specific..." });
            }
          }
        } catch (e) { console.error('Error parsing streak info from header:', e); }
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

  // Handle task completion
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
          console.log("Evaluation result (full response):", JSON.stringify(result, null, 2)); // Detailed debug log
          setEvaluationFeedback(result);
          
          // Ensure the score is a valid number
          const score = typeof result.score === 'number' ? result.score : 0;
          
          // Save evaluation result to Firebase regardless of outcome
          const evaluationResult = {
            ...result,
            timestamp: Timestamp.now()
          };
          
          // Update the evaluation history in the state
          const newHistory = [...(evaluationHistory || []), evaluationResult];
          setEvaluationHistory(newHistory);
          
          // Prepare update data for Firebase
          const evaluationHistoryUpdate = {
            ...(participation.evaluationHistory || {}),
            [subtask.id]: newHistory
          };
          
          // Update Firebase with the new evaluation history
          await updateParticipation(participation.id, {
            evaluationHistory: evaluationHistoryUpdate
          });
          
          // Check if the score meets the threshold (80%)
          if (!result.score || typeof result.score !== 'number' || score < 80) {
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
          
          await updateParticipation(participation.id, {
            completedSubtasks: newCompletedSubtasks,
            progress: newProgress,
            evaluationHistory: evaluationHistoryUpdate
          });
          
          // Update participation in the state
          setParticipation({
            ...participation,
            completedSubtasks: newCompletedSubtasks,
            progress: newProgress,
            evaluationHistory: evaluationHistoryUpdate
          });
          
          setIsSubtaskCompletedByStudent(true);
          showSuccessToast(toast, "Task Completed", { 
            description: `You've completed this task with a score of ${score}%!` 
          });

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
      
      showSuccessToast(toast, "Chat Cleared", { description: "Chat history cleared successfully" });
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
      showInfoToast(toast, "No History", { description: "No evaluation attempts found for this task." });
    }
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
                <CardTitle className="flex items-center text-xl">
                    <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                  {subtask?.title}
                </CardTitle>
                <CardDescription>Part of: {project?.title}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto py-4 min-h-0">
                <div className="space-y-4">
                  {subtask?.id === GITHUB_SUBMISSION_SUBTASK_ID ? (
                  <div className="space-y-4 py-4">
                    <p className="text-gray-700 text-sm leading-normal">{subtask.description}</p>
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
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Description:</h4>
                        <p className="text-gray-700 text-sm leading-normal">{subtask?.description}</p>
                    </div>
                      {subtask?.estimatedHours && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Estimated Time:</h4>
                          <p className="text-gray-700 text-sm">{subtask?.estimatedHours} hours</p>
                      </div>
                    )}
                      {subtask?.resources && subtask?.resources.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Suggested Resources:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                            {subtask?.resources.map((res, i) => <li key={i}>{res}</li>)}
                        </ul>
                      </div>
                    )}
                      {subtask?.completionCriteria && subtask?.completionCriteria.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">To Complete This Task:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                            {subtask?.completionCriteria.map((crit, i) => <li key={i}>{crit}</li>)}
                        </ul>
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
                </CardTitle>
              </CardHeader>
              
              <CardContent 
                ref={chatContainerRef} 
                className="flex-grow overflow-y-auto px-4 py-4 bg-slate-50 rounded-b-none min-h-0"
              >
                <div className="space-y-4">
                  {chatMessages.map((msg, index) => (
                    <ChatMessageComponent
                      key={`message-${index}-${msg.id || index}`}
                      message={msg}
                      onCopyCode={(code, key) => {
                        handleCopyCode(code, key);
                        setCopiedCodeBlockKey(key);
                      }}
                      copiedCodeBlockKey={copiedCodeBlockKey}
                      sessionUserId={session?.user?.id || ''}
                      sessionUserName={session?.user?.name || ''}
                    />
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
                      <img src={selectedFilePreview} alt="Preview" className="h-10 w-10 object-cover rounded" />
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
                    <div 
                      className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        promptStreak.currentStreak >= 5 ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                        promptStreak.currentStreak >= 3 ? 'bg-green-100 text-green-800 border border-green-300' :
                        'bg-blue-100 text-blue-800 border border-blue-300'
                      } mr-1 ${isStreakAnimating ? 'animate-bounce-short' : ''}`}
                      title={`You have a streak of ${promptStreak.currentStreak} good prompts! Your best streak is ${promptStreak.bestStreak}.`}
                    >
                      <span className="mr-1">🔥</span>
                      <span className={isStreakAnimating ? 'animate-pulse' : ''}>{promptStreak.currentStreak}</span>
                    </div>
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
        <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark Task as Complete</AlertDialogTitle>
              <AlertDialogDescription>
                {!isEvaluating && "Are you sure you want to mark this task as complete? Your work will be evaluated against the task criteria."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {isEvaluating && (
              <div className="py-4">
                <LoadingState 
                  size="md" 
                  text="Evaluating your work... This might take a few moments." 
                  fullHeight={false} 
                  className="py-2"
                />
              </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isEvaluating}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCompleteTask} 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isEvaluating}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : 'Evaluate & Complete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog for displaying evaluation feedback */}
        <AlertDialog 
          open={showEvaluationFeedbackDialog} 
          onOpenChange={setShowEvaluationFeedbackDialog}
        >
          <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Task Evaluation Results</AlertDialogTitle>
              <AlertDialogDescription>
                Review your evaluation results below
              </AlertDialogDescription>
            </AlertDialogHeader>

            {evaluationFeedback && (
              <div className="space-y-4 py-2">
                {/* Score */}
                <div className="flex items-center justify-between">
                  <span className="font-medium">Evaluation Score:</span>
                  <span className={`font-bold ${evaluationFeedback.score >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                    {evaluationFeedback.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className={`h-2.5 rounded-full ${evaluationFeedback.score >= 80 ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ width: `${evaluationFeedback.score}%` }}
                  ></div>
                </div>
                
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
                        <div key={index} className="border rounded-md overflow-hidden">
                          <div className={`p-3 font-medium text-sm ${
                            checkpoint.status.toLowerCase().includes('completed') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {checkpoint.status}
                          </div>
                          <div className="p-3 border-t border-gray-200">
                            <p className="text-sm font-medium mb-1">Requirement:</p>
                            <p className="text-sm text-gray-700 mb-3">{checkpoint.requirement}</p>
                            <p className="text-sm font-medium mb-1">Feedback:</p>
                            <p className="text-sm text-gray-700">{checkpoint.details}</p>
                          </div>
                        </div>
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

        <AlertDialog open={showClearChatDialog} onOpenChange={setShowClearChatDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear the chat history? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearChat} className="bg-red-600 hover:bg-red-700 text-white">
                Clear Chat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Evaluation History Dialog */}
        <AlertDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Evaluation History</AlertDialogTitle>
              <AlertDialogDescription>
                Your previous evaluation attempts for this task
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4 space-y-6">
              {evaluationHistory?.length ? (
                <div className="space-y-6">
                  {evaluationHistory.map((evaluation, index) => {
                    const date = evaluation.timestamp?.toDate();
                    const formattedDate = date ? new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    }).format(date) : 'Unknown Date';
                    
                    return (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
                          <div className="flex items-center">
                            <span className="font-medium">Attempt {evaluationHistory.length - index}</span>
                            <span className="mx-2">•</span>
                            <span className="text-sm text-gray-500">{formattedDate}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            evaluation.score >= 80 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            Score: {evaluation.score}%
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-4">
                          {/* Summary */}
                          {evaluation.result?.rawContent?.summary && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Summary:</h4>
                              <p className="text-sm text-gray-700">{evaluation.result.rawContent.summary}</p>
                            </div>
                          )}
                          
                          {/* Requirements */}
                          {evaluation.result?.rawContent?.checkpoints && evaluation.result.rawContent.checkpoints.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Requirements Status:</h4>
                              <div className="space-y-2">
                                {evaluation.result.rawContent.checkpoints.map((checkpoint, checkpointIndex) => (
                                  <div key={checkpointIndex} className="border rounded text-sm">
                                    <div className={`p-2 ${
                                      checkpoint.status.toLowerCase().includes('completed') ? 'bg-green-50' : 'bg-red-50'
                                    }`}>
                                      <span className={checkpoint.status.toLowerCase().includes('completed') ? 'text-green-700' : 'text-red-700'}>
                                        {checkpoint.status}
                                      </span>
                                    </div>
                                    <div className="p-2">
                                      <p className="font-medium mb-1">Requirement:</p>
                                      <p className="mb-2 text-gray-700">{checkpoint.requirement}</p>
                                      <p className="font-medium mb-1">Feedback:</p>
                                      <p className="text-gray-700">{checkpoint.details}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Improvements */}
                          {evaluation.result?.rawContent?.improvements && evaluation.result.rawContent.improvements.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Suggested Improvements:</h4>
                              <ul className="list-disc pl-5 space-y-1 text-sm">
                                {evaluation.result.rawContent.improvements.map((improvement, improvementIndex) => (
                                  <li key={improvementIndex} className="text-gray-700">{improvement}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">No evaluation history found for this task.</p>
                </div>
              )}
            </div>
            
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowHistoryDialog(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
} 