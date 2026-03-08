"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logoutFromMonitor } from '@/lib/monitor-auth';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from './language-switcher';
import { 
  Monitor, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Home,
  User,
  Activity
} from 'lucide-react';

interface MonitorLayoutProps {
  children: React.ReactNode;
}

export const MonitorLayout: React.FC<MonitorLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { t } = useI18n();

  const handleLogout = async () => {
    await logoutFromMonitor();
    router.push('/admin/monitor/login');
  };

  const navigation = [
    {
      name: t('sidebar.dashboard'),
      href: '/admin/monitor/dashboard',
      icon: Home,
      current: pathname === '/admin/monitor/dashboard'
    },
    {
      name: t('sidebar.students'),
      href: '/admin/monitor/students',
      icon: Users,
      current: pathname === '/admin/monitor/students'
    },
    {
      name: t('sidebar.realtime'),
      href: '/admin/monitor/realtime',
      icon: Activity,
      current: pathname === '/admin/monitor/realtime'
    },
    {
      name: t('sidebar.analytics'),
      href: '/admin/analytics',
      icon: BarChart3,
      current: pathname === '/admin/analytics'
    },
    {
      name: t('sidebar.settings'),
      href: '/admin/settings',
      icon: Settings,
      current: pathname === '/admin/settings'
    }
  ];

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,248,246,0.98),rgba(255,255,255,0.95)_38%,rgba(244,248,255,0.97)_100%)]">
      {/* 侧边栏 */}
      <div className={`relative flex flex-col border-r border-white/70 bg-white/82 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-300 ${
        isSidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 flex-1 flex flex-col">
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-8">
            <Monitor className="h-8 w-8 text-indigo-400" />
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-800">{t('sidebar.title')}</h1>
            )}
          </div>

          {/* 导航菜单 */}
          <nav className="space-y-2 flex-1">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    item.current
                      ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </button>
              );
            })}
          </nav>

          {/* 底部退出按钮 */}
          <div className="mt-auto">
            <Button
              onClick={handleLogout}
              variant="outline"
              className={`w-full flex items-center justify-center space-x-2 text-rose-500 border-rose-200 hover:bg-rose-50 ${
                isSidebarCollapsed ? 'px-2' : ''
              }`}
            >
              <LogOut className="h-4 w-4" />
              {!isSidebarCollapsed && <span>{t('sidebar.logout')}</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <header className="border-b border-white/70 bg-white/72 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-slate-800">
                {t('header.title')}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span>{t('header.admin')}</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">{t('header.online')}</span>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
