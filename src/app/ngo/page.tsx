"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { getNGODashboard } from "@/lib/firestore";
import { NGODashboard } from "@/lib/types";
import { 
  FolderOpen, 
  Users, 
  Trophy, 
  AlertCircle,
  Plus,
  TrendingUp,
  BarChart3
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
        <PageHero
          eyebrow="NGO workspace"
          icon={TrendingUp}
          title={`Welcome back, ${session?.user?.name || "builder"}`}
          description="Track the projects your organization has launched, understand learner engagement, and create new opportunities with a calm, student-friendly experience."
          actions={
            <Link href="/ngo/projects/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
            </Link>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatTile label="Published Projects" value={dashboard?.publishedProjects || 0} icon={FolderOpen} tone="blue" hint="Projects that students can join right now." />
          <StatTile label="Total Participants" value={dashboard?.totalParticipants || 0} icon={Users} tone="green" hint="Students currently learning with your organization." />
          <StatTile label="Completed Projects" value={dashboard?.completedProjects || 0} icon={Trophy} tone="purple" hint="Projects students have successfully finished." />
          <StatTile label="Pending Reviews" value={dashboard?.pendingReviews || 0} icon={AlertCircle} tone="amber" hint="Submissions that still need your attention." />
        </div>

        {/* Project Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-rose-600" />
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
              Manage your organization's projects and impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              
              <Link href="/ngo/profile">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-rose-50">
                  <TrendingUp className="w-6 h-6 text-rose-600" />
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
