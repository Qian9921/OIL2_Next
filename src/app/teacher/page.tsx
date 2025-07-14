"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getTeacherDashboard, getParticipations, getProject } from "@/lib/firestore";
import { TeacherDashboard, Participation, Project } from "@/lib/types";
import { generateAvatar, getStatusColor } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  Users, 
  BookOpen, 
  AlertCircle,
  TrendingUp,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  Award,
  FileText,
  BarChart3,
  Mail
} from "lucide-react";
import Link from "next/link";
import { EmailDialog } from "@/components/teacher/email-dialog";

interface StudentProject extends Participation {
  project: Project;
}

export default function TeacherDashboardPage() {
  const { data: session } = useSession();
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [studentProjects, setStudentProjects] = useState<StudentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    try {
      const [dashboardData, participationsData] = await Promise.all([
        getTeacherDashboard(session!.user!.id),
        getParticipations({}) // Get all participations for student overview
      ]);
      
      setDashboard(dashboardData);
      
      // 并行加载最近参与项目的详细信息
      const recentParticipations = participationsData.slice(0, 10);
      const projectPromises = recentParticipations.map(async (participation) => {
        try {
          const project = await getProject(participation.projectId);
          if (project) {
            return {
              ...participation,
              project
            };
          }
          return null;
        } catch (error) {
          console.error(`Error loading project for participation ${participation.id}:`, error);
          return null;
        }
      });
      
      const studentProjectResults = await Promise.all(projectPromises);
      const studentProjectsWithDetails = studentProjectResults.filter(
        (item): item is StudentProject => item !== null
      );
      
      setStudentProjects(studentProjectsWithDetails);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    
    if (hours < 1) return 'Less than 1 hour ago';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1 week ago';
    return `${weeks} weeks ago`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading dashboard..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {session?.user?.name}! 👩‍🏫
              </h1>
              <p className="text-green-100">
                Monitor your students' progress and guide them on their learning journey.
              </p>
            </div>
            <div>
              <EmailDialog
                trigger={
                                      <Button
                      variant="secondary"
                      size="lg"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Send Email
                    </Button>
                }
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Students Supervised
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboard?.studentsSupervised || 0}
              </div>
              <p className="text-xs text-gray-500">
                Active learners
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Projects Supervised
              </CardTitle>
              <BookOpen className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboard?.projectsSupervised || 0}
              </div>
              <p className="text-xs text-gray-500">
                Ongoing projects
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Reviews
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboard?.pendingReviews || 0}
              </div>
              <p className="text-xs text-gray-500">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Recent Submissions</span>
              </CardTitle>
              <CardDescription>
                Latest student work submitted for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.recentSubmissions && dashboard.recentSubmissions.length > 0 ? (
                  dashboard.recentSubmissions.map((submission) => (
                    <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            src={generateAvatar(submission.studentId)}
                            alt="Student"
                            size="sm"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">Student Submission</h4>
                            <p className="text-xs text-gray-500">
                              {formatTimeAgo(submission.submittedAt)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {submission.content}
                      </p>
                      <div className="flex space-x-2">
                        <Link href="/teacher/submissions">
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                        </Link>
                        <Link href="/teacher/submissions">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Comment
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions yet</h3>
                    <p className="text-gray-600">Student submissions will appear here when available.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Student Projects Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Student Projects</span>
              </CardTitle>
              <CardDescription>
                Overview of students' project progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentProjects.length > 0 ? (
                  studentProjects.map((studentProject) => (
                    <div key={studentProject.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            src={generateAvatar(studentProject.studentId)}
                            alt={studentProject.studentName}
                            size="sm"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">
                              {studentProject.studentName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {studentProject.project.title}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(studentProject.status)}`}>
                          {studentProject.status.charAt(0).toUpperCase() + studentProject.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Progress</span>
                          <span className="text-xs font-medium text-gray-700">
                            {studentProject.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${studentProject.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>NGO: {studentProject.project.ngoName}</span>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>Joined {formatTimeAgo(studentProject.joinedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No active projects</h3>
                    <p className="text-gray-600">Student projects will appear here when students join projects.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/teacher/students">
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  <span>View All Students</span>
                </Button>
              </Link>
              
              <Link href="/teacher/submissions">
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                  <FileText className="w-6 h-6 text-purple-600" />
                  <span>Review Submissions</span>
                </Button>
              </Link>
              
              <Link href="/teacher/reports">
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <span>Generate Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started Notice */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Getting Started with Teacher Features</CardTitle>
            <CardDescription className="text-blue-700">
              New to the teacher dashboard? Here's how to get started:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium text-blue-900">Create Sample Data</h4>
                  <p className="text-blue-700 text-sm">Visit <Link href="/admin" className="underline hover:text-blue-800">/admin</Link> to create sample submissions for testing the review functionality.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium text-blue-900">Monitor Students</h4>
                  <p className="text-blue-700 text-sm">Use the Students page to view all learners and their project progress.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium text-blue-900">Review Work</h4>
                  <p className="text-blue-700 text-sm">Check the Submissions page to review and provide feedback on student assignments.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 