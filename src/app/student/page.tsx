"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStudentDashboard } from "@/lib/firestore";
import { StudentDashboard } from "@/lib/types";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  Award,
  Calendar,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { PromptQualitySummary, RecentPromptsCard, RecentActivityCard } from "@/components/task/dashboard-components";
import { useRouter } from "next/navigation";

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboard();
    }
  }, [session]);

  const loadDashboard = async () => {
    try {
      const data = await getStudentDashboard(session!.user!.id);
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
        <LoadingState text="Loading dashboard..." />
      </MainLayout>
    );
  }

  // Check if prompt metrics are available
  const hasPromptMetrics = dashboard?.promptQualityMetrics && 
    dashboard.promptQualityMetrics.totalPrompts > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session?.user?.name}! 🌟
          </h1>
          <p className="text-pink-100">
            Ready to make a positive impact today? Let's continue your learning journey!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Projects
              </CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboard?.activeProjects || 0}
              </div>
              <p className="text-xs text-gray-500">
                Projects in progress
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Learning Hours
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {dashboard?.totalHours || 0}
              </div>
              <p className="text-xs text-gray-500">
                Hours invested
              </p>
            </CardContent>
          </Card>

          {hasPromptMetrics ? (
            <PromptQualitySummary
              averageScore={dashboard!.promptQualityMetrics!.averageScore}
              bestStreak={dashboard!.promptQualityMetrics!.bestStreak}
              totalPrompts={dashboard!.promptQualityMetrics!.totalPrompts}
              goodPromptsPercentage={dashboard!.promptQualityMetrics!.goodPromptsPercentage}
            />
          ) : (
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Completed Projects
                </CardTitle>
                <Trophy className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboard?.completedProjects || 0}
                </div>
                <p className="text-xs text-gray-500">
                  Successfully finished
                </p>
              </CardContent>
            </Card>
          )}

          <Link href="/student/certificates">
            <Card className="card-hover cursor-pointer transition-all hover:shadow-lg hover:shadow-yellow-200 border-yellow-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700">
                  My Certificates 🏆
                </CardTitle>
                <Award className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {dashboard?.certificates || 0}
                </div>
                <p className="text-xs text-yellow-600">
                  {dashboard?.certificates ? 'View & Download →' : 'None earned yet'}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity / Prompt History Section */}
          {hasPromptMetrics ? (
            <RecentPromptsCard 
              prompts={dashboard!.promptQualityMetrics!.recentPrompts}
              onViewAllClick={() => router.push('/student/prompts-history')}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  Your latest learning milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(activity.timestamp.toDate())}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent activity</p>
                    <p className="text-sm">Start a project to see your progress here!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prompt Tips or Deadlines */}
          {hasPromptMetrics ? (
            <RecentActivityCard
              activities={dashboard!.recentActivity}
              onViewAllClick={() => router.push('/student/projects')}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span>Upcoming Deadlines</span>
                </CardTitle>
                <CardDescription>
                  Important dates to remember
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.upcomingDeadlines && dashboard.upcomingDeadlines.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.upcomingDeadlines.map((deadline) => (
                      <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{deadline.title}</p>
                          <p className="text-sm text-gray-600">{deadline.projectTitle}</p>
                          <p className="text-xs text-gray-500">
                            Due: {deadline.dueDate.toDate().toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          deadline.priority === 'high' ? 'bg-red-500' :
                          deadline.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No upcoming deadlines</p>
                    <p className="text-sm">You're all caught up!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Jump into your most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link href="/student/projects">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  <span>Browse Projects</span>
                </Button>
              </Link>
              
              <Link href="/student/my-projects">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-green-50">
                  <Trophy className="w-6 h-6 text-green-600" />
                  <span>My Projects</span>
                </Button>
              </Link>
              
              <Link href="/student/certificates">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-yellow-50">
                  <Award className="w-6 h-6 text-yellow-600" />
                  <span>My Certificates</span>
                </Button>
              </Link>
              
              <Link href="/student/profile">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-purple-50">
                  <Award className="w-6 h-6 text-purple-600" />
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