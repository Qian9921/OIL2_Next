"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterShell } from "@/components/ui/filter-shell";
import { StatTile } from "@/components/ui/stat-tile";
import { getProjects, getParticipations } from "@/lib/firestore";
import { Project } from "@/lib/types";
import { 
  BookOpen, 
  CheckCircle,
  Clock,
  Sparkles,
  Target,
  Users, 
  Search,
  Filter,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProjectCard } from "@/components/project/project-card";
import { LoadingState } from "@/components/ui/loading-state";
import { Timestamp } from "firebase/firestore";
import { Participation } from "@/lib/types";
import { isProjectExpired } from "@/lib/utils";

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
  const [statusFilter, setStatusFilter] = useState("available");
  const [joiningProject, setJoiningProject] = useState<string | null>(null);
  const [projectToJoin, setProjectToJoin] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, [session]);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, difficultyFilter, tagFilter, statusFilter]);

  const loadProjects = async () => {
    try {
      // Load published projects and completed projects (which may be expired)
      const [publishedProjects, completedProjects] = await Promise.all([
        getProjects({ status: 'published' }),
        getProjects({ status: 'completed' })
      ]);

      // Combine and deduplicate projects
      const allProjects = [...publishedProjects, ...completedProjects];
      const uniqueProjects = allProjects.filter((project, index, self) =>
        index === self.findIndex(p => p.id === project.id)
      );

      setProjects(uniqueProjects);
      
      if (session?.user?.id) {
        const participations = await getParticipations({ studentId: session.user.id });
        
        const projectIds = participations.map(p => p.projectId);
        setUserParticipations(projectIds);
        setParticipationDetails(participations);
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
        filtered = filtered.filter(project => !isProjectJoined(project.id) && !isProjectExpired(project.deadline));
      } else if (statusFilter === "joined") {
        filtered = filtered.filter(project => isProjectJoined(project.id) && !isProjectCompleted(project.id));
      } else if (statusFilter === "completed") {
        filtered = filtered.filter(project => isProjectCompleted(project.id));
      } else if (statusFilter === "expired") {
        filtered = filtered.filter(project => isProjectExpired(project.deadline));
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
    setProjectToJoin(project);
  };

  const handleJoinProject = async () => {
    if (!projectToJoin || !session?.user?.id || !session?.user?.name) {
      setProjectToJoin(null);
      return;
    }

    setJoiningProject(projectToJoin.id);
    
    try {
      const response = await fetch("/api/projects/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: projectToJoin.id,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to join project");
      }

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
        description: error instanceof Error ? error.message : "Failed to join project, please try again",
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

  const isProjectCompleted = (projectId: string) => {
    const participation = participationDetails.find(p => p.projectId === projectId);
    return participation?.status === 'completed';
  };

  const stats = {
    available: projects.filter((project) => !isProjectJoined(project.id) && !isProjectExpired(project.deadline)).length,
    joined: participationDetails.filter((participation) => participation.status === 'active').length,
    completed: participationDetails.filter((participation) => participation.status === 'completed').length,
    expiring: projects.filter((project) => {
      if (!project.deadline) return false;
      const deadlineDate = project.deadline instanceof Timestamp ? project.deadline.toDate() : new Date(project.deadline as unknown as string);
      const now = new Date();
      const diffDays = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).length,
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

        <PageHero
          eyebrow="Student workspace"
          icon={BookOpen}
          title="Browse Projects"
          description="Discover meaningful social impact projects, compare difficulty and deadlines, and join the ones that fit your learning goals."
          actions={
            <>
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
              <Link href="/student/my-projects">
                <Button>
                  <BookOpen className="w-4 h-4 mr-2" />
                  My Projects
                </Button>
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Open Opportunities"
            value={stats.available}
            icon={Sparkles}
            tone="purple"
            hint="Projects that are live and ready for you to join."
          />
          <StatTile
            label="Projects Joined"
            value={stats.joined}
            icon={Users}
            tone="blue"
            hint="Keep momentum on the work you already started."
          />
          <StatTile
            label="Projects Finished"
            value={stats.completed}
            icon={CheckCircle}
            tone="green"
            hint="Your strongest work already completed and review-ready."
          />
          <StatTile
            label="Ending Soon"
            value={stats.expiring}
            icon={Clock}
            tone="amber"
            hint="Live projects closing within the next seven days."
          />
        </div>

        <FilterShell
          title="Project filters"
          description="Refine the marketplace by difficulty, topic, and current availability."
          icon={Filter}
          meta={
            <div className="inline-flex items-center rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Target className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
              {filteredProjects.length} results
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition-[border-color,box-shadow] duration-200 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>

                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition-[border-color,box-shadow] duration-200 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="all">All Tags</option>
                  {getAllTags().map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm transition-[border-color,box-shadow] duration-200 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="joined">Joined</option>
                  <option value="completed">Completed</option>
                  <option value="expired">Expired</option>
                </select>
          </div>
        </FilterShell>

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
                isExpired={isProjectExpired(project.deadline)}
                isJoining={joiningProject === project.id}
                onJoinClick={handleJoinProjectIntent}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/70 bg-white/85 backdrop-blur-xl">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-100 to-sky-100">
                <BookOpen className="h-10 w-10 text-indigo-500" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                No projects found
              </h3>
              <p className="mb-6 text-gray-600">
                Try adjusting your filters, or check back soon for newly published impact projects.
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
