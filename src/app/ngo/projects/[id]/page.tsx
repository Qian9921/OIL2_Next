"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getProject, getParticipations, updateProject } from "@/lib/firestore";
import { Project, Participation } from "@/lib/types";
import { generateAvatar, getStatusColor, getDifficultyColor, calculateEstimatedHours } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  Tag,
  Target,
  Settings,
  Edit,
  Eye,
  BarChart3,
  CheckCircle,
  Calendar,
  Award,
  TrendingUp,
  BookOpen
} from "lucide-react";
import Link from "next/link";

export default function NGOProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProjectData();
    }
  }, [params.id]);

  const loadProjectData = async () => {
    try {
      const [projectData, participationData] = await Promise.all([
        getProject(params.id as string),
        getParticipations({ projectId: params.id as string })
      ]);
      
      setProject(projectData);
      setParticipations(participationData);
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: Project['status']) => {
    if (!project) return;
    
    setIsUpdating(true);
    try {
      await updateProject(project.id, { status: newStatus });
      setProject({ ...project, status: newStatus });
    } catch (error) {
      console.error("Error updating project status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getProgressStats = () => {
    if (participations.length === 0) return { averageProgress: 0, completionRate: 0 };
    
    const totalProgress = participations.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress = Math.round(totalProgress / participations.length);
    const completedCount = participations.filter(p => p.status === 'completed').length;
    const completionRate = Math.round((completedCount / participations.length) * 100);
    
    return { averageProgress, completionRate };
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading project details..." />
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">Please check if the project ID is correct</p>
          <Link href="/ngo/projects">
            <Button>Back to Project List</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Check if current user is the owner
  const isOwner = session?.user?.id === project.ngoId;
  if (!isOwner) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to view this project</p>
          <Link href="/ngo/projects">
            <Button>Back to Project List</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const { averageProgress, completionRate } = getProgressStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/ngo/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Project List
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-2">
                Project Details and Management 📊
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link href={`/ngo/projects/${project.id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            </Link>
            <Link href={`/projects/${project.id}`}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span>Project Information</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                      {project.status === 'draft' ? 'Draft' :
                       project.status === 'published' ? 'Published' :
                       project.status === 'completed' ? 'Completed' : 'Archived'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(project.difficulty)}`}>
                      {project.difficulty === 'beginner' ? 'Beginner' :
                       project.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Project Description</h4>
                  <p className="text-gray-700">{project.description}</p>
                </div>

                {project.shortDescription && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Short Description</h4>
                    <p className="text-gray-700">{project.shortDescription}</p>
                  </div>
                )}

                {/* Project Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-600">
                      {project.currentParticipants}
                    </div>
                    <div className="text-xs text-gray-600">Participants</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-600">
                      {calculateEstimatedHours(project) > 0 
                        ? `${calculateEstimatedHours(project)} hours (est.)`
                        : 'TBD'
                      }
                    </div>
                    <div className="text-xs text-gray-600">Estimated Hours</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-purple-600">
                      {project.subtasks?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Subtasks</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-amber-600">
                      {project.deadline 
                        ? project.deadline.toDate().toLocaleDateString() 
                        : 'No deadline'}
                    </div>
                    <div className="text-xs text-gray-600">Deadline</div>
                  </div>
                </div>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Project Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {project.requirements && project.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Participation Requirements</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {project.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Learning Goals */}
                {project.learningGoals && project.learningGoals.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Learning Goals</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {project.learningGoals.map((goal, index) => (
                        <li key={index}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subtasks */}
            {project.subtasks && project.subtasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <span>Project Tasks</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.subtasks.map((subtask, index) => (
                      <div key={subtask.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-2">
                              {index + 1}. {subtask.title}
                            </h5>
                            <p className="text-gray-600 text-sm mb-2">
                              {subtask.description}
                            </p>
                            {subtask.estimatedHours && (
                              <p className="text-xs text-gray-500">
                                Estimated Duration: {subtask.estimatedHours} hours
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span>Project Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {/* Draft button - always available for draft projects */}
                  <Button
                    key="draft"
                    variant={project.status === 'draft' ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleStatusChange('draft')}
                    disabled={isUpdating || project.status === 'published' || project.status === 'completed' || project.status === 'archived'}
                    title={project.status !== 'draft' ? "Published projects cannot return to draft status" : "Save as draft"}
                  >
                    Draft
                  </Button>
                  
                  {/* Publish button - only available for draft projects */}
                  <Button
                    key="published"
                    variant={project.status === 'published' ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleStatusChange('published')}
                    disabled={isUpdating || project.status === 'completed' || project.status === 'archived'}
                    title={project.status === 'completed' || project.status === 'archived' ? 
                      "Completed or archived projects cannot be republished" : 
                      "Publish project to make it available to students"}
                  >
                    Publish
                  </Button>
                  
                  {/* Note: No manual completion button - this happens automatically when deadline is reached */}
                  <div className="px-4 py-2 text-sm text-gray-600 bg-blue-50 rounded-md">
                    <p><strong>Note:</strong> Projects are automatically marked as completed when their deadline is reached.</p>
                  </div>
                  
                  {/* Archive button - only available for completed projects */}
                  <Button
                    key="archived"
                    variant={project.status === 'archived' ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleStatusChange('archived')}
                    disabled={isUpdating || project.status !== 'completed'}
                    title={project.status !== 'completed' ? 
                      "Only completed projects can be archived" : 
                      "Archive this completed project"}
                  >
                    Archive
                  </Button>
                </div>
                
                {/* Status transitions explainer */}
                <div className="mt-4 p-3 text-xs text-gray-600 bg-gray-50 rounded-md">
                  <p className="font-medium mb-1">Project Lifecycle:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Draft → Published: Make available to students</li>
                    <li>Published → Completed: Automatic when deadline is reached</li>
                    <li>Completed → Archived: Remove from active projects</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Project Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span>Project Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {participations.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Participants</div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {completionRate}%
                  </div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {averageProgress}%
                  </div>
                  <div className="text-sm text-gray-600">Average Progress</div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Participants */}
            {participations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Recent Participants</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participations.slice(0, 5).map((participation) => (
                      <div key={participation.id} className="flex items-center space-x-3">
                        <Avatar
                          src={generateAvatar(participation.studentId)}
                          alt={participation.studentName}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {participation.studentName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Progress: {participation.progress}%
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(participation.status)}`}>
                          {participation.status === 'active' ? 'Active' :
                           participation.status === 'completed' ? 'Completed' : 'Other'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Creation Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Creation Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created At: {project.createdAt.toDate().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Updated At: {project.updatedAt.toDate().toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 