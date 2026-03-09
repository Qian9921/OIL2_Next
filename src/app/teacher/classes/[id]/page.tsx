"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getClass, getStudentsByClass, leaveClass, getClassDashboard } from "@/lib/firestore";
import { Class, StudentWithClass, ClassDashboard } from "@/lib/types";
import { 
  Users, 
  ArrowLeft, 
  Copy, 
  UserMinus,
  BookOpen,
  FileText,
  Clock,
  TrendingUp,
  Mail,
  Calendar,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { generateAvatar, getStatusColor } from "@/lib/utils";
import Link from "next/link";

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [dashboard, setDashboard] = useState<ClassDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentToRemove, setStudentToRemove] = useState<StudentWithClass | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const classId = params.id as string;

  useEffect(() => {
    if (classId && session?.user?.id) {
      loadClassData();
    }
  }, [classId, session]);

  const loadClassData = async () => {
    try {
      const [classInfo, classStudents, classDashboard] = await Promise.all([
        getClass(classId),
        getStudentsByClass(classId),
        getClassDashboard(classId)
      ]);

      if (!classInfo) {
        toast({
          title: "Class not found",
          description: "The class you're looking for doesn't exist or has been deleted.",
          variant: "destructive"
        });
        router.push("/teacher/classes");
        return;
      }

      // 检查权限
      if (classInfo.teacherId !== session?.user?.id) {
        toast({
          title: "Permission denied",
          description: "You don't have permission to view this class",
          variant: "destructive"
        });
        router.push("/teacher/classes");
        return;
      }

      setClassData(classInfo);
      setStudents(classStudents);
      setDashboard(classDashboard);
    } catch (error) {
      console.error("Error loading class data:", error);
      toast({
        title: "Error",
        description: "Failed to load class data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return;

    setIsRemoving(true);
    try {
      const result = await leaveClass(studentToRemove.id, classId);
      
      if (result.success) {
        toast({
          title: "Remove successful",
          description: result.message,
          variant: "default"
        });
        await loadClassData();
      } else {
        toast({
          title: "Remove failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error removing student:", error);
      toast({
        title: "Remove failed",
        description: "Failed to remove student. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRemoving(false);
      setStudentToRemove(null);
    }
  };

  const copyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "Copied",
      description: "Invite code copied to clipboard!",
      variant: "default"
    });
  };

  const formatDate = (timestamp: any) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProjectProgress = (student: StudentWithClass) => {
    if (!student.participations || student.participations.length === 0) {
      return { active: 0, completed: 0, averageProgress: 0 };
    }

    const active = student.participations.filter(p => p.status === 'active').length;
    const completed = student.participations.filter(p => p.status === 'completed').length;
    const totalProgress = student.participations.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress = student.participations.length > 0 ? Math.round(totalProgress / student.participations.length) : 0;

    return { active, completed, averageProgress };
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading class details..." />
      </MainLayout>
    );
  }

  if (!classData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Class not found</h2>
          <p className="text-gray-600 mb-6">The class you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/teacher/classes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classes
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 移除学生确认对话框 */}
        <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm remove student</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p>
                    Are you sure you want to remove student "{studentToRemove?.name}" from class "{classData.name}"?
                  </p>
                  <p className="mt-4 font-medium">This action will:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Remove the class association from the student's account</li>
                    <li>The student will need to use the invite code to join the class again</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemoving}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveStudent}
                disabled={isRemoving}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRemoving ? 'Removing...' : 'Confirm remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/teacher/classes")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回班级列表
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
              <p className="text-gray-600 mt-2">
                {classData.description || 'No description provided'}
              </p>
            </div>
          </div>
        </div>

        {/* 班级信息卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 班级基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Class Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 邀请码 */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Invite Code</p>
                      <p className="text-lg font-mono text-blue-800">{classData.inviteCode}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInviteCode(classData.inviteCode)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 班级详情 */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Created: {formatDate(classData.createdAt)}</span>
                  </div>
                  {classData.maxStudents && (
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>Max Students: {classData.maxStudents}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 统计信息 */}
          {dashboard && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span>Project Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{dashboard.activeProjects}</div>
                      <div className="text-sm text-gray-600">Active Projects</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{dashboard.completedProjects}</div>
                      <div className="text-sm text-gray-600">Completed Projects</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span>Students and Reviews</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{dashboard.totalStudents}</div>
                      <div className="text-sm text-gray-600">Total Students</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{dashboard.pendingSubmissions}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* 学生列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Class Students ({students.length})</span>
              </div>
              {dashboard && dashboard.pendingSubmissions > 0 && (
                <Link href="/teacher/submissions">
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    View Pending Reviews ({dashboard.pendingSubmissions})
                  </Button>
                </Link>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length > 0 ? (
              <div className="space-y-4">
                {students.map((student) => {
                  const progress = getProjectProgress(student);
                  return (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <Avatar
                          src={generateAvatar(student.id)}
                          alt={student.name}
                          size="md"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{student.name}</h4>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.profile?.school && (
                            <p className="text-xs text-gray-500">{student.profile.school}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* 项目进度 */}
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">{progress.active}</div>
                          <div className="text-xs text-gray-600">Active Projects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-600">{progress.completed}</div>
                          <div className="text-xs text-gray-600">Completed Projects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-blue-600">{progress.averageProgress}%</div>
                          <div className="text-xs text-gray-600">Average Progress</div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStudentToRemove(student)}
                          >
                            <UserMinus className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No students yet</h3>
                <p className="text-gray-600 mb-4">
                  Share the invite code with students to get them started
                </p>
                <Button
                  variant="outline"
                  onClick={() => copyInviteCode(classData.inviteCode)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Invite Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 