"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getProject, getParticipations, createParticipation, getCertificates, getUser, joinClass } from "@/lib/firestore";
import { Project, Participation, Certificate, User } from "@/lib/types";
import { generateAvatar, getDifficultyColor, formatDeadline } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { FormattedText } from "@/components/ui/formatted-text";
import { Timestamp } from "firebase/firestore";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participation | null>(null);
  const [myCertificate, setMyCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (params.id) {
      loadProjectData();
    }
  }, [params.id, session]);

  const loadProjectData = async () => {
    try {
      let projectData: Project | null = null;
      
      // Check if this is a Time Auction project
      if ((params.id as string).startsWith('time-auction-')) {
        // Load Time Auction project from API
        const timeAuctionResponse = await fetch('/api/time-auction/projects');
        if (timeAuctionResponse.ok) {
          const timeAuctionProjects = await timeAuctionResponse.json();
          projectData = timeAuctionProjects.find((p: Project) => p.id === params.id);
        }
      } else {
        // Load regular project from Firebase
        projectData = await getProject(params.id as string);
      }
      
      const participationData = await getParticipations({ projectId: params.id as string });
      
      setProject(projectData);
      setParticipations(participationData);
      
      // Check if current user has already joined (only consider active participations)
      if (session?.user?.id) {
        const [userParticipation, userInfo] = await Promise.all([
          participationData.find(p => 
            p.studentId === session.user.id && 
            (p.status === 'active' || p.status === 'completed')
          ),
          getUser(session.user.id)
        ]);
        
        setMyParticipation(userParticipation || null);
        setCurrentUser(userInfo);
        
        // Check if user has a certificate for this project
        if (userParticipation) {
          try {
            const certificates = await getCertificates({ 
              studentId: session.user.id,
              projectId: params.id as string 
            });
            setMyCertificate(certificates.length > 0 ? certificates[0] : null);
          } catch (error) {
            console.error("Error loading certificate:", error);
          }
        }
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

    if (session.user.role !== 'student') {
      toast({ title: "Access Denied", description: "Only students can join projects.", variant: "destructive" });
      return;
    }

    // Check if user has a class
    if (!currentUser?.classId) {
      // User doesn't have a class, show class join dialog
      setShowClassDialog(true);
      return;
    }

    // User has a class, proceed with normal join dialog
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
      
      // Reload data to show updated state
      await loadProjectData();
      toast({ title: "Project Joined!", description: "Successfully joined the project!", variant: "default" });
    } catch (error) {
      console.error("Error joining project:", error);
      toast({ title: "Join Failed", description: "Failed to join the project, please try again.", variant: "destructive" });
    } finally {
      setIsJoining(false);
      setShowJoinDialog(false);
    }
  };

  const handleJoinClassAndProject = async () => {
    if (!project || !session?.user?.id || !session?.user?.name || !inviteCode.trim()) {
      return;
    }

    setIsJoiningClass(true);

    try {
      // First, join the class
      const classResult = await joinClass(session.user.id, inviteCode.trim());
      
      if (!classResult.success) {
        toast({
          title: "Failed to Join Class",
          description: classResult.message,
          variant: "destructive"
        });
        return;
      }

      // If class join was successful, join the project
      await createParticipation({
        projectId: project.id,
        studentId: session.user.id,
        studentName: session.user.name,
        status: 'active',
        completedSubtasks: [],
        progress: 0
      });

      // Reload data to reflect changes
      await loadProjectData();
      
      toast({
        title: "Success!",
        description: "Successfully joined class and project!",
        variant: "default"
      });

      // Close dialogs and reset state
      setShowClassDialog(false);
      setInviteCode("");
    } catch (error) {
      console.error("Error joining class and project:", error);
      toast({
        title: "Join Failed",
        description: "Failed to join class and project, please try again",
        variant: "destructive"
      });
    } finally {
      setIsJoiningClass(false);
    }
  };

  const handleSkipClassJoin = () => {
    setShowClassDialog(false);
    setInviteCode("");
    toast({
      title: "Join Cancelled",
      description: "You need to join a class first to participate in projects",
      variant: "default"
    });
  };

  const isProjectFull = () => {
    return project?.maxParticipants && project.currentParticipants >= project.maxParticipants;
  };

  const canJoinProject = () => {
    if (!session?.user) return false;
    if (session.user.role !== 'student') return false;
    if (myParticipation) return false;
    if (project?.status !== 'published') return false;
    if (isProjectFull()) return false;
    if (project?.source === 'time_auction') return false; // Time Auction projects cannot be joined through our platform
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
          <Link href={
            (params.id as string).startsWith('time-auction-') ? "/time-auction" :
            session?.user?.role === 'student' ? "/student/projects" : 
            session?.user?.role === 'teacher' ? "/teacher/submissions" :
            session?.user?.role === 'ngo' ? "/ngo/projects" : 
            "/student/projects"
          }>
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

        {/* AlertDialog for joining class first */}
        <AlertDialog open={showClassDialog} onOpenChange={(open) => !open && setShowClassDialog(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Join a Class First</AlertDialogTitle>
              <AlertDialogDescription>
                To join "{project?.title}", you need to be part of a class. Please enter your teacher's invite code to join a class and continue with the project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                Class Invite Code
              </label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="Enter 6-digit invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ask your teacher for the class invite code
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleSkipClassJoin}>
                Skip for Now
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleJoinClassAndProject}
                disabled={!inviteCode.trim() || isJoiningClass}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isJoiningClass ? 'Joining...' : 'Join Class & Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={
              project.source === 'time_auction' ? "/time-auction" :
              session?.user?.role === 'student' ? "/student/projects" : 
              session?.user?.role === 'teacher' ? "/teacher/submissions" :
              session?.user?.role === 'ngo' ? "/ngo/projects" : 
              "/student/projects"
            }>
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
                  {project.source === 'time_auction' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 flex items-center ml-2">
                      <Heart className="w-3 h-3 mr-1" />
                      Time Auction
                    </span>
                  )}
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

            {/* Time Auction specific content */}
            {project.source === 'time_auction' && (
              <>
                {/* Project Background for Time Auction */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <span>Project Background</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormattedText className="text-gray-700 leading-relaxed">
                      {project.subtasks?.[0]?.description?.split('\n').find(line => line.includes('At Time Auction')) ||
                       "At Time Auction, we're running a pilot program to better connect skilled volunteers with NGOs, and are looking for volunteers to help us with this program in the next 2-4 months."}
                    </FormattedText>
                  </CardContent>
                </Card>

                {/* Why Important */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Heart className="w-5 h-5 text-red-600" />
                      <span>Why This Project Matters</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormattedText className="text-gray-700 leading-relaxed">
                      There are 880+ NGOs on our platform now and many more are signing up. Your support will help us reach more skilled-volunteers that can help these NGOs create meaningful social impact.
                    </FormattedText>
                  </CardContent>
                </Card>

                {/* Special Program */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="w-5 h-5 text-purple-600" />
                      <span>Special Recognition Program</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Swire Trust Go-Givers Program</h4>
                      <FormattedText className="text-purple-800 text-sm">
                        This program aims to encourage skilled volunteers to support Swire Trust NGO partners in education, marine conservation, and arts. 
                        From now until 2025, 10 outstanding volunteers will be selected annually as the 'Swire Trust Go-Givers of the Year' with special and empowering rewards. 
                        40 volunteers who contribute the highest number of hours annually will also be recognised!
                      </FormattedText>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Requirements */}
            {project.requirements && project.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <span>{project.source === 'time_auction' ? 'What We Need From You' : 'Participation Requirements'}</span>
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
                  {project.source === 'time_auction' && (
                    <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                      <p className="text-orange-800 text-sm">
                        <strong>Note:</strong> Extensive experience on the proposed topic is required for this project. Flexible dates and times available!
                      </p>
                    </div>
                  )}
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
                          <Link href="/student/my-projects">
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
                        <Link href="/student/my-projects">
                          <Button className="w-full">
                            View My Projects
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                ) : project.source === 'time_auction' ? (
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Heart className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-orange-800 font-medium mb-2">Time Auction项目</p>
                      <p className="text-sm text-gray-600 mb-4">
                        这是来自我们合作伙伴Time Auction的项目，请访问他们的官方网站申请参与
                      </p>
                    </div>
                    {project.subtasks && project.subtasks[0]?.resources && project.subtasks[0].resources[0] && (
                      <Link href={project.subtasks[0].resources[0]} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          访问Time Auction申请
                        </Button>
                      </Link>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      将在新窗口中打开Time Auction官网
                    </p>
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
                    ) : session.user.role !== 'student' ? (
                      <p className="text-gray-600">Only students can join projects</p>
                    ) : project.status !== 'published' ? (
                      <p className="text-gray-600">Project is not published yet</p>
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
                    <span>{project.source === 'time_auction' ? 'Required Skills & Tags' : 'Project Tags'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className={`px-3 py-1 text-sm rounded-full ${
                          project.source === 'time_auction' && 
                          ['Technology', 'No-Code Tools', 'Artificial Intelligence', 'Business Process Improvement', 'Data Management', 'Website Development'].includes(tag)
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {project.source === 'time_auction' && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Additional Requirements:</h5>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div>• Languages: Chinese (Cantonese), English</div>
                        <div>• Experience Level: Extensive experience required</div>
                        <div>• Location: Remote</div>
                        <div>• Time Commitment: 4 hours in total</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* NGO Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Heart className="w-5 h-5 text-red-600" />
                  <span>{project.source === 'time_auction' ? 'Partner Organization' : 'Initiated Organization'}</span>
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
                      {project.source === 'time_auction' ? 'Volunteer Platform & Charity' : 'Non-profit Organization'}
                    </p>
                  </div>
                </div>
                <FormattedText className="text-sm text-gray-600">
                  {project.source === 'time_auction' 
                    ? "Time Auction is a charity that advocates volunteerism. We encourage volunteering with inspiring experiences, while connecting skilled-volunteers with NGOs. Over 100,000 volunteer hours have been contributed to date since 2014."
                    : "Dedicated to promoting social positive change and providing students with practical learning opportunities."
                  }
                </FormattedText>
                {project.source === 'time_auction' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>• 880+ NGO Partners</span>
                      <span>• 100,000+ Volunteer Hours</span>
                      <span>• Since 2014</span>
                    </div>
                  </div>
                )}
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