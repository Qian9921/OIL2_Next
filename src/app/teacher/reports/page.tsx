"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getParticipations, getProject, getUser } from "@/lib/firestore";
import { Participation, Project, User } from "@/lib/types";
import { 
  BarChart3, 
  Download,
  TrendingUp,
  Users,
  Award,
  Clock,
  BookOpen,
  Target,
  PieChart,
  FileText,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";

interface ReportData {
  totalStudents: number;
  totalProjects: number;
  completionRate: number;
  averageProgress: number;
  projectStats: ProjectReport[];
  studentStats: StudentReport[];
  timeDistribution: TimeReport[];
}

interface ProjectReport {
  id: string;
  title: string;
  ngoName: string;
  participantCount: number;
  completionRate: number;
  averageProgress: number;
}

interface StudentReport {
  id: string;
  name: string;
  projectCount: number;
  completedProjects: number;
  averageProgress: number;
  totalHours: number;
}

interface TimeReport {
  month: string;
  activeStudents: number;
  completedProjects: number;
  newParticipations: number;
}

export default function TeacherReportsPage() {
  const { data: session } = useSession();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string>("overview");
  const { toast } = useToast();

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      // Get all participations and related data
      const allParticipations = await getParticipations({});
      
      // Group by student and project
      const studentMap = new Map<string, Participation[]>();
      const projectMap = new Map<string, Participation[]>();
      
      for (const participation of allParticipations) {
        // Group by student
        if (!studentMap.has(participation.studentId)) {
          studentMap.set(participation.studentId, []);
        }
        studentMap.get(participation.studentId)!.push(participation);
        
        // Group by project
        if (!projectMap.has(participation.projectId)) {
          projectMap.set(participation.projectId, []);
        }
        projectMap.get(participation.projectId)!.push(participation);
      }

      // 并行计算项目统计数据
      const projectStatsPromises = Array.from(projectMap.entries()).map(async ([projectId, participations]) => {
        try {
          const project = await getProject(projectId);
          if (project) {
            const completedCount = participations.filter(p => p.status === 'completed').length;
            const averageProgress = participations.reduce((sum, p) => sum + p.progress, 0) / participations.length;
            
            return {
              id: projectId,
              title: project.title,
              ngoName: project.ngoName,
              participantCount: participations.length,
              completionRate: Math.round((completedCount / participations.length) * 100),
              averageProgress: Math.round(averageProgress)
            };
          }
          return null;
        } catch (error) {
          console.error(`Error loading project ${projectId}:`, error);
          return null;
        }
      });

      // 并行计算学生统计数据
      const studentStatsPromises = Array.from(studentMap.entries()).map(async ([studentId, participations]) => {
        try {
          const student = await getUser(studentId);
          if (student && student.role === 'student') {
            const completedProjects = participations.filter(p => p.status === 'completed').length;
            const averageProgress = participations.reduce((sum, p) => sum + p.progress, 0) / participations.length;
            
            return {
              id: studentId,
              name: student.name,
              projectCount: participations.length,
              completedProjects,
              averageProgress: Math.round(averageProgress),
              totalHours: participations.length * 10 // Estimated
            };
          }
          return null;
        } catch (error) {
          console.error(`Error loading student ${studentId}:`, error);
          return null;
        }
      });

      // 等待所有统计数据计算完成
      const [projectStatsResults, studentStatsResults] = await Promise.all([
        Promise.all(projectStatsPromises),
        Promise.all(studentStatsPromises)
      ]);

      const projectStats = projectStatsResults.filter((item): item is ProjectReport => item !== null);
      const studentStats = studentStatsResults.filter((item): item is StudentReport => item !== null);

      // Calculate overall stats
      const totalStudents = studentMap.size;
      const totalProjects = projectMap.size;
      const totalCompletedParticipations = allParticipations.filter(p => p.status === 'completed').length;
      const completionRate = allParticipations.length > 0 ? 
        Math.round((totalCompletedParticipations / allParticipations.length) * 100) : 0;
      const averageProgress = allParticipations.length > 0 ?
        Math.round(allParticipations.reduce((sum, p) => sum + p.progress, 0) / allParticipations.length) : 0;

      // Time distribution (simplified)
      const timeDistribution: TimeReport[] = [
        { month: 'Jan', activeStudents: Math.floor(totalStudents * 0.6), completedProjects: 2, newParticipations: 5 },
        { month: 'Feb', activeStudents: Math.floor(totalStudents * 0.7), completedProjects: 3, newParticipations: 8 },
        { month: 'Mar', activeStudents: Math.floor(totalStudents * 0.8), completedProjects: 4, newParticipations: 12 },
        { month: 'Apr', activeStudents: totalStudents, completedProjects: 5, newParticipations: 15 }
      ];

      setReportData({
        totalStudents,
        totalProjects,
        completionRate,
        averageProgress,
        projectStats,
        studentStats,
        timeDistribution
      });

    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = (format: 'pdf' | 'excel' | 'csv') => {
    // In a real implementation, this would generate actual reports
    toast({
      title: "Feature Coming Soon",
      description: `Generating ${format.toUpperCase()} report...`,
      variant: "default"
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading reports data..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600 mt-2">
              Generate insights and reports on student progress 📊
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => generateReport('pdf')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => generateReport('excel')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Report Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-4">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'students', label: 'Student Performance', icon: Users },
                { id: 'projects', label: 'Project Analytics', icon: BookOpen },
                { id: 'trends', label: 'Trends', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedReport(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                    selectedReport === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overview Report */}
        {selectedReport === 'overview' && reportData && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-blue-600">
                    {reportData.totalStudents}
                  </div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.totalProjects}
                  </div>
                  <div className="text-sm text-gray-600">Active Projects</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-purple-600">
                    {reportData.completionRate}%
                  </div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-orange-600">
                    {reportData.averageProgress}%
                  </div>
                  <div className="text-sm text-gray-600">Average Progress</div>
                </CardContent>
              </Card>
            </div>

            {/* Top Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Projects</CardTitle>
                <CardDescription>Projects with highest completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.projectStats
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .slice(0, 5)
                    .map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{project.title}</h4>
                        <p className="text-sm text-gray-600">by {project.ngoName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {project.completionRate}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {project.participantCount} participants
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student Performance Report */}
        {selectedReport === 'students' && reportData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Performance Overview</CardTitle>
                <CardDescription>Individual student progress and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">Student Name</th>
                        <th className="text-left p-4">Projects</th>
                        <th className="text-left p-4">Completed</th>
                        <th className="text-left p-4">Avg Progress</th>
                        <th className="text-left p-4">Est. Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.studentStats
                        .sort((a, b) => b.averageProgress - a.averageProgress)
                        .map((student) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{student.name}</td>
                          <td className="p-4">{student.projectCount}</td>
                          <td className="p-4">{student.completedProjects}</td>
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${student.averageProgress}%` }}
                                />
                              </div>
                              <span className="text-sm">{student.averageProgress}%</span>
                            </div>
                          </td>
                          <td className="p-4">{student.totalHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Project Analytics Report */}
        {selectedReport === 'projects' && reportData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Analytics</CardTitle>
                <CardDescription>Detailed project performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {reportData.projectStats.map((project) => (
                    <div key={project.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{project.title}</h4>
                        <span className="text-sm text-gray-500">by {project.ngoName}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {project.participantCount}
                          </div>
                          <div className="text-xs text-gray-600">Participants</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            {project.completionRate}%
                          </div>
                          <div className="text-xs text-gray-600">Completion</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">
                            {project.averageProgress}%
                          </div>
                          <div className="text-xs text-gray-600">Avg Progress</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trends Report */}
        {selectedReport === 'trends' && reportData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>Student engagement and project completion over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Simple trend visualization */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Monthly Active Students</h4>
                      <div className="space-y-2">
                        {reportData.timeDistribution.map((data) => (
                          <div key={data.month} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{data.month}</span>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${(data.activeStudents / Math.max(...reportData.timeDistribution.map(d => d.activeStudents))) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{data.activeStudents}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Project Completions</h4>
                      <div className="space-y-2">
                        {reportData.timeDistribution.map((data) => (
                          <div key={data.month} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{data.month}</span>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${(data.completedProjects / Math.max(...reportData.timeDistribution.map(d => d.completedProjects))) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{data.completedProjects}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 