"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  createParticipation,
  getProjectViewerData,
} from "@/lib/firestore";
import { getProjectWorkspaceRoute, isStudentWorkspaceRole } from "@/lib/role-routing";
import { Project, Participation, Certificate } from "@/lib/types";
import { generateAvatar, getDifficultyColor, formatDeadline, isProjectExpired } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Tag,
  Target,
  Plus,
  CheckCircle,
  BookOpen,
  Heart,
  Award,
  AlertCircle,
  ExternalLink,
  GraduationCap,
  Clock
} from "lucide-react";
import Link from "next/link";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { FormattedText } from "@/components/ui/formatted-text";

interface ParticipantPreview {
  id: string;
  studentId: string;
  studentName: string;
  progress: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [participations, setParticipations] = useState<ParticipantPreview[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participation | null>(null);
  const [myCertificate, setMyCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProjectData();
    }
  }, [params.id, session]);

  const loadProjectData = async () => {
    try {
      const projectView = await getProjectViewerData(params.id as string);
      setProject(projectView?.project ?? null);
      setMyParticipation(projectView?.myParticipation ?? null);
      setMyCertificate(projectView?.myCertificate ?? null);

      const participantsResponse = await fetch(`/api/projects/${params.id as string}/participants`, {
        cache: "no-store",
      });
      if (participantsResponse.ok) {
        setParticipations((await participantsResponse.json()) as ParticipantPreview[]);
      } else {
        setParticipations([]);
      }
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinButtonClick = async () => {
    if (!session?.user?.id || !session?.user?.name || !project) {
      toast({ title: "Login Required", description: "Please log in first to join the project.", variant: "destructive" });
      return;
    }

    if (!isStudentWorkspaceRole(session.user.role)) {
      toast({ title: "Access Denied", description: "Only student collaborators can join projects.", variant: "destructive" });
      return;
    }

    setShowJoinDialog(true);
  };

  const handleJoinProject = async () => {
    if (!session?.user?.id || !session?.user?.name || !project) {
      setShowJoinDialog(false);
      return;
    }
    
    setIsJoining(true);
    
    try {
      await createParticipation({
        projectId: project.id,
        studentId: session.user.id,
        studentName: session.user.name,
        status: 'active',
        completedSubtasks: [],
        progress: 0
      });

      toast({
        title: "Project Joined!",
        description: "Opening this project in your action queue.",
        variant: "default"
      });
      router.push(`/student/my-projects?projectId=${project.id}`);
    } catch (error) {
      console.error("Error joining project:", error);
      toast({ title: "Join Failed", description: "Failed to join the project, please try again.", variant: "destructive" });
    } finally {
      setIsJoining(false);
      setShowJoinDialog(false);
    }
  };

  const isProjectFull = () => {
    return project?.maxParticipants && project.currentParticipants >= project.maxParticipants;
  };

  const canJoinProject = () => {
    if (!session?.user) return false;
    if (!isStudentWorkspaceRole(session.user.role)) return false;
    if (myParticipation) return false;
    if (project?.status !== 'published') return false;
    if (isProjectFull()) return false;
    if (isProjectExpired(project?.deadline)) return false; // Check if project is expired
    return true;
  };

  const calculateEstimatedHours = (subtasks: any[], difficulty: string) => {
    if (!subtasks || subtasks.length === 0) return 0;
    
    // First try to use actual estimated hours from subtasks
    const sumOfEstimatedHours = subtasks
      .filter(subtask => subtask.estimatedHours && subtask.estimatedHours > 0)
      .reduce((total, subtask) => total + subtask.estimatedHours, 0);
    
    // If we have valid estimated hours, return them
    if (sumOfEstimatedHours > 0) {
      return sumOfEstimatedHours;
    }
    
    // Otherwise fall back to calculation based on difficulty
    const hoursPerTask = 
      difficulty === 'beginner' ? 3 : 
      difficulty === 'intermediate' ? 5 : 8;
    
    return subtasks.length * hoursPerTask;
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
          <Link href={getProjectWorkspaceRoute(session?.user?.role)}>
            <Button>Back to Project List</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Join Project AlertDialog (when user has class) */}
        <AlertDialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Join Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to join "{project?.title}"? You can leave the project at any time from your My Projects page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleJoinProject} className="bg-green-600 hover:bg-green-700 text-white">
                {isJoining ? 'Joining...' : 'Join Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={getProjectWorkspaceRoute(session?.user?.role)}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-2 flex items-center">
                <GraduationCap className="w-4 h-4 mr-2" />
                Initiated by {project.ngoName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(project.difficulty)}`}>
              {project.difficulty === 'beginner' ? 'Beginner' :
               project.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
            </span>
            {isProjectExpired(project.deadline) && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                <Clock className="w-4 h-4 mr-1 inline" />
                Expired
              </span>
            )}
            {myParticipation && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-4 h-4 mr-1 inline" />
                Joined
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>Project Introduction</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.shortDescription && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <FormattedText className="text-blue-900 font-medium">
                      {project.shortDescription}
                    </FormattedText>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Project Description</h4>
                  <FormattedText className="text-gray-700 leading-relaxed">
                    {project.description}
                  </FormattedText>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {project.currentParticipants}
                      {project.maxParticipants && `/${project.maxParticipants}`}
                    </div>
                    <div className="text-xs text-gray-600">Participants</div>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {project.deadline ? formatDeadline(project.deadline) : 'No deadline'}
                    </div>
                    <div className="text-xs text-gray-600">Project Deadline</div>
                  </div>
                  <div className="text-center">
                    <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {calculateEstimatedHours(project.subtasks, project.difficulty)} hours
                    </div>
                    <div className="text-xs text-gray-600">Est. Completion Time</div>
                  </div>
                  <div className="text-center">
                    <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {project.subtasks?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Learning Tasks</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Goals */}
            {project.learningGoals && project.learningGoals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <span>Learning Goals</span>
                  </CardTitle>
                  <CardDescription>
                    After completing this project, you will master the following skills and knowledge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {project.learningGoals.map((goal, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <FormattedText className="text-gray-800 flex-1">
                          {goal}
                        </FormattedText>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Tasks */}
            {project.subtasks && project.subtasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <span>Learning Path</span>
                  </CardTitle>
                  <CardDescription>
                    Project contains {project.subtasks.length} learning tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.subtasks.map((subtask, index) => (
                      <div key={subtask.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 mb-2">
                            {subtask.title}
                          </h5>
                          <FormattedText className="text-gray-600 text-sm mb-2">
                            {subtask.description}
                          </FormattedText>
                          {subtask.estimatedHours && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              Estimated Duration: {subtask.estimatedHours} hours
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {project.requirements && project.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <span>Participation Requirements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {project.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                        <FormattedText className="text-gray-700 flex-1">
                          {requirement}
                        </FormattedText>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Join Project Card / My Participation Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {myParticipation ? "My Participation" : "Join Project"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myParticipation ? (
                  <div className="text-center">
                    {myCertificate ? (
                      <>
                        <Award className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                        <p className="text-yellow-800 font-medium mb-2">Project Completed!</p>
                        <p className="text-sm text-gray-600 mb-4">
                          Certificate Earned: {myCertificate.certificateNumber}
                        </p>
                        <div className="space-y-2">
                          <Link href={`/student/my-projects?projectId=${project.id}`}>
                            <Button className="w-full">
                              View My Projects
                            </Button>
                          </Link>
                          <p className="text-xs text-green-600">
                            🎉 Congratulations! You've successfully completed this project.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <p className="text-green-800 font-medium mb-2">You have joined this project</p>
                        <p className="text-sm text-gray-600 mb-4">
                          Current Progress: {myParticipation.progress}%
                        </p>
                        <Link href={`/student/my-projects?projectId=${project.id}`}>
                          <Button className="w-full">
                            View My Projects
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                ) : canJoinProject() ? (
                  <div className="text-center">
                    <Button
                      onClick={handleJoinButtonClick}
                      disabled={isJoining}
                      className="w-full"
                      size="lg"
                    >
                      {isJoining ? (
                        <LoadingState size="sm" className="mr-2" fullHeight={false} />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {isJoining ? 'Joining...' : 'Join Project'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Free to join, you can exit anytime
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    {!session?.user ? (
                      <>
                        <p className="text-gray-600 mb-3">Please log in to join the project</p>
                        <Link href="/auth/signin">
                          <Button className="w-full">Login</Button>
                        </Link>
                      </>
                    ) : !isStudentWorkspaceRole(session.user.role) ? (
                      <p className="text-gray-600">Only student collaborators can join projects</p>
                    ) : project.status !== 'published' ? (
                      <p className="text-gray-600">Project is not published yet</p>
                    ) : isProjectExpired(project.deadline) ? (
                      <div className="text-center">
                        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 font-medium">Project Expired</p>
                        <p className="text-sm text-gray-500">This project has passed its deadline</p>
                      </div>
                    ) : isProjectFull() ? (
                      <p className="text-gray-600">Project is full</p>
                    ) : (
                      <p className="text-gray-600">Cannot join the project</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Tags and Skills */}
            {project.tags && project.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Tag className="w-5 h-5 text-purple-600" />
                    <span>Project Tags</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className={`px-3 py-1 text-sm rounded-full ${
                          'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NGO Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Heart className="w-5 h-5 text-red-600" />
                  <span>Initiated Organization</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar
                    src={generateAvatar(project.ngoId)}
                    alt={project.ngoName}
                    size="md"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{project.ngoName}</h4>
                    <p className="text-sm text-gray-600">
                      Non-profit Organization
                    </p>
                  </div>
                </div>
                <FormattedText className="text-sm text-gray-600">
                  Dedicated to promoting social positive change and providing students with practical learning opportunities.
                </FormattedText>
              </CardContent>
            </Card>

            {/* Recent Participants */}
            {participations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Recent Participants</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participations.map((participation) => (
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
                      </div>
                    ))}
                    {participations.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{participations.length - 5} more participants
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
