"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmailDialog } from "@/components/teacher/email-dialog";
import { getNGODashboard } from "@/lib/firestore";
import { NGODashboard } from "@/lib/types";
import { 
  FolderOpen, 
  Users, 
  Trophy, 
  AlertCircle,
  Plus,
  TrendingUp,
  BarChart3,
  ClipboardCheck,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";

export default function NGODashboardPage() {
  const { data: session } = useSession();
  const [dashboard, setDashboard] = useState<NGODashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboard();
    }
  }, [session]);

  const loadDashboard = async () => {
    try {
      const data = await getNGODashboard(session!.user!.id);
      setDashboard(data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading dashboard data..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session?.user?.name}! 🚀
          </h1>
          <p className="text-purple-100 mb-4">
            Monitor your projects and see the impact you are creating in the community.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/ngo/projects/create">
              <Button variant="secondary" className="bg-white text-purple-600 hover:bg-gray-100">
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
            </Link>
            <Link href="/ngo/submissions">
              <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-white/20">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Review Submissions
              </Button>
            </Link>
            <EmailDialog
              trigger={
                <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-white/20">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              }
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Published Projects
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboard?.publishedProjects || 0}
              </div>
              <p className="text-xs text-gray-500">
                Active projects
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Participants
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboard?.totalParticipants || 0}
              </div>
              <p className="text-xs text-gray-500">
                Students engaged
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completed Projects
              </CardTitle>
              <Trophy className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {dashboard?.completedProjects || 0}
              </div>
              <p className="text-xs text-gray-500">
                Successfully finished
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

        {/* Project Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span>Project Performance</span>
            </CardTitle>
            <CardDescription>
              Overview of your project engagement and completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard?.projectStats && dashboard.projectStats.length > 0 ? (
              <div className="space-y-4">
                {dashboard.projectStats.map((stat) => (
                  <div key={stat.projectId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{stat.projectTitle}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {stat.participants} participants
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Completion Rate</div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${stat.completionRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{Math.round(stat.completionRate)}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Average Progress</div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${stat.averageProgress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{Math.round(stat.averageProgress)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No project statistics available</p>
                <p className="text-sm">Create your first project to see performance data!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your organization projects and impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link href="/ngo/projects/create">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50">
                  <Plus className="w-6 h-6 text-blue-600" />
                  <span>Create Project</span>
                </Button>
              </Link>
              
              <Link href="/ngo/projects">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-green-50">
                  <FolderOpen className="w-6 h-6 text-green-600" />
                  <span>Manage Projects</span>
                </Button>
              </Link>

              <Link href="/ngo/submissions">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-amber-50">
                  <ClipboardCheck className="w-6 h-6 text-amber-600" />
                  <span>Review Work</span>
                </Button>
              </Link>
              
              <Link href="/ngo/profile">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-purple-50">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                  <span>View Profile</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 
