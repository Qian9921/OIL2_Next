"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getProject, getParticipations, createParticipation } from "@/lib/firestore";
import { Project, Participation } from "@/lib/types";
import { generateAvatar, getDifficultyColor } from "@/lib/utils";
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  Tag,
  Target,
  Plus,
  CheckCircle,
  BookOpen,
  Heart,
  Award,
  AlertCircle,
  ExternalLink,
  Calendar,
  GraduationCap
} from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProjectData();
    }
  }, [params.id, session]);

  const loadProjectData = async () => {
    try {
      const [projectData, participationData] = await Promise.all([
        getProject(params.id as string),
        getParticipations({ projectId: params.id as string })
      ]);
      
      setProject(projectData);
      setParticipations(participationData);
      
      // Check if current user has already joined
      if (session?.user?.id) {
        const userParticipation = participationData.find(p => p.studentId === session.user.id);
        setMyParticipation(userParticipation || null);
      }
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinProject = async () => {
    if (!session?.user?.id || !session?.user?.name || !project) {
      alert("请先登录");
      return;
    }

    if (session.user.role !== 'student') {
      alert("只有学生可以加入项目");
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
      alert("成功加入项目！");
    } catch (error) {
      console.error("Error joining project:", error);
      alert("加入项目失败，请重试");
    } finally {
      setIsJoining(false);
    }
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
    return true;
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
          <Link href="/student/projects">
            <Button>返回项目列表</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={session?.user?.role === 'student' ? "/student/projects" : "/ngo/projects"}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-2 flex items-center">
                <GraduationCap className="w-4 h-4 mr-2" />
                由 {project.ngoName} 发起
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(project.difficulty)}`}>
              {project.difficulty === 'beginner' ? '初级' :
               project.difficulty === 'intermediate' ? '中级' : '高级'}
            </span>
            {myParticipation && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-4 h-4 mr-1 inline" />
                已加入
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
                  <span>项目介绍</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.shortDescription && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-900 font-medium">{project.shortDescription}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">详细描述</h4>
                  <p className="text-gray-700 leading-relaxed">{project.description}</p>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {project.currentParticipants}
                      {project.maxParticipants && `/${project.maxParticipants}`}
                    </div>
                    <div className="text-xs text-gray-600">参与者</div>
                  </div>
                  <div className="text-center">
                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {project.estimatedHours || 'TBD'}
                    </div>
                    <div className="text-xs text-gray-600">预估小时</div>
                  </div>
                  <div className="text-center">
                    <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {project.subtasks?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">学习任务</div>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      {project.createdAt.toDate().toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-600">发布日期</div>
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
                    <span>学习目标</span>
                  </CardTitle>
                  <CardDescription>
                    完成这个项目后，您将掌握以下技能和知识
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {project.learningGoals.map((goal, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-800">{goal}</span>
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
                    <span>学习路径</span>
                  </CardTitle>
                  <CardDescription>
                    项目包含 {project.subtasks.length} 个学习任务
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
                          <p className="text-gray-600 text-sm mb-2">
                            {subtask.description}
                          </p>
                          {subtask.estimatedHours && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              预估时长: {subtask.estimatedHours} 小时
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
                    <span>参与要求</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {project.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Join Project Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">加入项目</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myParticipation ? (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-green-800 font-medium mb-2">您已加入此项目</p>
                    <p className="text-sm text-gray-600 mb-4">
                      当前进度: {myParticipation.progress}%
                    </p>
                    <Link href="/student/my-projects">
                      <Button className="w-full">
                        查看我的项目
                      </Button>
                    </Link>
                  </div>
                ) : canJoinProject() ? (
                  <div className="text-center">
                    <Button
                      onClick={handleJoinProject}
                      disabled={isJoining}
                      className="w-full"
                      size="lg"
                    >
                      {isJoining ? (
                        <div className="loading-spinner mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      加入项目
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      免费加入，随时可以退出
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    {!session?.user ? (
                      <>
                        <p className="text-gray-600 mb-3">请先登录以加入项目</p>
                        <Link href="/auth/signin">
                          <Button className="w-full">登录</Button>
                        </Link>
                      </>
                    ) : session.user.role !== 'student' ? (
                      <p className="text-gray-600">只有学生可以加入项目</p>
                    ) : project.status !== 'published' ? (
                      <p className="text-gray-600">项目尚未发布</p>
                    ) : isProjectFull() ? (
                      <p className="text-gray-600">项目名额已满</p>
                    ) : (
                      <p className="text-gray-600">无法加入项目</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Tags */}
            {project.tags && project.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Tag className="w-5 h-5 text-purple-600" />
                    <span>项目标签</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
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
                  <span>发起组织</span>
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
                    <p className="text-sm text-gray-600">非营利组织</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  致力于推动社会积极变化，为学生提供实践学习机会。
                </p>
              </CardContent>
            </Card>

            {/* Recent Participants */}
            {participations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
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
                      </div>
                    ))}
                    {participations.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{participations.length - 5} 更多参与者
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