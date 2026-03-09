"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getProjects, updateProject, deleteProject, handleStatusChange as updateProjectStatus } from "@/lib/firestore";
import { Project } from "@/lib/types";
import { getStatusColor, getDifficultyColor, formatDeadline } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  Plus, 
  BookOpen,
  Users, 
  Calendar, 
  Tag,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Settings,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function NGOProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [projectToDelete, setProjectToDelete] = useState<{id: string, title: string} | null>(null);
  const { toast } = useToast();
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadProjects();
    }
  }, [session]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectsList = await getProjects({ ngoId: session?.user?.id as string });
      setProjects(projectsList);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: Project['status']) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    setChangingStatus(projectId);
    setStatusChangeError(null);
    
    try {
      await updateProjectStatus(projectId, newStatus, project.status);
      await loadProjects(); // Reload project list
      toast({ 
        title: "Status Updated", 
        description: `Project status changed to ${newStatus}.`, 
        variant: "default" 
      });
    } catch (error: any) {
      console.error("Error updating project status:", error);
      setStatusChangeError(error.message);
      toast({ 
        title: "Update Failed", 
        description: error.message || "Failed to update project status.", 
        variant: "destructive" 
      });
    } finally {
      setChangingStatus(null);
    }
  };

  const handleDeleteProject = async (projectId: string, projectTitle: string) => {
    setProjectToDelete({ id: projectId, title: projectTitle });
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      await deleteProject(projectToDelete.id);
      await loadProjects(); // Reload project list
      toast({ 
        title: "Project Deleted", 
        description: "The project has been successfully deleted.", 
        variant: "default" 
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ 
        title: "Delete Failed", 
        description: "Failed to delete the project.", 
        variant: "destructive" 
      });
    } finally {
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  // Function to determine if a status option should be disabled
  const isStatusOptionDisabled = (project: Project, status: Project['status']) => {
    // Published projects cannot go back to draft
    if (project.status === 'published' && status === 'draft') {
      return true;
    }
    
    // Completed status is not allowed to be set manually (automatic only)
    if (status === 'completed') {
      return true;
    }
    
    // Only completed projects can be archived
    if (status === 'archived' && project.status !== 'completed') {
      return true;
    }
    
    // Archived projects cannot change status
    if (project.status === 'archived') {
      return true;
    }
    
    return false;
  };

  // Function to get a tooltip message explaining why an option is disabled
  const getStatusTooltip = (project: Project, status: Project['status']) => {
    if (project.status === 'published' && status === 'draft') {
      return 'Published projects cannot be moved back to draft status';
    }
    
    if (status === 'completed') {
      return 'Projects are automatically marked as completed when their deadline is reached';
    }
    
    if (status === 'archived' && project.status !== 'completed') {
      return 'Only completed projects can be archived';
    }
    
    if (project.status === 'archived') {
      return 'Archived projects cannot be changed to any other status';
    }
    
    return '';
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
        {/* AlertDialog for project deletion */}
        <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{projectToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteProject}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PageHero
          eyebrow="NGO workspace"
          icon={BookOpen}
          title="Project Management"
          description="Create, refine, and publish projects that feel clear to students, evaluate well, and look polished across the full learning journey."
          actions={
            <Link href="/ngo/projects/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Project status</p>
                  <p className="mt-1 text-sm text-slate-600">Switch between draft, published, and completed projects without losing context.</p>
                </div>
                <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {filteredProjects.length} visible
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: projects.length },
                  { key: 'draft', label: 'Draft', count: projects.filter(p => p.status === 'draft').length },
                  { key: 'published', label: 'Published', count: projects.filter(p => p.status === 'published').length },
                  { key: 'completed', label: 'Completed', count: projects.filter(p => p.status === 'completed').length },
                  { key: 'archived', label: 'Archived', count: projects.filter(p => p.status === 'archived').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition-all ${
                      filter === tab.key
                        ? 'bg-white text-rose-700 shadow-sm ring-1 ring-rose-100'
                        : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                    <span className="ml-2 rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-6 line-clamp-2">
                        {project.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status === 'draft' ? 'Draft' :
                           project.status === 'published' ? 'Published' :
                           project.status === 'completed' ? 'Completed' :
                           project.status === 'archived' ? 'Archived' : project.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(project.difficulty)}`}>
                          {project.difficulty === 'beginner' ? 'Beginner' :
                           project.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Link href={`/ngo/projects/${project.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProject(project.id, project.title)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {project.description}
                  </CardDescription>

                  {/* Project Stats */}
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{project.currentParticipants}/{project.maxParticipants || '∞'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Deadline: {project.deadline ? formatDeadline(project.deadline) : 'None'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <BarChart3 className="w-4 h-4" />
                      <span>{project.subtasks?.length || 0} Subtasks</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Tag className="w-4 h-4" />
                      <span>{project.tags?.length || 0} Tags</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">+{project.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/ngo/projects/${project.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    
                    {/* Status Change Dropdown */}
                    <div className="relative">
                      <select
                        value={project.status}
                        onChange={(e) => handleStatusChange(project.id, e.target.value as Project['status'])}
                        className="appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-300"
                        disabled={changingStatus === project.id || project.status === 'archived'}
                        title={project.status === 'archived' ? 'Archived projects cannot be changed' : ''}
                      >
                        <option 
                          value="draft" 
                          disabled={isStatusOptionDisabled(project, 'draft')}
                          title={getStatusTooltip(project, 'draft')}
                        >
                          Draft
                        </option>
                        <option 
                          value="published" 
                          disabled={isStatusOptionDisabled(project, 'published')}
                          title={getStatusTooltip(project, 'published')}
                        >
                          Publish
                        </option>
                        <option 
                          value="completed" 
                          disabled={true}
                          title="Projects are automatically marked as completed when deadline is reached"
                        >
                          Completed (Auto)
                        </option>
                        <option 
                          value="archived" 
                          disabled={isStatusOptionDisabled(project, 'archived')}
                          title={getStatusTooltip(project, 'archived')}
                        >
                          Archive
                        </option>
                      </select>
                      {changingStatus === project.id ? (
                        <div className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-rose-500 animate-spin border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Settings className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Display status change error if any */}
                  {statusChangeError && changingStatus === project.id && (
                    <div className="mt-2 text-xs text-red-600 p-2 bg-red-50 rounded">
                      {statusChangeError}
                    </div>
                  )}

                  {/* Warnings */}
                  {project.status === 'published' && project.currentParticipants === 0 && (
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-lg text-yellow-800 text-xs mt-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>This project is published but has no participants yet</span>
                    </div>
                  )}

                  {/* Deadline Warning */}
                  {project.status === 'published' && project.deadline && (
                    <div className={`flex items-center space-x-2 p-2 rounded-lg text-xs mt-2 ${
                      new Date(project.deadline.toDate()) < new Date() 
                        ? 'bg-red-50 text-red-800' 
                        : new Date(project.deadline.toDate()) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
                          ? 'bg-orange-50 text-orange-800' 
                          : 'bg-blue-50 text-blue-800'
                    }`}>
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(project.deadline.toDate()) < new Date() 
                          ? 'Deadline passed! Project will be automatically marked as completed.' 
                          : new Date(project.deadline.toDate()) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
                            ? `Deadline approaching: ${formatDeadline(project.deadline)}`
                            : `Deadline: ${formatDeadline(project.deadline)}`
                        }
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'No projects created yet' : `No ${filter === 'draft' ? 'draft' : filter === 'published' ? 'published' : filter === 'completed' ? 'completed' : 'archived'} projects`}
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first social impact project, start connecting with students and make a positive impact!
              </p>
              <Link href="/ngo/projects/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 