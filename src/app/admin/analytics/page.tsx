"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/monitor/language-switcher';
import { 
  Users, 
  ArrowLeft,
  Download,
  Award,
  Target,
  BookOpen,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  totalParticipations: number;
  totalCertificates: number;
  totalSubmissions: number;
  activeUsersByRole: {
    student: number;
    ngo: number;
  };
  legacyUsersByRole: {
    teacher: number;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  useI18n();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/admin/analytics', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`);
      }

      const data = (await response.json()) as AnalyticsData;
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    if (!analyticsData) return;
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      ...analyticsData
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color,
    description 
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    description?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading || !analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">正在加载分析数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>返回</span>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">数据分析</h1>
                <p className="text-sm text-gray-600">
                  最后更新: {lastUpdated.toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <Button
                onClick={loadAnalyticsData}
                variant="outline"
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>刷新数据</span>
              </Button>
              <Button
                onClick={exportReport}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>导出报告</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 关键指标概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="总用户数"
            value={analyticsData.totalUsers}
            icon={Users}
            color="bg-blue-600"
            description={`学生: ${analyticsData.activeUsersByRole.student}, NGO: ${analyticsData.activeUsersByRole.ngo}, 遗留Teacher: ${analyticsData.legacyUsersByRole.teacher}`}
          />
          <MetricCard
            title="项目总数"
            value={analyticsData.totalProjects}
            icon={BookOpen}
            color="bg-purple-600"
            description="平台上的所有项目"
          />
          <MetricCard
            title="参与总数"
            value={analyticsData.totalParticipations}
            icon={Target}
            color="bg-green-600"
            description="学生参与项目的总次数"
          />
          <MetricCard
            title="颁发证书"
            value={analyticsData.totalCertificates}
            icon={Award}
            color="bg-orange-600"
            description="学生获得的成就证书总数"
          />
        </div>

        {/* 详细分析标签页 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="users">用户分析</TabsTrigger>
            <TabsTrigger value="projects">项目分析</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>平台统计概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>总用户数</span>
                      <span className="font-semibold">{analyticsData.totalUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>总项目数</span>
                      <span className="font-semibold">{analyticsData.totalProjects}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>总参与数</span>
                      <span className="font-semibold">{analyticsData.totalParticipations}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>总证书数</span>
                      <span className="font-semibold">{analyticsData.totalCertificates}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>总提交数</span>
                      <span className="font-semibold">{analyticsData.totalSubmissions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>用户角色分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>学生用户</span>
                      <span className="font-semibold text-blue-600">{analyticsData.activeUsersByRole.student}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>NGO / 审核方</span>
                      <span className="font-semibold text-purple-600">{analyticsData.activeUsersByRole.ngo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>遗留 Teacher</span>
                      <span className="font-semibold text-green-600">{analyticsData.legacyUsersByRole.teacher}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>学生用户</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {analyticsData.activeUsersByRole.student}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">注册学生总数</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>NGO / 审核方</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {analyticsData.activeUsersByRole.ngo}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">活跃 NGO / 审核账号总数</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>遗留 Teacher</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {analyticsData.legacyUsersByRole.teacher}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">仅保留兼容的旧角色账号</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>项目统计</CardTitle>
                <CardDescription>平台项目相关的统计信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{analyticsData.totalProjects}</div>
                    <p className="text-sm text-gray-600">总项目数</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{analyticsData.totalParticipations}</div>
                    <p className="text-sm text-gray-600">总参与数</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{analyticsData.totalCertificates}</div>
                    <p className="text-sm text-gray-600">颁发证书</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{analyticsData.totalSubmissions}</div>
                    <p className="text-sm text-gray-600">项目提交</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 
