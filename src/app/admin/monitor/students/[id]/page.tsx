"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MonitorLayout } from '@/components/monitor/monitor-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { isMonitorAuthenticated } from '@/lib/monitor-auth';
import { getStudentDetails, StudentMonitorData } from '@/lib/monitor-data';
import { useI18n } from '@/lib/i18n';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const [student, setStudent] = useState<StudentMonitorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isMonitorAuthenticated()) {
      router.push('/admin/monitor/login');
      return;
    }

    if (params.id) {
      loadStudentDetails();
    }
  }, [router, params.id]);

  const loadStudentDetails = async () => {
    try {
      const studentData = await getStudentDetails(params.id as string);
      setStudent(studentData);
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MonitorLayout>
        <LoadingState text={t('student.detail.loading')} />
      </MonitorLayout>
    );
  }

  if (!student) {
    return (
      <MonitorLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('common.error')}</h2>
          <p className="text-gray-600">{t('student.detail.not.found')}</p>
          <Button 
            onClick={() => router.push('/admin/monitor/students')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.detail.back')}
          </Button>
        </div>
      </MonitorLayout>
    );
  }

  const getStatusBadge = (status: 'online' | 'offline') => {
    if (status === 'online') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          {t('status.online')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
        <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
        {t('status.offline')}
      </span>
    );
  };

  const getPerformanceBadge = (performance: StudentMonitorData['performance']) => {
    const badges = {
      excellent: { bg: 'bg-green-100', text: 'text-green-800', icon: '🌟', labelKey: 'students.performance.excellent' },
      good: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '👍', labelKey: 'students.performance.good' },
      average: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '📊', labelKey: 'students.performance.average' },
      needs_attention: { bg: 'bg-red-100', text: 'text-red-800', icon: '⚠️', labelKey: 'students.performance.needs.attention' }
    };
    
    const badge = badges[performance];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <span className="mr-2">{badge.icon}</span>
        {t(badge.labelKey)}
      </span>
    );
  };

  return (
    <MonitorLayout>
      <div className="space-y-6">
        {/* 页面标题和导航 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/monitor/students')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('student.detail.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('student.detail.title')}</h1>
              <p className="text-gray-600 mt-1">{student.name} - {t('student.detail.activity.info')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(student.status)}
            {getPerformanceBadge(student.performance)}
          </div>
        </div>

        {/* 学生概览信息 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>{t('student.detail.basic.info')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-600">{t('student.detail.name')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{student.email}</p>
                  <p className="text-sm text-gray-600">{t('student.detail.email')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{student.joinDate}</p>
                  <p className="text-sm text-gray-600">{t('student.detail.join.date')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{student.lastActive}</p>
                  <p className="text-sm text-gray-600">{t('student.detail.last.login')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 学习统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>{t('student.detail.study.stats')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{student.totalHours}h</div>
                  <div className="text-sm text-gray-600">{t('student.detail.total.hours')}</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{student.completedProjects}</div>
                  <div className="text-sm text-gray-600">{t('student.detail.completed.projects')}</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{student.certificates}</div>
                  <div className="text-sm text-gray-600">{t('student.detail.certificates.earned')}</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{student.activeProjects}</div>
                  <div className="text-sm text-gray-600">{t('activity.recent.title')}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 活动信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span>{t('student.detail.activity.info')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('student.detail.current.status')}:</span>
                {getStatusBadge(student.status)}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('student.detail.weekly.logins')}:</span>
                  <span className="font-medium">{student.loginFrequency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('student.detail.page.views')}:</span>
                  <span className="font-medium">{student.pageViews}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('student.detail.avg.session.time')}:</span>
                  <span className="font-medium">{student.avgSessionTime} {t('common.minutes')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 最近活动 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>{t('student.detail.recent.activities')}</span>
            </CardTitle>
            <CardDescription>
              {t('student.detail.activity.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {student.recentActivities && student.recentActivities.length > 0 ? (
                student.recentActivities.map((activity, index) => {
                  // 翻译活动文本
                  const getTranslatedAction = (action: string) => {
                    switch(action) {
                      case '注册账户': return t('activity.register.account');
                      case '加入项目': return t('activity.join.project');
                      case '完成项目': return t('activity.complete.project');
                      case '获得证书': return t('activity.earn.certificate');
                      default: return action;
                    }
                  };
                  
                  const getTranslatedDetails = (details: string) => {
                    if (details === '新用户注册') {
                      return t('activity.new.user.registration');
                    }
                    if (details.startsWith('参与项目: ')) {
                      const projectName = details.replace('参与项目: ', '');
                      return `${t('activity.participate.project')}: ${projectName}`;
                    }
                    if (details.startsWith('完成项目: ')) {
                      const projectName = details.replace('完成项目: ', '');
                      return `${t('activity.completed.project')}: ${projectName}`;
                    }
                    if (details.includes(' - 证书编号: ')) {
                      const [projectName, certNumber] = details.split(' - 证书编号: ');
                      return `${projectName} - ${t('activity.certificate.number')}: ${certNumber}`;
                    }
                    return details;
                  };
                  
                  return (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{getTranslatedAction(activity.action)}</p>
                        <p className="text-xs text-gray-600">{getTranslatedDetails(activity.details)}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{t('student.detail.no.activities')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 操作区域 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t('student.detail.data.last.updated')}: {new Date().toLocaleString()}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={loadStudentDetails}>
                  <Activity className="w-4 h-4 mr-2" />
                  {t('common.refresh')}
                </Button>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  {t('student.detail.contact.student')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MonitorLayout>
  );
} 