"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MonitorLayout } from '@/components/monitor/monitor-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { getMonitorStudents, StudentMonitorData } from '@/lib/monitor-data';
import { useI18n } from '@/lib/i18n';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  Award,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Check
} from 'lucide-react';

export default function StudentsListPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [students, setStudents] = useState<StudentMonitorData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentMonitorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'excellent' | 'good' | 'average' | 'needs_attention'>('all');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, statusFilter, performanceFilter]);

  const loadStudents = async () => {
    try {
      const studentsData = await getMonitorStudents();
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.status === statusFilter);
    }

    // 表现过滤
    if (performanceFilter !== 'all') {
      filtered = filtered.filter(student => student.performance === performanceFilter);
    }

    setFilteredStudents(filtered);
  };

  const getStatusBadge = (status: 'online' | 'offline') => {
    if (status === 'online') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
          {t('status.online')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1"></div>
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
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span className="mr-1">{badge.icon}</span>
        {t(badge.labelKey)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <MonitorLayout>
        <LoadingState text={t('students.loading')} />
      </MonitorLayout>
    );
  }

  return (
    <MonitorLayout>
      <div className="space-y-6">
        {/* 页面标题和统计 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('students.list.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('students.list.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {t('students.list.total')}: <span className="font-semibold">{students.length}</span> {t('students.list.students.count')}
            </div>
            <div className="text-sm text-gray-600">
              {t('students.list.online.count')}: <span className="font-semibold text-green-600">
                {students.filter(s => s.status === 'online').length}
              </span>
            </div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 搜索框 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('students.search.placeholder2')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 状态过滤 */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">{t('students.filter.all.status')}</option>
                  <option value="online">{t('status.online')}</option>
                  <option value="offline">{t('status.offline')}</option>
                </select>
              </div>

              {/* 表现过滤 */}
              <div className="flex items-center space-x-2">
                <select
                  value={performanceFilter}
                  onChange={(e) => setPerformanceFilter(e.target.value as any)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">{t('students.filter.all.performance')}</option>
                  <option value="excellent">{t('students.filter.excellent')}</option>
                  <option value="good">{t('students.filter.good')}</option>
                  <option value="average">{t('students.filter.average')}</option>
                  <option value="needs_attention">{t('students.filter.needs.attention')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 学生列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <CardDescription className="text-sm">{student.email}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(student.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 表现状态 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('students.table.performance')}:</span>
                  {getPerformanceBadge(student.performance)}
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4 text-gray-600 mr-1" />
                    </div>
                    <div className="font-semibold text-gray-900">{student.totalHours}h</div>
                    <div className="text-gray-600">{t('students.card.learning.hours')}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <BookOpen className="w-4 h-4 text-gray-600 mr-1" />
                    </div>
                    <div className="font-semibold text-gray-900">{student.completedProjects}</div>
                    <div className="text-gray-600">{t('students.card.projects.completed')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Award className="w-4 h-4 text-gray-600 mr-1" />
                    </div>
                    <div className="font-semibold text-gray-900">{student.certificates}</div>
                    <div className="text-gray-600">{t('students.card.certificates')}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-600 mr-1" />
                    </div>
                    <div className="font-semibold text-gray-900">{student.lastActive}</div>
                    <div className="text-gray-600">{t('students.card.last.active')}</div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/admin/monitor/students/${student.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('students.card.view.details')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 无结果状态 */}
        {filteredStudents.length === 0 && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('students.no.results')}
              </h3>
              <p className="text-gray-600">
                {t('students.no.results.desc')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MonitorLayout>
  );
} 