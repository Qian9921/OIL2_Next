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
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <div className={`bg-white shadow-lg transition-all duration-300 relative flex flex-col ${
        isSidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 flex-1 flex flex-col">
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-8">
            <Monitor className="h-8 w-8 text-blue-600" />
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
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
              className={`w-full flex items-center justify-center space-x-2 text-red-600 border-red-200 hover:bg-red-50 ${
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
        <header className="bg-white shadow-sm border-b px-6 py-4">
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
              <h2 className="text-lg font-semibold text-gray-800">
                {t('header.title')}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{t('header.admin')}</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">{t('header.online')}</span>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}; 