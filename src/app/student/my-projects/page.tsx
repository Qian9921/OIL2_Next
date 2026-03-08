"use client";

import React, { useEffect, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterShell } from "@/components/ui/filter-shell";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { getParticipations, getProject, updateParticipation, createSubmission, deleteParticipation, getSubmissions, handleRejectedProject, getCertificates } from "@/lib/firestore";
import { Project, Participation, Submission, Subtask, Certificate } from "@/lib/types";
import { generateAvatar, getStatusColor, getDifficultyColor, calculateEstimatedHours, formatDeadline, isProjectExpired } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import { LoadingState } from "@/components/ui/loading-state";
import { ProjectCard } from "@/components/project/project-card";
import { 
  BookOpen, 
  Users, 
  Clock, 
  Tag,
  TrendingUp,
  CheckCircle,
  Circle,
  Target,
  Award,
  ArrowRight,
  BarChart3,
  Play,
  Calendar,
  FileText,
  Send,
  AlertCircle,
  LogOut,
  XCircle,
  Star,
  Loader2,
  ListFilter,
  Github,
  SendHorizonal,
  RefreshCw,
  BookmarkX,
  ListChecks,
  PartyPopper,
  Eye,
  Download
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { GITHUB_SUBMISSION_SUBTASK_ID } from "@/lib/constants";
import Confetti from 'react-confetti';
import { useWindowSize } from '../../../hooks/use-window-size';
import { SubmitProjectDialog } from '@/components/project/submit-project-dialog';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge, getSubmissionStatusBadge } from '@/components/ui/status-badge';

interface ProjectWithDetails extends Participation {
  project: Project;
  submission?: Submission;
  nextSubtask?: Subtask;
  studentGitHubRepo?: string;
}

type ProjectFilter = "active" | "completed" | "action_required" | "rejected";

export default function StudentMyProjectsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [projectsWithDetails, setProjectsWithDetails] = useState<ProjectWithDetails[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingSubtask, setUpdatingSubtask] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState<{[key: string]: string}>({});
  const [submittingProject, setSubmittingProject] = useState<string | null>(null);
  const [leavingProject, setLeavingProject] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("active");
  const [selectedProjectToLeave, setSelectedProjectToLeave] = useState<{id: string, title: string} | null>(null);
  const [selectedRejectedProject, setSelectedRejectedProject] = useState<{id: string, title: string} | null>(null);
  const [projectToSubmit, setProjectToSubmit] = useState<ProjectWithDetails | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (session?.user?.id) {
      loadMyProjects();
    }
  }, [session]);

  const loadMyProjects = async () => {
    setIsLoading(true);
    try {
      const participations = await getParticipations({ studentId: session!.user!.id });
      
      const loadedProjects: ProjectWithDetails[] = [];
      for (const participation of participations) {
        const project = await getProject(participation.projectId);
        if (project) {
          const submissions = await getSubmissions({ participationId: participation.id });
          const latestSubmission = submissions.length > 0 ? submissions[0] : undefined;
          
          let nextSubtask: Subtask | undefined = undefined;
          if (participation.status === 'active') {
            const sortedSubtasks = [...project.subtasks].sort((a, b) => a.order - b.order);
            nextSubtask = sortedSubtasks.find(st => !participation.completedSubtasks?.includes(st.id));
          }
          
          loadedProjects.push({
            ...participation,
            project,
            submission: latestSubmission,
            nextSubtask
          });
        }
      }
      
      // Load certificates
      const studentCertificates = await getCertificates({ studentId: session!.user!.id });
      setCertificates(studentCertificates);
      
      setProjectsWithDetails(loadedProjects);
    } catch (error) {
      console.error("Error loading my projects:", error);
      toast({ title: "Error", description: "Failed to load your projects. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const pollEvaluationUntilComplete = async (evaluationId: string) => {
    const maxAttempts = 40;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/evaluate-proxy?evaluationId=${evaluationId}&timeoutMs=15000&pollIntervalMs=3000`, {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to fetch evaluation status');
      }

      if (response.status !== 202 && typeof result.score === 'number') {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error('Evaluation is still processing. Please try again in a moment.');
  };

  const handleCompleteSubtask = async (participationId: string, subtaskId: string) => {
    setUpdatingSubtask(subtaskId);
    
    try {
      const participation = projectsWithDetails.find(p => p.id === participationId);
      if (!participation) return;

      const currentSubtaskIndex = participation.project.subtasks.findIndex(st => st.id === subtaskId);
      if (currentSubtaskIndex > 0) {
        const previousSubtask = participation.project.subtasks[currentSubtaskIndex - 1];
        if (!participation.completedSubtasks?.includes(previousSubtask.id)) {
          toast({ title: "Sequence Error", description: "Please complete previous tasks first.", variant: "destructive" });
          setUpdatingSubtask(null);
          return;
        }
      }
      
      // Get the current task details
      const currentTask = participation.project.subtasks.find(st => st.id === subtaskId);
      if (!currentTask) {
        toast({ title: "Error", description: "Task not found.", variant: "destructive" });
        setUpdatingSubtask(null);
        return;
      }
      
      // Make API call to evaluate the task completion
      try {
        const response = await fetch('/api/evaluate-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectDetail: participation.project.title,
            tasks: participation.project.subtasks.map(st => st.title),
            currentTask: currentTask.title,
            githubRepoUrl: participation.studentGitHubRepo || "",
            evidence: currentTask.description || "Task completion criteria",
            youtubeLink: null,
            waitForResult: true
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        let result = await response.json();

        if (response.status === 202 && result.evaluationId) {
          toast({
            title: 'Evaluation in Progress',
            description: "We're still reviewing your work. Please wait a little longer…",
            variant: 'default'
          });
          result = await pollEvaluationUntilComplete(result.evaluationId);
        }

        // Convert score from 0-1 range to 0-100% range if needed
        let finalScore = result.score;
        if (typeof result.score === 'number' && result.score <= 1) {
          finalScore = Math.round(result.score * 100);
          console.log(`Converting score: ${result.score} (0-1 range) -> ${finalScore}% (0-100 range)`);
        }
        
        // Check if the score meets the threshold (80%)
        if (finalScore < 80) {
          toast({ 
            title: "Task Incomplete", 
            description: `Your work does not meet the required criteria (${finalScore}%). Please review and try again.`, 
            variant: "destructive" 
          });
          setUpdatingSubtask(null);
          return;
        }
      } catch (apiError) {
        console.error("Error evaluating task:", apiError);
        toast({ 
          title: "Evaluation Error", 
          description: "We couldn't evaluate your work. Please try again later.", 
          variant: "destructive" 
        });
        setUpdatingSubtask(null);
        return;
      }

      // If evaluation passed, continue with marking the task complete
      const newCompletedSubtasks = [...(participation.completedSubtasks || []), subtaskId];
      const totalSubtasks = participation.project.subtasks.length;
      const newProgress = Math.round((newCompletedSubtasks.length / totalSubtasks) * 100);
      
      await updateParticipation(participationId, {
        completedSubtasks: newCompletedSubtasks,
        progress: newProgress
      });

      await loadMyProjects();
      toast({ title: "Task Completed", description: "Subtask marked as complete!", variant: "default" });
    } catch (error) {
      console.error("Error completing subtask:", error);
      toast({ title: "Error", description: "Failed to complete subtask. Please try again.", variant: "destructive" });
    } finally {
      setUpdatingSubtask(null);
    }
  };

  const openSubmitDialog = (participation: ProjectWithDetails) => {
    setProjectToSubmit(participation);
  };

  const confirmAndLeaveProject = (participationId: string, projectTitle: string) => {
    // Dialog is now handled by the AlertDialog component
    setSelectedProjectToLeave({id: participationId, title: projectTitle});
  };

  const handleLeaveProjectAction = async (participationId: string) => {
    setLeavingProject(participationId);
    try {
      await deleteParticipation(participationId);
      await loadMyProjects();
      toast({ title: "Project Left", description: "You have successfully left the project.", variant: "default" });
    } catch (error) {
      console.error("Error leaving project:", error);
      toast({ title: "Error", description: "Failed to leave project. Please try again.", variant: "destructive" });
    } finally {
      setLeavingProject(null);
      setSelectedProjectToLeave(null);
    }
  };
  
  const confirmAndHandleRejectedProjectExit = (participationId: string, projectTitle: string) => {
    // Dialog is now handled by the AlertDialog component
    setSelectedRejectedProject({id: participationId, title: projectTitle});
  };

  const handleRejectedProjectExitAction = async (participationId: string) => {
    setLeavingProject(participationId);
    try {
      await handleRejectedProject(participationId);
      await loadMyProjects();
      toast({ title: "Removed from Project", description: "You have been removed from the project.", variant: "default" });
    } catch (error) {
      console.error("Error handling rejected project:", error);
      toast({ title: "Error", description: "Failed to remove you from the project. Please try again.", variant: "destructive" });
    } finally {
      setLeavingProject(null);
      setSelectedRejectedProject(null);
    }
  };

  const getProjectStats = () => {
    const allActiveParticipations = projectsWithDetails.filter(p => p.status === 'active' && p.submission?.status !== 'rejected' && p.submission?.status !== 'needs_revision');
    const activeProjectsCount = allActiveParticipations.length;
    
    const completedProjectsCount = projectsWithDetails.filter(p => p.status === 'completed' || p.submission?.status === 'approved').length;
    
    // Calculate average progress only for active projects
    const totalProgressOfActiveProjects = allActiveParticipations.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress = allActiveParticipations.length > 0 
      ? Math.round(totalProgressOfActiveProjects / allActiveParticipations.length) 
      : 0;

    return { activeProjects: activeProjectsCount, completedProjects: completedProjectsCount, averageProgress };
  };

  const canSubmitProject = (participation: ProjectWithDetails) => {
    return (
      (participation.status === 'active' && participation.progress === 100 && !participation.submission) ||
      (participation.submission?.status === 'needs_revision')
    );
  };

  const canResubmit = (participation: ProjectWithDetails) => {
    return participation.submission?.status === 'needs_revision';
  };

  const handleContinueLearning = (projectWithDetails: ProjectWithDetails) => {
    if (projectWithDetails.status === 'active' && projectWithDetails.nextSubtask) {
      router.push(`/projects/${projectWithDetails.projectId}/task/${projectWithDetails.nextSubtask.id}`);
    } else if (canSubmitProject(projectWithDetails)) {
      toast({ title: "Ready to Submit", description: "Please complete the submission form below.", variant: "default" });
    } else {
      router.push(`/projects/${projectWithDetails.projectId}`);
    }
  };

  // Function to navigate to the task list page
  const handleViewTasks = (projectWithDetails: ProjectWithDetails) => {
    if (projectWithDetails.project.subtasks && projectWithDetails.project.subtasks.length > 0) {
      // Sort subtasks by order to get the first one
      const sortedSubtasks = [...projectWithDetails.project.subtasks].sort((a, b) => a.order - b.order);
      const firstSubtask = sortedSubtasks[0];
      
      router.push(`/projects/${projectWithDetails.projectId}/task/${firstSubtask.id}`);
    } else {
      // Fallback to project page if no subtasks
      router.push(`/projects/${projectWithDetails.projectId}`);
    }
  };

  const filteredAndSortedProjects = projectsWithDetails
    .filter(p => {
      switch (activeFilter) {
        case "active":
          return p.status === 'active' && p.submission?.status !== 'rejected' && p.submission?.status !== 'needs_revision';
        case "completed":
          return p.status === 'completed' || p.submission?.status === 'approved';
        case "action_required":
          return p.submission?.status === 'needs_revision';
        case "rejected":
          return p.submission?.status === 'rejected';
        default:
          return true;
      }
    })
    .sort((a, b) => b.joinedAt.toMillis() - a.joinedAt.toMillis());

  const stats = getProjectStats();

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading projects data..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Confetti celebration when project is submitted */}
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={800}
            gravity={0.15}
          />
        )}
        
        {/* AlertDialog for leaving a project */}
        <AlertDialog open={!!selectedProjectToLeave} onOpenChange={(open) => !open && setSelectedProjectToLeave(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave "{selectedProjectToLeave?.title}"? Your current progress on this project will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => selectedProjectToLeave && handleLeaveProjectAction(selectedProjectToLeave.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {leavingProject ? 'Leaving...' : 'Leave Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog for rejected project exit */}
        <AlertDialog open={!!selectedRejectedProject} onOpenChange={(open) => !open && setSelectedRejectedProject(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Project Rejected</AlertDialogTitle>
              <AlertDialogDescription>
                Your submission for "{selectedRejectedProject?.title}" was rejected. You will be removed from this project. Are you sure? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => selectedRejectedProject && handleRejectedProjectExitAction(selectedRejectedProject.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {leavingProject ? 'Removing...' : 'Accept and Leave Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Replace the submission dialog with the reusable component */}
        <SubmitProjectDialog 
          project={projectToSubmit?.project || null}
          participation={projectToSubmit}
          showDialog={!!projectToSubmit}
          setShowDialog={(show) => !show && setProjectToSubmit(null)}
          onSuccess={() => {
            // Show confetti celebration
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
            
            toast({ 
              title: "🎉 Project Submitted!", 
              description: "Your project has been submitted for review. Great job!",
              variant: "default" 
            });
            
            // Reload projects
            loadMyProjects();
          }}
          hideFloatingButton={true}
        />

        <PageHero
          eyebrow="Student workspace"
          icon={BookOpen}
          title="My Projects"
          description="Track your learning progress, continue active work, and move smoothly from evaluation feedback into focused Tutor guidance."
          actions={
            <>
              <Link href="/student/certificates">
                <Button variant="outline">
                  <Award className="w-4 h-4 mr-2" />
                  My Certificates ({certificates.length})
                </Button>
              </Link>
              <Link href="/student/projects">
                <Button>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse More Projects
                </Button>
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active Projects" value={stats.activeProjects} icon={Play} tone="blue" hint="Projects you can keep working on right now." />
          <StatTile label="Completed Projects" value={stats.completedProjects} icon={CheckCircle} tone="green" hint="Projects you finished and submitted successfully." />
          <Link href="/student/certificates">
            <div className="h-full">
              <StatTile label="Earned Certificates" value={certificates.length} icon={Award} tone="amber" hint="Open your certificates and download them anytime." />
            </div>
          </Link>
          <StatTile label="Average Progress" value={`${stats.averageProgress}%`} icon={BarChart3} tone="purple" hint="How far your active projects have progressed overall." />
        </div>

        <Card className="relative overflow-hidden border-white/70 bg-white/85 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-rose-100/45 via-transparent to-transparent" />
          <CardContent className="relative flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Momentum snapshot</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {stats.activeProjects > 0
                  ? `You have ${stats.activeProjects} active project${stats.activeProjects > 1 ? "s" : ""} in motion.`
                  : "You’re ready to start your next high-impact project."}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Use the action-focused filters below to jump straight into active work, review requests, and completed project outcomes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[28rem]">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Needs Action</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {projectsWithDetails.filter((project) => project.submission?.status === 'needs_revision').length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Certificates</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{certificates.length}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Completed Tasks</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {projectsWithDetails.reduce((sum, project) => sum + (project.completedSubtasks?.length || 0), 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Review Queue</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {projectsWithDetails.filter((project) => project.submission?.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <FilterShell
          title="Project views"
          description="Switch between active work, completed projects, and items that need your attention."
          icon={ListChecks}
          meta={<div className="inline-flex items-center rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">{filteredAndSortedProjects.length} visible</div>}
        >
          <div className="flex flex-wrap gap-2">
          {(['active', 'completed', 'action_required', 'rejected'] as ProjectFilter[]).map((filterKey) => {
            const filterLabel = filterKey === "active" ? "Active" : 
                               filterKey === "completed" ? "Completed" : 
                               filterKey === "action_required" ? "Needs Action" :
                               "Rejected";
            const count = projectsWithDetails.filter(p => {
                switch (filterKey) {
                    case "active": return p.status === 'active' && p.submission?.status !== 'rejected' && p.submission?.status !== 'needs_revision';
                    case "completed": return p.status === 'completed' || p.submission?.status === 'approved';
                    case "action_required": return p.submission?.status === 'needs_revision';
                    case "rejected": return p.submission?.status === 'rejected';
                    default: return false;
                }
            }).length;
            return (
              <button
                key={filterKey}
                onClick={() => setActiveFilter(filterKey)}
                className={`min-w-[9rem] flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                  activeFilter === filterKey
                    ? 'border-white/80 bg-gradient-to-r from-indigo-400 to-sky-400 text-white shadow-md shadow-indigo-100/80'
                    : 'border-white/70 bg-white/70 text-gray-600 shadow-sm hover:border-white hover:bg-white hover:text-gray-900'
                }`}
              >
                <span className="block">{filterLabel}</span>
                <span className={`mt-1 block text-xs ${activeFilter === filterKey ? 'text-white/80' : 'text-slate-400'}`}>{count} items</span>
              </button>
            );
          })}
          </div>
        </FilterShell>

        {/* Projects List */}
        {filteredAndSortedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAndSortedProjects.map((projectWithDetails) => {
              const { project, submission } = projectWithDetails;
              
              // Check if this project has a certificate
              const projectCertificate = certificates.find(cert => 
                cert.participationId === projectWithDetails.id || 
                cert.projectId === projectWithDetails.projectId
              );

              // Additional info component for ProjectCard
              const additionalInfo = (
                <>
                  <ProgressBar 
                    progress={projectWithDetails.progress}
                    completedTasks={projectWithDetails.completedSubtasks?.length || 0}
                    totalTasks={project.subtasks.length}
                  />

                  <div className="flex flex-wrap gap-2 items-center mb-3">
                    {projectWithDetails.studentGitHubRepo && (
                      <Link href={projectWithDetails.studentGitHubRepo} target="_blank" rel="noopener noreferrer">
                        <StatusBadge status="github" className="hover:bg-slate-800 transition-colors" />
                      </Link>
                    )}
                    {submission && (
                      getSubmissionStatusBadge(submission)
                    )}
                    {projectWithDetails.status === 'completed' && submission?.status === 'approved' && (
                      projectCertificate ? (
                        <Link href="/student/certificates">
                          <StatusBadge status="certificate" className="cursor-pointer hover:bg-yellow-600 transition-colors" />
                        </Link>
                      ) : (
                        <StatusBadge status="certificate_pending" />
                      )
                    )}
                  </div>

                  {submission && submission.reviewComment && (
                    <div className={`p-3 rounded-lg border mt-1 text-xs ${
                      submission.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800' :
                      submission.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800' :
                      submission.status === 'needs_revision' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                      'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      <h4 className={`font-semibold mb-1 flex items-center`}>
                        <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                        Teacher Feedback:
                      </h4>
                      <p className="pl-5 line-clamp-2">
                        {submission.reviewComment}
                      </p>
                    </div>
                  )}
                </>
                              );

              // Create custom actions for the ProjectCard
              const customActions = (
                <div className="space-y-2.5">
                  {projectWithDetails.status === 'active' && projectWithDetails.nextSubtask && !isProjectExpired(project.deadline) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleContinueLearning(projectWithDetails)}
                      className="w-full bg-gradient-to-r from-indigo-400 to-sky-400 hover:from-indigo-500 hover:to-sky-500 text-white transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                  )}

                  {/* Show expired project message for active projects that are expired */}
                  {projectWithDetails.status === 'active' && isProjectExpired(project.deadline) && (
                    <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-600 font-medium">Project Expired</p>
                      <p className="text-xs text-gray-500">This project has passed its deadline</p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewTasks(projectWithDetails)}
                    className="w-full transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <ListChecks className="w-4 h-4 mr-1.5" />
                    View Task Details
                  </Button>

                  {/* Certificate Actions for Completed Projects */}
                  {projectCertificate && (
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push('/student/certificates')}
                        className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 transition-all duration-200"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        View Certificate
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push('/student/certificates')}
                        className="w-full border-green-300 text-green-700 hover:bg-green-50 transition-all duration-200"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Download Certificate
                      </Button>
                    </div>
                  )}
                  
                  {projectWithDetails.status === 'active' && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => confirmAndLeaveProject(projectWithDetails.id, project.title)}
                      className="w-full text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4 mr-1.5" />
                      Leave Project
                    </Button>
                  )}

                  {submission?.status === 'rejected' && (
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={() => confirmAndHandleRejectedProjectExit(projectWithDetails.id, project.title)}
                      className="w-full transition-all duration-200"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Accept Rejection & Leave
                    </Button>
                  )}

                  {canSubmitProject(projectWithDetails) && !isProjectExpired(project.deadline) && (
                     <Button
                        variant="default"
                        size="sm"
                        onClick={() => openSubmitDialog(projectWithDetails)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
                      >
                        <SendHorizonal className="w-4 h-4 mr-1.5" />
                        {canResubmit(projectWithDetails) ? 'Resubmit Project' : 'Submit Project for Review'}
                      </Button>
                  )}
                </div>
              );

              return (
                <ProjectCard
                  key={projectWithDetails.id}
                  project={project}
                  showJoinButton={false}
                  isExpired={isProjectExpired(project.deadline)}
                  customActions={customActions}
                  additionalContent={additionalInfo}
                  statusLabel={
                    isProjectExpired(project.deadline) ? 'Expired' :
                    projectWithDetails.status === 'active' ? 'In Progress' :
                    projectWithDetails.status === 'completed' ? (submission?.status === 'approved' ? 'Approved' : 'Submitted') :
                    projectWithDetails.status === 'dropped' ? 'Dropped' : 'Pending Action'
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-12 text-center shadow-sm backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-cyan-100">
              <BookmarkX className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No Projects Found</h3>
            <p className="mb-6 text-gray-600">You don't have any {activeFilter.replace('_', ' ')} projects yet.</p>
                 <Link href="/student/projects">
              <Button>Browse Projects</Button>
                </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 
