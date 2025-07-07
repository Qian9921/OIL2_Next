"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProjects, createParticipation, getParticipations, getUser, joinClass } from "@/lib/firestore";
import { Project, User } from "@/lib/types";
import { 
  BookOpen, 
  Users, 
  Search,
  Filter,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/project/project-card";
import { LoadingState } from "@/components/ui/loading-state";
import { Timestamp } from "firebase/firestore";
import { Participation } from "@/lib/types";

export default function StudentProjectsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [userParticipations, setUserParticipations] = useState<string[]>([]);
  const [participationDetails, setParticipationDetails] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [joiningProject, setJoiningProject] = useState<string | null>(null);
  const [projectToJoin, setProjectToJoin] = useState<Project | null>(null);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadProjects();
  }, [session]);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, difficultyFilter, tagFilter, statusFilter]);

  const loadProjects = async () => {
    try {
      // Load only regular projects
      const allProjects = await getProjects({ status: 'published' });
      setProjects(allProjects);
      
      // Load user participations and user info if logged in
      if (session?.user?.id) {
        const [participations, userInfo] = await Promise.all([
          getParticipations({ studentId: session.user.id }),
          getUser(session.user.id)
        ]);
        
        const projectIds = participations.map(p => p.projectId);
        setUserParticipations(projectIds);
        setParticipationDetails(participations);
        setCurrentUser(userInfo);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.ngoName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter(project => project.difficulty === difficultyFilter);
    }

    if (tagFilter !== "all") {
      filtered = filtered.filter(project => 
        project.tags && project.tags.includes(tagFilter)
      );
    }
    
    if (statusFilter !== "all") {
      if (statusFilter === "available") {
        filtered = filtered.filter(project => !isProjectJoined(project.id));
      } else if (statusFilter === "joined") {
        filtered = filtered.filter(project => isProjectJoined(project.id) && !isProjectCompleted(project.id));
      } else if (statusFilter === "completed") {
        filtered = filtered.filter(project => isProjectCompleted(project.id));
      }
    }
    


    setFilteredProjects(filtered);
  };

  const handleJoinProjectIntent = async (project: Project) => {
    if (!session?.user?.id) {
      toast({
        title: "Login Required",
        description: "User information incomplete, please log in again",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has a class
    if (!currentUser?.classId) {
      // User doesn't have a class, show class join dialog
      setProjectToJoin(project);
      setShowClassDialog(true);
      return;
    }
    
    // User has a class, proceed with normal join dialog
    setProjectToJoin(project);
  };

  const handleJoinProject = async () => {
    if (!projectToJoin || !session?.user?.id || !session?.user?.name) {
      setProjectToJoin(null);
      return;
    }

    setJoiningProject(projectToJoin.id);
    
    try {
      await createParticipation({
        projectId: projectToJoin.id,
        studentId: session.user.id,
        studentName: session.user.name,
        status: 'active',
        progress: 0,
        completedSubtasks: []
      });

      // Reload data
      await loadProjects();
      toast({
        title: "Project Joined",
        description: "Successfully joined the project!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error joining project:", error);
      toast({
        title: "Join Failed",
        description: "Failed to join project, please try again",
        variant: "destructive"
      });
    } finally {
      setJoiningProject(null);
      setProjectToJoin(null);
    }
  };

  const handleJoinClassAndProject = async () => {
    if (!projectToJoin || !session?.user?.id || !session?.user?.name || !inviteCode.trim()) {
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
        projectId: projectToJoin.id,
        studentId: session.user.id,
        studentName: session.user.name,
        status: 'active',
        progress: 0,
        completedSubtasks: []
      });

      // Reload data to reflect changes
      await loadProjects();
      
      toast({
        title: "Success!",
        description: "Successfully joined class and project!",
        variant: "default"
      });

      // Close dialogs and reset state
      setShowClassDialog(false);
      setProjectToJoin(null);
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
    setProjectToJoin(null);
    setInviteCode("");
    toast({
      title: "Join Cancelled",
      description: "You need to join a class first to participate in projects",
      variant: "default"
    });
  };

  const getAllTags = () => {
    const tags = new Set<string>();
    projects.forEach(project => {
      if (project.tags) {
        project.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  };

  const isProjectFull = (project: Project) => {
    return project.maxParticipants && project.currentParticipants >= project.maxParticipants;
  };

  const isProjectJoined = (projectId: string) => {
    return userParticipations.includes(projectId);
  };

  const isProjectCompleted = (projectId: string) => {
    const participation = participationDetails.find(p => p.projectId === projectId);
    return participation?.status === 'completed';
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading projects..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* AlertDialog for joining project (when user has class) */}
        <AlertDialog open={!!projectToJoin && !showClassDialog} onOpenChange={(open) => !open && setProjectToJoin(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Join Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to join "{projectToJoin?.title}"? You can leave the project at any time from your My Projects page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleJoinProject}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {joiningProject === projectToJoin?.id ? 'Joining...' : 'Join Project'}
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
                To join "{projectToJoin?.title}", you need to be part of a class. Please enter your teacher's invite code to join a class and continue with the project.
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Projects</h1>
            <p className="text-gray-600 mt-2">
              Discover meaningful social impact projects and join them 🌟
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setDifficultyFilter("all");
                setTagFilter("all");
                setStatusFilter("all");
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
            <Link href="/time-auction">
              <Button variant="outline" className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 text-orange-700 hover:from-orange-100 hover:to-red-100">
                <Heart className="w-4 h-4 mr-2" />
                Time Auction
              </Button>
            </Link>
            <Link href="/student/my-projects">
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                My Projects
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Difficulty Filter */}
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              {/* Tag Filter */}
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Tags</option>
                {getAllTags().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="joined">Joined</option>
                <option value="completed">Completed</option>
              </select>
              

              
              {/* Results Count - now spans full width at the bottom */}
              <div className="col-span-full flex items-center justify-end text-sm text-gray-600 mt-2">
                <Filter className="w-4 h-4 mr-2" />
                Found {filteredProjects.length} projects
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                showJoinButton={true}
                isJoined={isProjectJoined(project.id)}
                isCompleted={isProjectCompleted(project.id)}
                isFull={isProjectFull(project) ? true : false}
                isJoining={joiningProject === project.id}
                onJoinClick={handleJoinProjectIntent}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or check back later for new projects!
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setDifficultyFilter("all");
                  setTagFilter("all");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 