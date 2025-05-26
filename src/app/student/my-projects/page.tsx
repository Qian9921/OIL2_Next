"use client";

import { useEffect, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog"; // Uncommented AlertDialog imports
import { getParticipations, getProject, updateParticipation, createSubmission, deleteParticipation, getSubmissions, handleRejectedProject } from "@/lib/firestore";
import { Project, Participation, Submission, Subtask } from "@/lib/types";
import { generateAvatar, getStatusColor, getDifficultyColor, calculateEstimatedHours, formatDeadline } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
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
  BookmarkX
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { GITHUB_SUBMISSION_SUBTASK_ID } from "@/lib/constants";

interface ProjectWithDetails extends Participation {
  project: Project;
  submission?: Submission;
  nextSubtask?: Subtask;
}

type ProjectFilter = "active" | "completed" | "action_required";

export default function StudentMyProjectsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [projectsWithDetails, setProjectsWithDetails] = useState<ProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingSubtask, setUpdatingSubtask] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState<{[key: string]: string}>({});
  const [submittingProject, setSubmittingProject] = useState<string | null>(null);
  const [leavingProject, setLeavingProject] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("active");
  const [selectedProjectToLeave, setSelectedProjectToLeave] = useState<{id: string, title: string} | null>(null);
  const [selectedRejectedProject, setSelectedRejectedProject] = useState<{id: string, title: string} | null>(null);

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
            nextSubtask = sortedSubtasks.find(st => !participation.completedSubtasks.includes(st.id));
          }
          
          loadedProjects.push({
            ...participation,
            project,
            submission: latestSubmission,
            nextSubtask
          });
        }
      }
      
      setProjectsWithDetails(loadedProjects);
    } catch (error) {
      console.error("Error loading my projects:", error);
      toast({ title: "Error", description: "Failed to load your projects. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSubtask = async (participationId: string, subtaskId: string) => {
    setUpdatingSubtask(subtaskId);
    
    try {
      const participation = projectsWithDetails.find(p => p.id === participationId);
      if (!participation) return;

      const currentSubtaskIndex = participation.project.subtasks.findIndex(st => st.id === subtaskId);
      if (currentSubtaskIndex > 0) {
        const previousSubtask = participation.project.subtasks[currentSubtaskIndex - 1];
        if (!participation.completedSubtasks.includes(previousSubtask.id)) {
          toast({ title: "Sequence Error", description: "Please complete previous tasks first.", variant: "destructive" });
          setUpdatingSubtask(null);
          return;
        }
      }

      const newCompletedSubtasks = [...participation.completedSubtasks, subtaskId];
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

  const handleSubmitProject = async (participation: ProjectWithDetails) => {
    const content = submissionContent[participation.id];
    if (!content?.trim()) {
      toast({ title: "Missing Summary", description: "Please write a submission summary before submitting.", variant: "destructive" });
      return;
    }

    setSubmittingProject(participation.id);
    
    try {
      await createSubmission({
        participationId: participation.id,
        projectId: participation.projectId,
        studentId: participation.studentId,
        studentName: session?.user?.name || 'Student',
        content: content.trim(),
        status: 'pending'
      });

      await updateParticipation(participation.id, {
        status: 'completed',
        completedAt: Timestamp.now()
      });

      await loadMyProjects();
      setSubmissionContent(prev => ({ ...prev, [participation.id]: '' }));
      toast({ title: "Project Submitted", description: "Your project has been submitted for review.", variant: "default" });
    } catch (error) {
      console.error("Error submitting project:", error);
      toast({ title: "Submission Error", description: "Failed to submit project. Please try again.", variant: "destructive" });
    } finally {
      setSubmittingProject(null);
    }
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
    
    const totalProgress = projectsWithDetails.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress = projectsWithDetails.length > 0 ? Math.round(totalProgress / projectsWithDetails.length) : 0;

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

  const getSubmissionStatusDisplay = (submission?: Submission) => {
    if (!submission) return { text: 'Not Submitted', color: 'bg-gray-100 text-gray-800', icon: Circle };
    switch (submission.status) {
      case 'pending':
        return { text: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'approved':
        return { text: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'rejected':
        return { text: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle };
      case 'needs_revision':
        return { text: 'Needs Revision', color: 'bg-orange-100 text-orange-800', icon: AlertCircle };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: Circle };
    }
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

  const filteredAndSortedProjects = projectsWithDetails
    .filter(p => {
      switch (activeFilter) {
        case "active":
          return p.status === 'active' && p.submission?.status !== 'rejected' && p.submission?.status !== 'needs_revision';
        case "completed":
          return p.status === 'completed' || p.submission?.status === 'approved';
        case "action_required":
          return p.submission?.status === 'rejected' || p.submission?.status === 'needs_revision';
        default:
          return true;
      }
    })
    .sort((a, b) => b.joinedAt.toMillis() - a.joinedAt.toMillis());

  const stats = getProjectStats();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-var(--header-height,4rem))]">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-2">
              Track your learning progress and project completion 📚
            </p>
          </div>
          <Link href="/student/projects">
            <Button>
              <BookOpen className="w-4 h-4 mr-2" />
              Browse More Projects
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Play className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                  <p className="text-sm text-gray-600">Active Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedProjects}</p>
                  <p className="text-sm text-gray-600">Completed Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
                  <p className="text-sm text-gray-600">Average Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['active', 'completed', 'action_required'] as ProjectFilter[]).map((filterKey) => {
            const filterLabel = filterKey === "active" ? "Active" : filterKey === "completed" ? "Completed" : "Action Required";
            const count = projectsWithDetails.filter(p => {
                switch (filterKey) {
                    case "active": return p.status === 'active' && p.submission?.status !== 'rejected' && p.submission?.status !== 'needs_revision';
                    case "completed": return p.status === 'completed' || p.submission?.status === 'approved';
                    case "action_required": return p.submission?.status === 'rejected' || p.submission?.status === 'needs_revision';
                    default: return false;
                }
            }).length;
            return (
              <button
                key={filterKey}
                onClick={() => setActiveFilter(filterKey)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeFilter === filterKey
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filterLabel} ({count})
              </button>
            );
          })}
        </div>

        {/* Projects List */}
        {filteredAndSortedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAndSortedProjects.map((projectWithDetails) => {
              const { project, submission } = projectWithDetails;
              const completedSubtasksCount = projectWithDetails.completedSubtasks.length;
              const totalSubtasks = project.subtasks.length;
              const progressPercentage = projectWithDetails.progress;
              const submissionStatus = getSubmissionStatusDisplay(submission);
              const SubmissionIcon = submissionStatus.icon;

              return (
                <Card key={projectWithDetails.id} className="overflow-hidden flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{project.title}</CardTitle>
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(projectWithDetails.status)}`}>
                            {projectWithDetails.status === 'active' ? 'In Progress' :
                             projectWithDetails.status === 'completed' ? (submission?.status === 'approved' ? 'Approved' : 'Submitted') :
                             projectWithDetails.status === 'dropped' ? 'Dropped' : 'Pending Action'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(project.difficulty)}`}>
                            {project.difficulty === 'beginner' ? 'Beginner' :
                             project.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">
                          by {project.ngoName}
                        </p>
                      </div>
                      <Avatar
                        src={generateAvatar(project.ngoId)}
                        alt={project.ngoName}
                        size="md"
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-grow">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Progress: {completedSubtasksCount}/{totalSubtasks} tasks
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Tag section */}
                    <div className="flex flex-wrap gap-2">
                      {submission && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${submissionStatus.color} flex items-center`}>
                          <SubmissionIcon className="w-3 h-3 mr-1" />
                          {submissionStatus.text}
                        </span>
                      )}
                      {projectWithDetails.studentGitHubRepo && (
                        <Link href={projectWithDetails.studentGitHubRepo} target="_blank" rel="noopener noreferrer" className="flex items-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-white flex items-center hover:bg-gray-800">
                            <Github className="w-3 h-3 mr-1.5" />
                            GitHub Repo
                          </span>
                        </Link>
                      )}
                      {projectWithDetails.status === 'completed' && submission?.status === 'approved' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center">
                          <Award className="w-3 h-3 mr-1" />
                          Certificate
                        </span>
                      )}
                    </div>

                    {/* Project Info Section */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{project.currentParticipants} participants</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {calculateEstimatedHours(project) > 0 
                            ? `${calculateEstimatedHours(project)} hours (est.)`
                            : 'TBD hours'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Target className="w-4 h-4" />
                        <span>{totalSubtasks} tasks</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {project.deadline 
                            ? `Due ${formatDeadline(project.deadline)}` 
                            : 'No deadline'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      {projectWithDetails.status === 'active' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleContinueLearning(projectWithDetails)}
                          className="flex-1 mr-2"
                        >
                          <Play className="w-4 h-4 mr-1.5" />
                          Continue Learning
                        </Button>
                      )}
                      
                      {canSubmitProject(projectWithDetails) && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleSubmitProject(projectWithDetails)}
                          className="flex-1 mr-2"
                        >
                          <SendHorizonal className="w-4 h-4 mr-1.5" />
                          Submit Project
                        </Button>
                      )}
                      
                      {canResubmit(projectWithDetails) && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleSubmitProject(projectWithDetails)}
                          className="flex-1 mr-2"
                        >
                          <RefreshCw className="w-4 h-4 mr-1.5" />
                          Resubmit
                        </Button>
                      )}
                      
                      {projectWithDetails.status === 'active' && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => confirmAndLeaveProject(projectWithDetails.id, project.title)}
                          className="flex-1"
                        >
                          <LogOut className="w-4 h-4 mr-1.5" />
                          Leave Project
                        </Button>
                      )}
                    </div>

                    {submission && submission.reviewComment && (
                      <div className={`p-3 rounded-lg border mt-3 ${
                        submission.status === 'approved' ? 'bg-green-50 border-green-200' :
                        submission.status === 'rejected' ? 'bg-red-50 border-red-200' :
                        submission.status === 'needs_revision' ? 'bg-orange-50 border-orange-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <h4 className={`font-medium mb-1 flex items-center ${
                          submission.status === 'approved' ? 'text-green-900' :
                          submission.status === 'rejected' ? 'text-red-900' :
                          submission.status === 'needs_revision' ? 'text-orange-900' :
                          'text-blue-900'
                        } text-xs`}>
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          Teacher Feedback
                        </h4>
                        <p className={`text-xs ${
                          submission.status === 'approved' ? 'text-green-800' :
                          submission.status === 'rejected' ? 'text-red-800' :
                          submission.status === 'needs_revision' ? 'text-orange-800' :
                          'text-blue-800'
                        }`}>
                          {submission.reviewComment.length > 100 
                            ? `${submission.reviewComment.substring(0, 100)}...` 
                            : submission.reviewComment}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <BookmarkX className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
            <p className="text-gray-600 mb-6">You don't have any {activeFilter.replace('_', ' ')} projects yet.</p>
            <Link href="/student/projects">
              <Button>Browse Projects</Button>
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 