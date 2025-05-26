"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getProjects, createParticipation, getParticipations } from "@/lib/firestore";
import { Project } from "@/lib/types";
import { generateAvatar, getDifficultyColor, calculateEstimatedHours, formatDeadline } from "@/lib/utils";
import { 
  BookOpen, 
  Users, 
  Clock, 
  Tag,
  Search,
  Filter,
  TrendingUp,
  MapPin,
  CheckCircle,
  Target,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function StudentProjectsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [userParticipations, setUserParticipations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [joiningProject, setJoiningProject] = useState<string | null>(null);
  const [projectToJoin, setProjectToJoin] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, [session]);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, difficultyFilter, tagFilter]);

  const loadProjects = async () => {
    try {
      const allProjects = await getProjects({ status: 'published' });
      setProjects(allProjects);
      
      // Load user participations if logged in
      if (session?.user?.id) {
        const participations = await getParticipations({ studentId: session.user.id });
        const projectIds = participations.map(p => p.projectId);
        setUserParticipations(projectIds);
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

    setFilteredProjects(filtered);
  };

  const handleJoinProjectIntent = (project: Project) => {
    if (!session?.user?.id) {
      toast({
        title: "Login Required",
        description: "User information incomplete, please log in again",
        variant: "destructive"
      });
      return;
    }
    
    setProjectToJoin(project);
  };

  const handleJoinProject = async () => {
    if (!projectToJoin || !session?.user?.id) {
      setProjectToJoin(null);
      return;
    }

    setJoiningProject(projectToJoin.id);
    
    try {
      await createParticipation({
        projectId: projectToJoin.id,
        studentId: session.user.id,
        studentName: session.user.name || 'Student',
        status: 'active',
        completedSubtasks: [],
        progress: 0
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
        {/* AlertDialog for joining project */}
        <AlertDialog open={!!projectToJoin} onOpenChange={(open) => !open && setProjectToJoin(null)}>
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Projects</h1>
            <p className="text-gray-600 mt-2">
              Discover meaningful social impact projects and join them 🌟
            </p>
          </div>
          <Link href="/student/my-projects">
            <Button>
              <BookOpen className="w-4 h-4 mr-2" />
              My Projects
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              {/* Results Count */}
              <div className="flex items-center text-sm text-gray-600">
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
              <Card key={project.id} className="card-hover h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(project.difficulty)}`}>
                          {project.difficulty === 'beginner' ? 'Beginner' :
                           project.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
                        </span>
                        {isProjectFull(project) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Full
                          </span>
                        )}
                        {isProjectJoined(project.id) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Joined
                          </span>
                        )}
                      </div>
                    </div>
                    <Avatar
                      src={generateAvatar(project.ngoId)}
                      alt={project.ngoName}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    by {project.ngoName}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col space-y-4">
                  {/* Description */}
                  <p className="text-gray-700 text-sm line-clamp-3 flex-1">
                    {project.shortDescription || project.description}
                  </p>

                  {/* Project Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{project.currentParticipants}/{project.maxParticipants || '∞'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {calculateEstimatedHours(project) > 0 
                          ? `${calculateEstimatedHours(project)} hours (est.)`
                          : 'TBD hours'
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="w-3 h-3" />
                      <span>{project.subtasks?.length || 0} tasks</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {project.deadline ? 
                          `Due ${formatDeadline(project.deadline)}` 
                          : 'No deadline'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Link href={`/projects/${project.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    {isProjectJoined(project.id) ? (
                      <Link href="/student/my-projects" className="flex-1">
                        <Button className="w-full">
                          <Target className="w-4 h-4 mr-2" />
                          Continue
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => handleJoinProjectIntent(project)}
                        disabled={isProjectFull(project) || joiningProject === project.id}
                        className="flex-1"
                      >
                        {joiningProject === project.id ? (
                          <div className="loading-spinner" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Join
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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