"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProjects, updateProject, deleteProject } from "@/lib/firestore";
import { Project } from "@/lib/types";
import { getStatusColor, getDifficultyColor } from "@/lib/utils";
import { 
  Plus, 
  Users, 
  Clock, 
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

  useEffect(() => {
    if (session?.user?.id) {
      loadProjects();
    }
  }, [session]);

  const loadProjects = async () => {
    try {
      const data = await getProjects({ ngoId: session!.user!.id });
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (projectId: string, status: Project['status']) => {
    try {
      await updateProject(projectId, { status });
      await loadProjects(); // 重新加载项目列表
    } catch (error) {
      console.error("Error updating project status:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("确定要删除这个项目吗？此操作不可撤销。")) {
      try {
        await deleteProject(projectId);
        await loadProjects(); // 重新加载项目列表
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

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
            <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-600 mt-2">
              管理您创建的社会影响项目 🚀
            </p>
          </div>
          <Link href="/ngo/projects/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              创建新项目
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: '全部', count: projects.length },
            { key: 'draft', label: '草稿', count: projects.filter(p => p.status === 'draft').length },
            { key: 'published', label: '发布中', count: projects.filter(p => p.status === 'published').length },
            { key: 'completed', label: '已完成', count: projects.filter(p => p.status === 'completed').length },
            { key: 'archived', label: '已归档', count: projects.filter(p => p.status === 'archived').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 line-clamp-2">
                        {project.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status === 'draft' ? '草稿' :
                           project.status === 'published' ? '发布中' :
                           project.status === 'completed' ? '已完成' :
                           project.status === 'archived' ? '已归档' : project.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(project.difficulty)}`}>
                          {project.difficulty === 'beginner' ? '初级' :
                           project.difficulty === 'intermediate' ? '中级' : '高级'}
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
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-3">
                    {project.description}
                  </CardDescription>

                  {/* Project Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{project.currentParticipants}/{project.maxParticipants || '∞'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{project.estimatedHours || 'TBD'} 小时</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <BarChart3 className="w-4 h-4" />
                      <span>{project.subtasks?.length || 0} 子任务</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Tag className="w-4 h-4" />
                      <span>{project.tags?.length || 0} 标签</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{project.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Link href={`/ngo/projects/${project.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        查看
                      </Button>
                    </Link>
                    
                    {/* Status Change Dropdown */}
                    <div className="relative">
                      <select
                        value={project.status}
                        onChange={(e) => handleStatusChange(project.id, e.target.value as Project['status'])}
                        className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="draft">草稿</option>
                        <option value="published">发布</option>
                        <option value="completed">完成</option>
                        <option value="archived">归档</option>
                      </select>
                      <Settings className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>
                  </div>

                  {/* Warnings */}
                  {project.status === 'published' && project.currentParticipants === 0 && (
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-lg text-yellow-800 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span>该项目已发布但暂无参与者</span>
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
                {filter === 'all' ? '还没有创建任何项目' : `没有${filter === 'draft' ? '草稿' : filter === 'published' ? '发布中' : filter === 'completed' ? '已完成' : '已归档'}的项目`}
              </h3>
              <p className="text-gray-600 mb-6">
                创建您的第一个社会影响项目，开始连接学生并产生积极影响！
              </p>
              <Link href="/ngo/projects/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  创建新项目
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 