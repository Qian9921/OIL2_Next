"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/monitor/language-switcher';
import { 
  Monitor, 
  Users, 
  BarChart3, 
  Settings, 
  Eye,
  Activity,
  Shield,
  Database,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { t } = useI18n();

  const adminFeatures = [
    {
      title: t('admin.features.student.monitoring'),
      description: t('admin.features.student.monitoring.desc'),
      icon: Monitor,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      path: "/admin/monitor",
      stats: t('admin.features.realtime.monitoring')
    },
    {
      title: t('admin.features.user.management'),
      description: t('admin.features.user.management.desc'),
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      path: "/admin/monitor/students",
      stats: t('admin.features.student.profiles')
    },
    {
      title: t('admin.features.analytics.reports'),
      description: t('admin.features.analytics.reports.desc'),
      icon: BarChart3,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
      path: "/admin/analytics",
      stats: t('admin.features.data.insights')
    },
    {
      title: t('admin.features.system.settings'),
      description: t('admin.features.system.settings.desc'),
      icon: Settings,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      path: "/admin/settings",
      stats: t('admin.features.configuration')
    }
  ];

  const quickActions = [
    {
      title: t('admin.quick.view.dashboard'),
      description: t('admin.quick.view.dashboard.desc'),
      icon: Eye,
      path: "/admin/monitor/dashboard"
    },
    {
      title: t('admin.quick.student.list'),
      description: t('admin.quick.student.list.desc'),
      icon: Users,
      path: "/admin/monitor/students"
    },
    {
      title: t('admin.quick.realtime.monitoring'),
      description: t('admin.quick.realtime.monitoring.desc'),
      icon: Activity,
      path: "/admin/monitor/realtime"
    }
  ];

  const systemStatus = [
    {
      name: t('admin.status.monitoring.system'),
      status: t('admin.status.online'),
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      name: t('admin.status.database'),
      status: t('admin.status.connected'),
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      name: t('admin.status.user.sessions'),
      status: t('admin.status.active'),
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      name: t('admin.status.data.sync'),
      status: t('admin.status.synced'),
      color: "text-indigo-500",
      bgColor: "bg-indigo-100"
    }
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,248,246,0.98),rgba(255,255,255,0.95)_38%,rgba(244,248,255,0.97)_100%)]">
      {/* 页面头部 */}
      <div className="border-b border-white/70 bg-white/78 shadow-sm backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-indigo-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('admin.title')}</h1>
                <p className="text-sm text-gray-600">{t('admin.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{t('admin.system.online')}</span>
              </div>
              <Button
                onClick={() => router.push('/admin/monitor')}
                className="flex items-center space-x-2"
              >
                <Monitor className="h-4 w-4" />
                <span>{t('admin.access.monitoring')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎信息 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.welcome')}</h2>
          <p className="text-lg text-gray-600">
            {t('admin.welcome.desc')}
          </p>
        </div>

        {/* 系统状态概览 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-green-600" />
              <span>{t('admin.system.status.overview')}</span>
            </CardTitle>
            <CardDescription>
              {t('admin.system.status.overview.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {systemStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full mr-2 ${item.bgColor.replace('bg-', 'bg-')}`}></div>
                      <span className={`text-xs font-medium ${item.color}`}>{item.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 主要功能区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {adminFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-3`}>
                    <IconComponent className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{feature.stats}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(feature.path)}
                      className="text-xs p-1 h-auto"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>{t('admin.quick.actions')}</span>
              </CardTitle>
              <CardDescription>
                {t('admin.quick.actions.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{action.title}</p>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(action.path)}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <span>{t('admin.recent.activity')}</span>
              </CardTitle>
              <CardDescription>
                {t('admin.recent.activity.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('admin.activity.monitoring.access')}</p>
                    <p className="text-xs text-gray-600">{t('admin.activity.monitoring.access.desc')}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleString('zh-CN')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('admin.activity.system.init')}</p>
                    <p className="text-xs text-gray-600">{t('admin.activity.system.init.desc')}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleString('zh-CN')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('admin.activity.data.sync')}</p>
                    <p className="text-xs text-gray-600">{t('admin.activity.data.sync.desc')}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {t('admin.footer.version')}: v2.0.0 | {t('admin.footer.last.update')}: {new Date().toLocaleString('zh-CN')}
            </div>
            <div className="flex items-center space-x-4">
              <span>{t('admin.footer.status')}: {t('admin.status.online')}</span>
              <span>{t('admin.footer.uptime')}: 99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
