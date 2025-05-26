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
import { ArrowLeft, Send, CheckCircle, BookOpen, AlertTriangle, Bot, UserCircle2, Copy as CopyIcon, Check as CheckIcon, Trash2, Paperclip, X as XIcon, Lock, Loader2, Github, Info, ChevronUp, ChevronDown, ChevronLeft, Circle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GITHUB_SUBMISSION_SUBTASK_ID } from '@/lib/constants';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

// GitHubInfoButton component - follows DRY principle by encapsulating the GitHub repository notice
const GitHubInfoButton = () => {
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

// Add a utility function to save task-specific chat history
const saveTaskChatHistory = async (
  participationId: string,
  subtaskId: string,
  currentTaskChatHistory: { [key: string]: ChatMessage[] } | undefined,
  messages: ChatMessage[]
) => {
  const taskChatHistory = {
    ...(currentTaskChatHistory || {}),
    [subtaskId]: messages
  };
  
  await updateParticipation(participationId, { taskChatHistory });
};

// TaskNavigation component - encapsulates task navigation functionality
const TaskNavigation = ({ project, participation, currentSubtaskId }: { 
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
          Task {currentIndex + 1} of {sortedSubtasks.length}
        </span>
        {isProgressExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>
      
      <Collapsible open={isProgressExpanded} className="relative">
        <CollapsibleContent className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-md border p-3 z-40 w-auto min-w-[280px] max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {sortedSubtasks.map((task, index) => {
              const isCompleted = participation.completedSubtasks.includes(task.id);
              const isCurrent = task.id === currentSubtaskId;
              // Calculate if this task is available based on sequential completion
              const previousTasksCompleted = index === 0 || 
                sortedSubtasks
                  .slice(0, index)
                  .every(t => participation.completedSubtasks.includes(t.id));
              
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
                      {index + 1}. {task.title}
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
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [isGithubNoticeOpen, setIsGithubNoticeOpen] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);
  const [promptStreak, setPromptStreak] = useState<{ currentStreak: number; bestStreak: number; isGoodPrompt: boolean } | null>(null);
  const [isStreakAnimating, setIsStreakAnimating] = useState(false);

  const MAX_USER_INPUT_LENGTH = 500;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProjectId && subtaskId && session?.user?.id) {
      loadTaskData();
    }
  }, [currentProjectId, subtaskId, session?.user?.id]);

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

  const loadTaskData = async () => {
    setIsLoading(true);
    try {
      const studentId = session!.user!.id;
      const currentParticipation = await getParticipationByProjectAndStudent(currentProjectId, studentId);

      if (!currentParticipation) {
        toast({ title: 'Access Denied', description: 'You are not enrolled in this project.', variant: 'destructive' });
        router.push(`/projects/${currentProjectId}`);
        return;
      }
      setParticipation(currentParticipation);

      const currentProjectData = await getProject(currentProjectId);
      if (!currentProjectData) {
        toast({ title: 'Error', description: 'Project not found.', variant: 'destructive' });
        router.push('/student/my-projects');
        return;
      }
      setProject(currentProjectData);

      const currentSubtaskData = currentProjectData.subtasks.find(st => st.id === subtaskId);
      if (!currentSubtaskData) {
        toast({ title: 'Error', description: 'Task not found in this project.', variant: 'destructive' });
        router.push(`/projects/${currentProjectId}`);
        return;
      }
      setSubtask(currentSubtaskData);
      setGithubRepoUrlInput(currentParticipation.studentGitHubRepo || '');
      
      const initialSystemMessage: ChatMessage = {
        role: 'system',
        parts: [{ text: `Welcome! I'm here to help you with the task: "${currentSubtaskData.title}". How can I assist you today?` }],
        timestamp: new Date(),
      };

      if (currentParticipation.taskChatHistory && 
          currentParticipation.taskChatHistory[subtaskId] && 
          currentParticipation.taskChatHistory[subtaskId].length > 0) {
        setChatMessages(currentParticipation.taskChatHistory[subtaskId]);
      } else {
        setChatMessages([initialSystemMessage]);
      }

      const completed = currentParticipation.completedSubtasks.includes(subtaskId);
      setIsSubtaskCompletedByStudent(completed);

      const sortedProjectSubtasks = [...currentProjectData.subtasks].sort((a,b) => a.order - b.order);
      const currentSubtaskIndex = sortedProjectSubtasks.findIndex(st => st.id === subtaskId);
      let isSequential = true;
      if (currentSubtaskIndex > 0) {
        for (let i = 0; i < currentSubtaskIndex; i++) {
          if (!currentParticipation.completedSubtasks.includes(sortedProjectSubtasks[i].id)) {
            isSequential = false;
            break;
          }
        }
      }
      setIsCurrentSequentially(isSequential);
      if (!isSequential && !completed) {
         toast({ title: 'Task Locked', description: 'Please complete previous tasks in sequence before starting this one.', variant: 'default' });
      }

    } catch (error) {
      console.error("Error loading task data:", error);
      toast({ title: 'Error', description: 'Failed to load task information.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGitHubRepo = async () => {
    if (!participation || !subtask || subtask.id !== GITHUB_SUBMISSION_SUBTASK_ID || !project) return;

    const urlToSave = githubRepoUrlInput.trim();
    if (!urlToSave || !urlToSave.startsWith('http') || !urlToSave.includes('github.com')) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo).', variant: 'destructive' });
      return;
    }

    setIsSavingRepo(true);
    try {
      const newCompletedSubtasks = participation.completedSubtasks.includes(subtask.id)
        ? participation.completedSubtasks
        : [...participation.completedSubtasks, subtask.id];

      const totalProjectSubtasks = project.subtasks.length || 1;
      const newProgress = Math.round((newCompletedSubtasks.length / totalProjectSubtasks) * 100);

      await updateParticipation(participation.id, {
        studentGitHubRepo: urlToSave,
        completedSubtasks: newCompletedSubtasks,
        progress: newProgress,
      });

      setParticipation(prev => prev ? { ...prev, studentGitHubRepo: urlToSave, completedSubtasks: newCompletedSubtasks, progress: newProgress } : null);
      setIsSubtaskCompletedByStudent(true);
      toast({ title: 'Repository Saved!', description: 'Your GitHub repository URL has been saved.', variant: 'default' });

      const sortedProjectSubtasks = [...project.subtasks].sort((a,b) => a.order - b.order);
      const currentSubtaskIndex = sortedProjectSubtasks.findIndex(st => st.id === subtask.id);
      if (currentSubtaskIndex < sortedProjectSubtasks.length - 1) {
        const nextSubtask = sortedProjectSubtasks[currentSubtaskIndex + 1];
        router.push(`/projects/${project.id}/task/${nextSubtask.id}`);
      } else {
        router.push(`/student/my-projects`);
      }

    } catch (error) {
      console.error("Error saving GitHub repo:", error);
      toast({ title: 'Error', description: 'Failed to save GitHub repository URL.', variant: 'destructive' });
    } finally {
      setIsSavingRepo(false);
    }
  };

  const handleSendMessage = async () => {
    const textInput = userInput.trim();
    const imageInput = selectedFilePreview;
    const imageMime = selectedFile?.type;

    if ((!textInput && !imageInput) || isChatLoading || !project || !subtask || !session?.user?.id) return;

    const userMessageParts: { text?: string; inlineData?: { mimeType: string; data: string; } }[] = [];
    if (textInput) {
      userMessageParts.push({ text: textInput });
    }
    if (imageInput && imageMime) {
      userMessageParts.push({ inlineData: { mimeType: imageMime, data: imageInput } });
    }

    const newUserMessage: ChatMessage = {
      role: 'user',
      parts: userMessageParts,
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setSelectedFile(null);
    setSelectedFilePreview(null);
    setIsChatLoading(true);

    const aiResponsePlaceholder: ChatMessage = {
      role: 'model',
      parts: [{ text: '' }],
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, aiResponsePlaceholder]);

    // Prepare chat history for API call
    const apiChatHistory = chatMessages
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(msg => ({
        role: msg.role,
        parts: msg.parts.map(part => {
          if (part.text) return { text: part.text };
          if (part.inlineData) {
            return { 
              inlineData: { 
                mimeType: part.inlineData.mimeType, 
                data: getRawBase64(part.inlineData.data) || ''
              } 
            };
          }
          return {};
        }).filter(p => p.text || (p.inlineData && p.inlineData.data))
      }))
      .filter(turn => turn.parts.length > 0);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          projectId: project.id,
          subtaskId: subtask.id,
          message: textInput, 
          imageData: getRawBase64(imageInput || undefined),
          imageMimeType: imageMime,
          chatHistory: apiChatHistory,
          evaluatePromptQuality: true // Request prompt quality evaluation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setChatMessages(prev => prev.slice(0, -1));
        throw new Error(errorData.message || 'Failed to get response from AI tutor.');
      }

      if (!response.body) {
        setChatMessages(prev => prev.slice(0, -1));
        throw new Error('Response body is null.');
      }

      // Extract prompt quality score from headers
      const promptQualityScore = response.headers.get('X-Prompt-Quality-Score');
      const promptQualityDetails = response.headers.get('X-Prompt-Quality-Details');
      const promptStreakInfo = response.headers.get('X-Prompt-Streak');
      
      // If we received prompt quality scores, show them
      if (promptQualityScore) {
        const score = parseInt(promptQualityScore);
        const details = promptQualityDetails ? JSON.parse(decodeURIComponent(promptQualityDetails)) : null;
        
        // Show toast with prompt quality feedback
        toast({
          title: `Prompt Quality: ${getScoreRating(score)}`,
          description: details ? 
            `Goal: ${details.goal}% | Context: ${details.context}% | Expectations: ${details.expectations}% | Source: ${details.source}%` :
            `Overall score: ${score}%`,
          variant: score >= 60 ? "default" : "destructive"
        });
      }
      
      // If we received streak information, update the state
      if (promptStreakInfo) {
        const streakData = JSON.parse(decodeURIComponent(promptStreakInfo));
        setPromptStreak(streakData);
        
        // If the streak is good and growing, show a celebratory toast
        if (streakData.isGoodPrompt && streakData.currentStreak > 1) {
          // Create a more engaging message based on streak length
          let streakEmoji = "🔥";
          let streakTitle = `Prompt Streak: ${streakData.currentStreak}`;
          let streakDescription = "You're creating high-quality prompts!";
          
          // Customize based on streak level
          if (streakData.currentStreak >= 10) {
            streakEmoji = "🏆🔥🏆";
            streakTitle = `LEGENDARY STREAK: ${streakData.currentStreak}!`;
            streakDescription = "Incredible! You're a prompt engineering master!";
          } else if (streakData.currentStreak >= 7) {
            streakEmoji = "⭐🔥⭐";
            streakTitle = `AMAZING STREAK: ${streakData.currentStreak}!`;
            streakDescription = "Outstanding prompt crafting skills!";
          } else if (streakData.currentStreak >= 5) {
            streakEmoji = "🌟🔥";
            streakTitle = `Awesome Streak: ${streakData.currentStreak}!`;
            streakDescription = "You're becoming a prompt expert!";
          } else if (streakData.currentStreak >= 3) {
            streakEmoji = "✨🔥";
            streakTitle = `Great Streak: ${streakData.currentStreak}!`;
            streakDescription = "Your prompts are consistently good!";
          }
          
          // Add special note if it's a new record
          if (streakData.currentStreak === streakData.bestStreak && streakData.currentStreak > 2) {
            streakDescription = `NEW RECORD! ${streakDescription}`;
          }
          
          toast({
            title: `${streakEmoji} ${streakTitle}`,
            description: streakDescription,
            variant: "success"
          });
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      setChatMessages(prevMessages => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
          return prevMessages.slice(0, -1).concat({
            ...lastMessage,
            parts: [{ text: '' }]
          });
        }
        return prevMessages;
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        streamedText += chunk;
        setChatMessages(prevMessages => {
          const lastMessage = prevMessages[prevMessages.length -1];
          if (lastMessage && lastMessage.role === 'model') {
            return prevMessages.slice(0, -1).concat({
                ...lastMessage,
                parts: [{ text: streamedText }]
            });
          }
          return prevMessages;
        });
      }
      
      if (participation) {
        const finalAiResponse: ChatMessage = {
            role: 'model',
            parts: [{ text: streamedText }],
            timestamp: new Date()
        };
        
        // Create a new array with all previous messages except placeholders
        // plus the new user message and AI response
        const updatedChatHistory = [
          ...chatMessages.filter(msg => 
            msg.role !== 'system' && 
            msg !== aiResponsePlaceholder && 
            msg !== newUserMessage
          ),
          newUserMessage, 
          finalAiResponse
        ];

        // Save the complete chat history including both student and AI messages
        await saveTaskChatHistory(
          participation.id, 
          subtaskId, 
          participation.taskChatHistory, 
          updatedChatHistory
        );
      }

    } catch (error: any) {
      console.error("Error sending chat message:", error);
      const errorResponse: ChatMessage = {
        role: 'system',
        parts: [{ text: `Chat Error: ${error.message || 'Could not connect to the AI tutor.'}` }],
        timestamp: new Date(),
      };
      setChatMessages(prev => prev.filter(msg => msg !== aiResponsePlaceholder).concat(errorResponse));
      toast({ title: 'Chat Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper function to get a rating based on score
  const getScoreRating = (score: number): string => {
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Average";
    if (score >= 30) return "Basic";
    return "Needs Improvement";
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

  const handleClearChat = async () => {
    if (!participation || !subtask) {
      return;
    }
    
    try {
      const systemClearedMessage: ChatMessage = {
        role: 'system',
        parts: [{ text: `Chat history cleared. I'm ready to help with your task: "${subtask.title}".` }],
        timestamp: new Date(),
      };
      
      setChatMessages([systemClearedMessage]);

      // Use the extracted function for saving chat history
      await saveTaskChatHistory(participation.id, subtaskId, participation.taskChatHistory, [systemClearedMessage]);
      
      toast({ title: "Chat Cleared", description: "Chat history has been cleared.", variant: "default" });
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast({ title: "Error", description: "Could not clear chat history in the database.", variant: "destructive" });
    } finally {
      setShowClearChatDialog(false);
    }
  };

  const handleCompleteSubtaskIntent = () => {
    if (!isCurrentSequentially) {
      toast({ title: 'Task Locked', description: 'Please complete previous tasks in sequence before marking this one as complete.', variant: 'destructive' });
      return;
    }
    
    if (!isSubtaskCompletedByStudent) {
      setShowCompleteDialog(true);
    }
  };

  const handleCompleteSubtask = async () => {
    if (!participation || !subtask || isSubtaskCompletedByStudent || !project) {
      return;
    }

    if (!isCurrentSequentially) {
      toast({ title: 'Task Locked', description: 'Please complete previous tasks in sequence before marking this one as complete.', variant: 'destructive' });
      return;
    }

    setIsLoading(true); 
    try {
      const newCompletedSubtasks = participation.completedSubtasks.includes(subtask.id) 
        ? participation.completedSubtasks 
        : [...participation.completedSubtasks, subtask.id];
        
      const totalProjectSubtasks = project.subtasks.length || 1;
      const newProgress = Math.round((newCompletedSubtasks.length / totalProjectSubtasks) * 100);

      await updateParticipation(participation.id, {
        completedSubtasks: newCompletedSubtasks,
        progress: newProgress,
      });

      setIsSubtaskCompletedByStudent(true);
      toast({ title: 'Task Completed!', description: `You have marked "${subtask.title}" as complete.`, variant: 'default' });
      const sortedProjectSubtasks = [...project.subtasks].sort((a,b) => a.order - b.order);
      const currentSubtaskIndex = sortedProjectSubtasks.findIndex(st => st.id === subtask.id);
      if (currentSubtaskIndex < sortedProjectSubtasks.length - 1) {
        const nextSubtask = sortedProjectSubtasks[currentSubtaskIndex + 1];
        router.push(`/projects/${project.id}/task/${nextSubtask.id}`);
      } else {
        router.push(`/student/my-projects`);
      }

    } catch (error) {
      console.error("Error completing subtask:", error);
      toast({ title: 'Error', description: 'Failed to mark task as complete.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setShowCompleteDialog(false);
    }
  };

  if (isLoading && !project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-var(--header-height,4rem))]">
          <div className="loading-spinner" />
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
                    <div key={index} className={`flex items-start space-x-2.5 ${msg.role === 'user' ? 'justify-end' : ''} mb-4 last:mb-0`}>
                      {msg.role === 'model' && <Avatar src={generateAvatar('AI_Tutor_Bot')} alt="AI" size="sm" className="mt-1" />}
                      <div 
                        className={`relative group p-3 rounded-xl max-w-[85%] shadow-sm ${ 
                          msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 
                          msg.role === 'model' ? 'bg-white text-slate-800 border border-slate-200 rounded-bl-none' : 
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {msg.parts.map((part, i) => {
                          if (part.inlineData) {
                            return (
                              <div key={`img-${index}-${i}`} className="my-2">
                                <img 
                                  src={part.inlineData.data} 
                                  alt="User upload" 
                                  className="max-w-full h-auto rounded-md border border-slate-300" 
                                  style={{ maxHeight: '200px' }} 
                                />
                              </div>
                            );
                          }
                          return (
                            <div key={`txt-${index}-${i}`} className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap break-words">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  pre: ({node, ...props}) => {
                                    let codeString = '';
                                    if (node && node.children) {
                                      node.children.forEach(child => {
                                        if (child.type === 'element' && child.tagName === 'code') {
                                          child.children.forEach(codeChild => {
                                            if (codeChild.type === 'text') {
                                              codeString += codeChild.value;
                                            }
                                          });
                                        }
                                      });
                                    }
                                    codeString = codeString.replace(/\n$/, '');
                                    
                                    const blockKey = `code-${index}-${i}-${props.key || 'fallback'}`;
                                    return (
                                      <div className="relative group/codeblock my-2 bg-slate-800 text-white p-3 rounded-md overflow-x-auto">
                                        <pre {...props} className="!bg-transparent !p-0 !text-sm" />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover/codeblock:opacity-100 transition-opacity duration-200 bg-slate-700 hover:bg-slate-600"
                                          onClick={() => handleCopyCode(codeString, blockKey)}
                                          title="Copy code"
                                        >
                                          {copiedCodeBlockKey === blockKey ? (
                                            <CheckIcon className="h-4 w-4 text-green-400" />
                                          ) : (
                                            <CopyIcon className="h-4 w-4 text-slate-300 hover:text-slate-100" />
                                          )}
                                        </Button>
                                      </div>
                                    );
                                  },
                                  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
                                  ul: (props) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                  ol: (props) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                                }}
                              >
                                {part.text || ''}
                              </ReactMarkdown>
                            </div>
                          );
                        })}
                        <p className="text-xs mt-1.5 opacity-60 text-right">{formatRelativeTime(msg.timestamp)}</p>
                      </div>
                      {msg.role === 'user' && session?.user && <Avatar src={generateAvatar(session.user.name || session.user.id)} alt={session.user.name || 'User'} size="sm" className="mt-1" />}
                    </div>
                  ))}
                  {isChatLoading && (
                      <div className="flex items-start space-x-2.5">
                          <Avatar src={generateAvatar('AI_Tutor_Bot_Typing')} alt="AI Typing" size="sm" className="mt-1" />
                          <div className="p-3 rounded-xl bg-slate-200 text-slate-600 animate-pulse shadow-sm rounded-bl-none">
                              <p className="text-sm">AI assistant is typing...</p>
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
                    {promptStreak?.bestStreak > 0 && (
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

        <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark Task as Complete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark this task as complete? You'll be automatically directed to the next task.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCompleteSubtask} className="bg-green-600 hover:bg-green-700 text-white">
                {isLoading ? 'Completing...' : 'Mark as Complete'}
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
      </div>
    </MainLayout>
  );
} 