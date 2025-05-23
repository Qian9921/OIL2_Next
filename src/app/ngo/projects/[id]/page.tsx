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
import { generateAvatar, getStatusColor, getDifficultyColor } from "@/lib/utils";
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
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">项目未找到</h1>
          <p className="text-gray-600 mb-6">请检查项目ID是否正确</p>
          <Link href="/ngo/projects">
            <Button>返回项目列表</Button>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
          <p className="text-gray-600 mb-6">您没有权限查看此项目</p>
          <Link href="/ngo/projects">
            <Button>返回项目列表</Button>
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
                返回项目列表
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-2">
                项目详情和管理 📊
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link href={`/ngo/projects/${project.id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                编辑项目
              </Button>
            </Link>
            <Link href={`/projects/${project.id}`}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                预览
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
                    <span>项目信息</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                      {project.status === 'draft' ? '草稿' :
                       project.status === 'published' ? '发布中' :
                       project.status === 'completed' ? '已完成' : '已归档'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(project.difficulty)}`}>
                      {project.difficulty === 'beginner' ? '初级' :
                       project.difficulty === 'intermediate' ? '中级' : '高级'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">项目描述</h4>
                  <p className="text-gray-700">{project.description}</p>
                </div>

                {project.shortDescription && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">简短描述</h4>
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
                    <div className="text-xs text-gray-600">参与者</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-600">
                      {project.estimatedHours || 'TBD'}
                    </div>
                    <div className="text-xs text-gray-600">预估小时</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-purple-600">
                      {project.subtasks?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">子任务</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-yellow-600">
                      {averageProgress}%
                    </div>
                    <div className="text-xs text-gray-600">平均进度</div>
                  </div>
                </div>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">项目标签</h4>
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
                    <h4 className="font-medium text-gray-900 mb-2">参与要求</h4>
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
                    <h4 className="font-medium text-gray-900 mb-2">学习目标</h4>
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
                    <span>项目任务</span>
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
                                预估时长: {subtask.estimatedHours} 小时
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
                  <span>项目状态</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {[
                    { key: 'draft', label: '草稿', color: 'bg-gray-100 text-gray-800' },
                    { key: 'published', label: '发布', color: 'bg-blue-100 text-blue-800' },
                    { key: 'completed', label: '完成', color: 'bg-green-100 text-green-800' },
                    { key: 'archived', label: '归档', color: 'bg-red-100 text-red-800' }
                  ].map((status) => (
                    <Button
                      key={status.key}
                      variant={project.status === status.key ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleStatusChange(status.key as Project['status'])}
                      disabled={isUpdating}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Project Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span>项目统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {participations.length}
                  </div>
                  <div className="text-sm text-gray-600">总参与者</div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {completionRate}%
                  </div>
                  <div className="text-sm text-gray-600">完成率</div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {averageProgress}%
                  </div>
                  <div className="text-sm text-gray-600">平均进度</div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Participants */}
            {participations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>最新参与者</span>
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
                            进度: {participation.progress}%
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(participation.status)}`}>
                          {participation.status === 'active' ? '进行中' :
                           participation.status === 'completed' ? '已完成' : '其他'}
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
                <CardTitle className="text-sm">创建信息</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>创建于: {project.createdAt.toDate().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>更新于: {project.updatedAt.toDate().toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 