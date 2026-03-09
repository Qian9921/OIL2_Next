"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
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
        <PageHero
          eyebrow="Student workspace"
          icon={BookOpen}
          title={`Welcome back, ${session?.user?.name || "learner"}`}
          description="This is your calm learning home: track live projects, keep momentum with Tutor, and pick the clearest next step without getting overwhelmed."
          actions={
            <>
              <Link href="/student/my-projects">
                <Button variant="outline">
                  <BookOpen className="mr-2 h-4 w-4" />
                  My Projects
                </Button>
              </Link>
              <Link href="/student/projects">
                <Button>
                  Browse Projects
                </Button>
              </Link>
            </>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatTile label="Active Projects" value={dashboard?.activeProjects || 0} icon={BookOpen} tone="blue" hint="Continue the work you already started." />
          <StatTile label="Learning Hours" value={dashboard?.totalHours || 0} icon={Clock} tone="purple" hint="Time you've invested in real projects." />

          {hasPromptMetrics ? (
            <PromptQualitySummary
              averageScore={dashboard!.promptQualityMetrics!.averageScore}
              bestStreak={dashboard!.promptQualityMetrics!.bestStreak}
              totalPrompts={dashboard!.promptQualityMetrics!.totalPrompts}
              goodPromptsPercentage={dashboard!.promptQualityMetrics!.goodPromptsPercentage}
            />
          ) : (
            <StatTile label="Completed Projects" value={dashboard?.completedProjects || 0} icon={Trophy} tone="green" hint="Finished projects that built real skills." />
          )}

          <Link href="/student/certificates">
            <div className="h-full">
              <StatTile label="Certificates" value={dashboard?.certificates || 0} icon={Award} tone="amber" hint={dashboard?.certificates ? "Your achievements are ready to open." : "Finish projects to unlock certificates."} />
            </div>
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
                  <Calendar className="w-5 h-5 text-indigo-600" />
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
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-indigo-50">
                  <Award className="w-6 h-6 text-indigo-600" />
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
