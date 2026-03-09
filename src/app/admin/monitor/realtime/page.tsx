"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MonitorLayout } from '@/components/monitor/monitor-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { getMonitorStudents, StudentMonitorData } from '@/lib/monitor-data';
import { useI18n } from '@/lib/i18n';
import { 
  Activity, 
  Users, 
  Clock, 
  Eye, 
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function RealtimeMonitorPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [students, setStudents] = useState<StudentMonitorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadRealtimeData();

    // 设置自动刷新
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadRealtimeData();
      }, 10000); // 每10秒刷新一次
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadRealtimeData = async () => {
    try {
      const studentsData = await getMonitorStudents();
      setStudents(studentsData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading realtime data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MonitorLayout>
        <LoadingState text={t('common.loading')} />
      </MonitorLayout>
    );
  }

  const onlineStudents = students.filter(s => s.status === 'online');
  const recentlyActiveStudents = students.filter(s => {
    const lastActiveTime = new Date(s.lastActive);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActiveTime.getTime()) / (1000 * 60);
    return diffInMinutes <= 30; // 30分钟内活跃
  });

  return (
    <MonitorLayout>
      <div className="space-y-6">
        {/* 页面标题和控制 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('realtime.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('realtime.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span>{t('realtime.auto.refresh')}: {autoRefresh ? t('realtime.on') : t('realtime.off')}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? t('realtime.stop') : t('realtime.start')}{t('realtime.auto.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRealtimeData}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{t('realtime.manual.refresh')}</span>
            </Button>
          </div>
        </div>

        {/* 实时状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('realtime.currently.online')}
              </CardTitle>
              <Wifi className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {onlineStudents.length}
              </div>
              <p className="text-xs text-gray-500">
                {t('realtime.online.desc')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('realtime.recently.active')}
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {recentlyActiveStudents.length}
              </div>
              <p className="text-xs text-gray-500">
                {t('realtime.active.desc')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('realtime.system.status')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-500">
                {t('realtime.status.normal')}
              </div>
              <p className="text-xs text-gray-500">
                {t('realtime.status.desc')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('realtime.last.updated')}
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-orange-600">
                {lastUpdate.toLocaleTimeString('zh-CN')}
              </div>
              <p className="text-xs text-gray-500">
                {t('realtime.update.time')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 在线学生列表和活动监控 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 当前在线学生 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wifi className="w-5 h-5 text-green-600" />
                <span>{t('realtime.online.list.title')}</span>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {onlineStudents.length}
                </span>
              </CardTitle>
              <CardDescription>
                {t('realtime.online.list.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-3 overflow-y-auto overscroll-contain pr-1">
                {onlineStudents.length > 0 ? (
                  onlineStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-600">{student.email}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/monitor/students/${student.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">{t('realtime.no.online')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 最近活动 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>{t('realtime.recent.list.title')}</span>
              </CardTitle>
              <CardDescription>
                {t('realtime.recent.list.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-3 overflow-y-auto overscroll-contain pr-1">
                {recentlyActiveStudents.length > 0 ? (
                  recentlyActiveStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-600">
                            {student.status === 'online' ? t('realtime.just.logged.in') : `${t('realtime.last.updated')} ${student.lastActive}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          student.status === 'online' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.status === 'online' ? t('status.online') : t('status.offline')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">{t('realtime.no.recent')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 系统状态信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>{t('realtime.system.status')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-green-600">{students.length}</div>
                <div className="text-sm text-gray-600">{t('stats.total.students')}</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">{onlineStudents.length}</div>
                <div className="text-sm text-gray-600">{t('stats.online.now')}</div>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-indigo-500">
                  {Math.round((onlineStudents.length / Math.max(students.length, 1)) * 100)}%
                </div>
                <div className="text-sm text-gray-600">{t('activity.online.students.title')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MonitorLayout>
  );
} 
