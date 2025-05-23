"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getParticipations, getProject, updateParticipation, createSubmission, deleteParticipation, getSubmissions, handleRejectedProject } from "@/lib/firestore";
import { Project, Participation, Submission } from "@/lib/types";
import { generateAvatar, getStatusColor, getDifficultyColor } from "@/lib/utils";
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
  Star
} from "lucide-react";
import Link from "next/link";

interface ProjectWithDetails extends Participation {
  project: Project;
  submission?: Submission;
}

export default function StudentMyProjectsPage() {
  const { data: session } = useSession();
  const [projectsWithDetails, setProjectsWithDetails] = useState<ProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingSubtask, setUpdatingSubtask] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState<{[key: string]: string}>({});
  const [submittingProject, setSubmittingProject] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [leavingProject, setLeavingProject] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadMyProjects();
    }
  }, [session]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadMyProjects = async () => {
    try {
      const participations = await getParticipations({ studentId: session!.user!.id });
      
      const projectsWithDetails: ProjectWithDetails[] = [];
      for (const participation of participations) {
        const project = await getProject(participation.projectId);
        if (project) {
          // Get submission for this participation
          const submissions = await getSubmissions({ participationId: participation.id });
          const latestSubmission = submissions.length > 0 ? submissions[0] : undefined;
          
          projectsWithDetails.push({
            ...participation,
            project,
            submission: latestSubmission
          });
        }
      }
      
      setProjectsWithDetails(projectsWithDetails);
    } catch (error) {
      console.error("Error loading my projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSubtask = async (participationId: string, subtaskId: string) => {
    setUpdatingSubtask(subtaskId);
    
    try {
      const participation = projectsWithDetails.find(p => p.id === participationId);
      if (!participation) return;

      const newCompletedSubtasks = [...participation.completedSubtasks, subtaskId];
      const totalSubtasks = participation.project.subtasks.length;
      const newProgress = Math.round((newCompletedSubtasks.length / totalSubtasks) * 100);
      
      // If all subtasks are completed, keep status as active but allow submission
      await updateParticipation(participationId, {
        completedSubtasks: newCompletedSubtasks,
        progress: newProgress
      });

      await loadMyProjects();
      setFeedback({ message: "Subtask completed successfully!", type: 'success' });
    } catch (error) {
      console.error("Error completing subtask:", error);
      setFeedback({ message: "Error completing subtask. Please try again.", type: 'error' });
    } finally {
      setUpdatingSubtask(null);
    }
  };

  const handleSubmitProject = async (participation: ProjectWithDetails) => {
    const content = submissionContent[participation.id];
    if (!content?.trim()) {
      setFeedback({ message: "Please write a submission summary before submitting.", type: 'error' });
      return;
    }

    setSubmittingProject(participation.id);
    
    try {
      // Create submission
      await createSubmission({
        participationId: participation.id,
        projectId: participation.projectId,
        studentId: participation.studentId,
        studentName: session?.user?.name || 'Student',
        content: content.trim(),
        status: 'pending'
      });

      // Update participation status to completed
      await updateParticipation(participation.id, {
        status: 'completed',
        completedAt: Timestamp.now()
      });

      await loadMyProjects();
      setSubmissionContent(prev => ({ ...prev, [participation.id]: '' }));
      setFeedback({ message: "Project submitted successfully! Your teacher will review it soon.", type: 'success' });
    } catch (error) {
      console.error("Error submitting project:", error);
      setFeedback({ message: "Error submitting project. Please try again.", type: 'error' });
    } finally {
      setSubmittingProject(null);
    }
  };

  const handleLeaveProject = async (participation: ProjectWithDetails) => {
    if (!confirm(`Are you sure you want to leave "${participation.project.title}"? Your progress will be lost.`)) {
      return;
    }

    setLeavingProject(participation.id);
    
    try {
      await deleteParticipation(participation.id);
      await loadMyProjects();
      setFeedback({ message: "Successfully left the project.", type: 'success' });
    } catch (error) {
      console.error("Error leaving project:", error);
      setFeedback({ message: "Error leaving project. Please try again.", type: 'error' });
    } finally {
      setLeavingProject(null);
    }
  };

  const handleRejectedProjectExit = async (participation: ProjectWithDetails) => {
    if (!confirm(`Your submission for "${participation.project.title}" was rejected. You will be removed from this project. This action cannot be undone.`)) {
      return;
    }

    setLeavingProject(participation.id);
    
    try {
      await handleRejectedProject(participation.id);
      await loadMyProjects();
      setFeedback({ message: "You have been removed from the project.", type: 'success' });
    } catch (error) {
      console.error("Error handling rejected project:", error);
      setFeedback({ message: "Error removing you from project. Please try again.", type: 'error' });
    } finally {
      setLeavingProject(null);
    }
  };

  const getProjectStats = () => {
    const activeProjects = projectsWithDetails.filter(p => p.status === 'active').length;
    const completedProjects = projectsWithDetails.filter(p => p.status === 'completed').length;
    const totalProgress = projectsWithDetails.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress = projectsWithDetails.length > 0 ? Math.round(totalProgress / projectsWithDetails.length) : 0;

    return { activeProjects, completedProjects, averageProgress };
  };

  const canSubmitProject = (participation: ProjectWithDetails) => {
    // Can submit if:
    // 1. Project is active and 100% complete and no submission exists
    // 2. Project has a submission that needs revision
    return (
      (participation.status === 'active' && participation.progress === 100 && !participation.submission) ||
      (participation.submission?.status === 'needs_revision')
    );
  };

  const canResubmit = (participation: ProjectWithDetails) => {
    return participation.submission?.status === 'needs_revision';
  };

  const getSubmissionStatusDisplay = (submission: Submission) => {
    switch (submission.status) {
      case 'pending':
        return { text: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: 'Clock' };
      case 'approved':
        return { text: 'Approved', color: 'bg-green-100 text-green-800', icon: 'CheckCircle' };
      case 'rejected':
        return { text: 'Rejected', color: 'bg-red-100 text-red-800', icon: 'XCircle' };
      case 'needs_revision':
        return { text: 'Needs Revision', color: 'bg-orange-100 text-orange-800', icon: 'AlertCircle' };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: 'Circle' };
    }
  };

  const stats = getProjectStats();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
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

        {/* Feedback Message */}
        {feedback && (
          <div className={`p-4 rounded-lg border ${
            feedback.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {feedback.message}
            </div>
          </div>
        )}

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

        {/* Projects List */}
        {projectsWithDetails.length > 0 ? (
          <div className="space-y-6">
            {projectsWithDetails.map((projectWithDetails) => {
              const { project } = projectWithDetails;
              const completedSubtasks = projectWithDetails.completedSubtasks.length;
              const totalSubtasks = project.subtasks.length;
              const progressPercentage = projectWithDetails.progress;

              return (
                <Card key={projectWithDetails.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{project.title}</CardTitle>
                        <div className="flex items-center space-x-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(projectWithDetails.status)}`}>
                            {projectWithDetails.status === 'active' ? 'In Progress' :
                             projectWithDetails.status === 'completed' ? 'Completed' :
                             projectWithDetails.status === 'dropped' ? 'Dropped' : 'Pending Approval'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(project.difficulty)}`}>
                            {project.difficulty === 'beginner' ? 'Beginner' :
                             project.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
                          </span>
                          {projectWithDetails.status === 'completed' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Award className="w-3 h-3 mr-1 inline" />
                              Certificate Available
                            </span>
                          )}
                          {/* Submission Status */}
                          {projectWithDetails.submission && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubmissionStatusDisplay(projectWithDetails.submission).color}`}>
                              {projectWithDetails.submission.status === 'pending' && <Clock className="w-3 h-3 mr-1 inline" />}
                              {projectWithDetails.submission.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                              {projectWithDetails.submission.status === 'rejected' && <XCircle className="w-3 h-3 mr-1 inline" />}
                              {projectWithDetails.submission.status === 'needs_revision' && <AlertCircle className="w-3 h-3 mr-1 inline" />}
                              {getSubmissionStatusDisplay(projectWithDetails.submission).text}
                            </span>
                          )}
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

                  <CardContent className="space-y-6">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Progress: {completedSubtasks}/{totalSubtasks} tasks
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

                    {/* Project Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{project.currentParticipants} participants</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{project.estimatedHours || 'TBD'} hours</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Target className="w-4 h-4" />
                        <span>{totalSubtasks} tasks</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {projectWithDetails.joinedAt.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Subtasks */}
                    {project.subtasks.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Project Tasks</h4>
                        <div className="space-y-3">
                          {project.subtasks.map((subtask, index) => {
                            const isCompleted = projectWithDetails.completedSubtasks.includes(subtask.id);
                            const canComplete = projectWithDetails.status === 'active' && !isCompleted;

                            return (
                              <div
                                key={subtask.id}
                                className={`p-4 rounded-lg border transition-all ${
                                  isCompleted 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 mt-1">
                                    {isCompleted ? (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className={`font-medium ${isCompleted ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                                      {subtask.title}
                                    </h5>
                                    <p className={`text-sm mt-1 ${isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                                      {subtask.description}
                                    </p>
                                    {subtask.estimatedHours && (
                                      <p className="text-xs text-gray-500 mt-2">
                                        Estimated: {subtask.estimatedHours} hours
                                      </p>
                                    )}
                                  </div>
                                  {canComplete && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleCompleteSubtask(projectWithDetails.id, subtask.id)}
                                      disabled={updatingSubtask === subtask.id}
                                    >
                                      {updatingSubtask === subtask.id ? (
                                        <div className="loading-spinner" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Complete
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Teacher Feedback */}
                    {projectWithDetails.submission && projectWithDetails.submission.reviewComment && (
                      <div className={`p-4 rounded-lg border ${
                        projectWithDetails.submission.status === 'approved' ? 'bg-green-50 border-green-200' :
                        projectWithDetails.submission.status === 'rejected' ? 'bg-red-50 border-red-200' :
                        projectWithDetails.submission.status === 'needs_revision' ? 'bg-orange-50 border-orange-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <h4 className={`font-medium mb-2 flex items-center ${
                          projectWithDetails.submission.status === 'approved' ? 'text-green-900' :
                          projectWithDetails.submission.status === 'rejected' ? 'text-red-900' :
                          projectWithDetails.submission.status === 'needs_revision' ? 'text-orange-900' :
                          'text-blue-900'
                        }`}>
                          <FileText className="w-5 h-5 mr-2" />
                          Teacher Feedback
                        </h4>
                        <p className={`text-sm ${
                          projectWithDetails.submission.status === 'approved' ? 'text-green-800' :
                          projectWithDetails.submission.status === 'rejected' ? 'text-red-800' :
                          projectWithDetails.submission.status === 'needs_revision' ? 'text-orange-800' :
                          'text-blue-800'
                        }`}>
                          {projectWithDetails.submission.reviewComment}
                        </p>
                        {projectWithDetails.submission.rating && projectWithDetails.submission.status === 'approved' && (
                          <div className="flex items-center mt-2">
                            <span className="text-sm text-green-700 mr-2">Rating:</span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < (projectWithDetails.submission?.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejected Project Action */}
                    {projectWithDetails.submission && projectWithDetails.submission.status === 'rejected' && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-medium text-red-900 mb-2 flex items-center">
                          <XCircle className="w-5 h-5 mr-2" />
                          Project Rejected
                        </h4>
                        <p className="text-red-800 text-sm mb-3">
                          Your submission has been rejected. You will need to leave this project to join other projects.
                        </p>
                        <Button
                          onClick={() => handleRejectedProjectExit(projectWithDetails)}
                          disabled={leavingProject === projectWithDetails.id}
                          variant="destructive"
                        >
                          {leavingProject === projectWithDetails.id ? (
                            <div className="w-4 h-4 mr-2 loading-spinner" />
                          ) : (
                            <LogOut className="w-4 h-4 mr-2" />
                          )}
                          {leavingProject === projectWithDetails.id ? 'Removing...' : 'Accept and Leave Project'}
                        </Button>
                      </div>
                    )}

                    {/* Project Submission Form */}
                    {canSubmitProject(projectWithDetails) && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                          <FileText className="w-5 h-5 mr-2" />
                          {canResubmit(projectWithDetails) ? 'Resubmit Your Project' : 'Submit Your Project'}
                        </h4>
                        <p className="text-blue-800 text-sm mb-3">
                          {canResubmit(projectWithDetails) 
                            ? 'Please address the teacher\'s feedback and resubmit your work.'
                            : 'Congratulations! You\'ve completed all tasks. Please write a summary of your work and submit for teacher review.'
                          }
                        </p>
                        <textarea
                          value={submissionContent[projectWithDetails.id] || ''}
                          onChange={(e) => setSubmissionContent(prev => ({
                            ...prev,
                            [projectWithDetails.id]: e.target.value
                          }))}
                          className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                          placeholder="Describe what you learned, challenges you faced, and outcomes you achieved..."
                        />
                        <Button
                          onClick={() => handleSubmitProject(projectWithDetails)}
                          disabled={submittingProject === projectWithDetails.id}
                          className="mt-3 bg-blue-600 hover:bg-blue-700"
                        >
                          {submittingProject === projectWithDetails.id ? (
                            <div className="w-4 h-4 mr-2 loading-spinner" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {submittingProject === projectWithDetails.id ? 'Submitting...' : (canResubmit(projectWithDetails) ? 'Resubmit Project' : 'Submit Project')}
                        </Button>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                      <Link href={`/projects/${project.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <BookOpen className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      {projectWithDetails.status === 'active' && progressPercentage < 100 && projectWithDetails.submission?.status !== 'rejected' && (
                        <Button className="flex-1">
                          <Play className="w-4 h-4 mr-2" />
                          Continue Learning
                        </Button>
                      )}
                      {projectWithDetails.status === 'active' && projectWithDetails.submission?.status !== 'rejected' && (
                        <Button
                          variant="destructive"
                          onClick={() => handleLeaveProject(projectWithDetails)}
                          disabled={leavingProject === projectWithDetails.id}
                          className="flex-shrink-0"
                        >
                          {leavingProject === projectWithDetails.id ? (
                            <div className="w-4 h-4 mr-2 loading-spinner" />
                          ) : (
                            <LogOut className="w-4 h-4 mr-2" />
                          )}
                          {leavingProject === projectWithDetails.id ? 'Leaving...' : 'Leave'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                You haven't joined any projects yet
              </h3>
              <p className="text-gray-600 mb-6">
                Browse and join interesting social impact projects to start your learning journey!
              </p>
              <Link href="/student/projects">
                <Button>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Projects
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 