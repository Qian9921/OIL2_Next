"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MonitorLayout } from '@/components/monitor/monitor-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { useI18n } from '@/lib/i18n';
import { 
  getMonitorDashboardStats, 
  getMonitorStudents, 
  validateFirebaseData,
  MonitorDashboardStats, 
  StudentMonitorData 
} from '@/lib/monitor-data';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserPlus, 
  BookOpen, 
  Award, 
  TrendingUp,
  Activity,
  Eye,
  AlertTriangle
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<MonitorDashboardStats | null>(null);
  const [students, setStudents] = useState<StudentMonitorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboardStats, studentsData] = await Promise.all([
        getMonitorDashboardStats(),
        getMonitorStudents()
      ]);
      
      setStats(dashboardStats);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MonitorLayout>
        <LoadingState text={t('dashboard.loading')} />
      </MonitorLayout>
    );
  }

  const onlineStudents = students.filter(s => s.status === 'online');
  const needsAttentionStudents = students.filter(s => s.performance === 'needs_attention');

  return (
    <MonitorLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-gray-600 mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Activity className="h-4 w-4 text-green-500" />
              <span>{t('dashboard.system.status')}</span>
            </div>
            <Button 
              onClick={async () => {
                const result = await validateFirebaseData();
                if (result) {
                  alert(`数据验证成功！\n学生: ${result.students}\n项目: ${result.projects}\n参与记录: ${result.participations}\n证书: ${result.certificates}`);
                }
              }} 
              variant="outline" 
              size="sm"
            >
              {t('dashboard.validate.data')}
            </Button>
            <Button onClick={loadDashboardData} variant="outline" size="sm">
              {t('dashboard.refresh.data')}
            </Button>
          </div>
        </div>

        {/* 主要统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('stats.total.students')}
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.totalStudents}
              </div>
              <p className="text-xs text-gray-500">
                {t('stats.total.students.desc')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('stats.active.students')}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.activeStudents}
              </div>
              <p className="text-xs text-gray-500">
                {t('stats.active.students.desc')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('stats.online.now')}
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats?.onlineNow}
              </div>
              <p className="text-xs text-gray-500">
                {t('stats.online.now.desc')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('stats.new.registrations')}
              </CardTitle>
              <UserPlus className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.newRegistrations}
              </div>
              <p className="text-xs text-gray-500">
                {t('stats.new.registrations.desc')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 项目和成就统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('stats.total.projects')}
              </CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProjects}</div>
              <p className="text-xs text-gray-500">{t('stats.total.projects.desc')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('stats.completed.projects')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedProjects}</div>
              <p className="text-xs text-gray-500">{t('stats.completed.projects.desc')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('stats.certificates.issued')}
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCertificates}</div>
              <p className="text-xs text-gray-500">{t('stats.certificates.issued.desc')}</p>
            </CardContent>
          </Card>
        </div>

        {/* 实时活动和警告 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 当前在线学生 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span>{t('dashboard.current.online.students')}</span>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {onlineStudents.length}
                </span>
              </CardTitle>
              <CardDescription>
                {t('dashboard.current.online.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {onlineStudents.slice(0, 5).map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">{t('dashboard.last.activity')}: {student.lastActive}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/monitor/students/${student.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {onlineStudents.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/admin/monitor/students')}
                  >
                    {t('dashboard.view.all')} {onlineStudents.length} {t('dashboard.view.online.students')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 需要关注的学生 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span>{t('dashboard.needs.attention')}</span>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                  {needsAttentionStudents.length}
                </span>
              </CardTitle>
              <CardDescription>
                {t('dashboard.needs.attention.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {needsAttentionStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">
                          {t('dashboard.last.login')}: {student.lastActive}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/monitor/students/${student.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {needsAttentionStudents.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p>{t('dashboard.no.attention.students')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quick.actions')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              onClick={() => router.push('/admin/monitor/students')}
              className="flex items-center justify-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>{t('dashboard.quick.view.all.students')}</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/admin/monitor/realtime')}
              className="flex items-center justify-center space-x-2"
            >
              <Activity className="h-4 w-4" />
              <span>{t('dashboard.quick.realtime.monitoring')}</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/admin/analytics')}
              className="flex items-center justify-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{t('dashboard.quick.data.analysis')}</span>
            </Button>
            <Button 
              variant="outline"
              onClick={loadDashboardData}
              className="flex items-center justify-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>{t('dashboard.quick.refresh.data')}</span>
            </Button>
          </div>
        </div>
      </div>
    </MonitorLayout>
  );
};

export default function MonitorDashboardPage() {
  return <DashboardContent />;
} 