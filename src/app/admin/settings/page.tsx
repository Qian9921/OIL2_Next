"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/monitor/language-switcher';
import { 
  Settings, 
  Globe, 
  Monitor,
  Bell,
  Shield,
  ArrowLeft,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  Clock,
  Download
} from 'lucide-react';

interface SystemSettings {
  general: {
    systemName: string;
    defaultLanguage: string;
    timezone: string;
    maxUsers: number;
  };
  monitoring: {
    refreshInterval: number;
    dataRetention: number;
    alertsEnabled: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    adminEmail: string;
    alertThreshold: number;
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    twoFactorEnabled: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      systemName: 'OIL2 学习平台',
      defaultLanguage: 'zh-CN',
      timezone: 'Asia/Shanghai',
      maxUsers: 10000
    },
    monitoring: {
      refreshInterval: 30,
      dataRetention: 365,
      alertsEnabled: true
    },
    notifications: {
      emailEnabled: true,
      adminEmail: 'admin@oil2.org',
      alertThreshold: 100
    },
    security: {
      sessionTimeout: 3600,
      passwordMinLength: 8,
      twoFactorEnabled: false
    }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = localStorage.getItem('adminSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleInputChange = (section: keyof typeof settings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section] as any,
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultSettings: SystemSettings = {
      general: {
        systemName: 'OIL2 学习平台',
        defaultLanguage: 'zh-CN',
        timezone: 'Asia/Shanghai',
        maxUsers: 10000
      },
      monitoring: {
        refreshInterval: 30,
        dataRetention: 365,
        alertsEnabled: true
      },
      notifications: {
        emailEnabled: true,
        adminEmail: 'admin@oil2.org',
        alertThreshold: 100
      },
      security: {
        sessionTimeout: 3600,
        passwordMinLength: 8,
        twoFactorEnabled: false
      }
    };
    
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
                <h1 className="text-xl font-bold text-gray-900">系统设置</h1>
                {lastSaved && (
                  <p className="text-sm text-gray-600">
                    最后保存: {lastSaved.toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <Button
                onClick={exportSettings}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>导出配置</span>
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>重置</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? '保存中...' : '保存设置'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 状态提示 */}
        {hasChanges && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800">您有未保存的更改，请记得保存设置。</span>
          </div>
        )}

        {lastSaved && !hasChanges && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-green-800">设置已成功保存。</span>
          </div>
        )}

        {/* 设置标签页 */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">常规设置</TabsTrigger>
            <TabsTrigger value="monitoring">监控设置</TabsTrigger>
            <TabsTrigger value="notifications">通知设置</TabsTrigger>
            <TabsTrigger value="security">安全设置</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <span>基本信息</span>
                </CardTitle>
                <CardDescription>系统的基本配置信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    系统名称
                  </label>
                  <Input
                    value={settings.general.systemName}
                    onChange={(e) => handleInputChange('general', 'systemName', e.target.value)}
                    placeholder="请输入系统名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    默认语言
                  </label>
                  <select
                    value={settings.general.defaultLanguage}
                    onChange={(e) => handleInputChange('general', 'defaultLanguage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="zh-CN">中文简体</option>
                    <option value="en">English</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    时区
                  </label>
                  <select
                    value={settings.general.timezone}
                    onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Asia/Shanghai">亚洲/上海</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">美国/纽约</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大用户数
                  </label>
                  <Input
                    type="number"
                    value={settings.general.maxUsers}
                    onChange={(e) => handleInputChange('general', 'maxUsers', parseInt(e.target.value))}
                    placeholder="请输入最大用户数"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5 text-green-600" />
                  <span>监控配置</span>
                </CardTitle>
                <CardDescription>系统监控相关的设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    刷新间隔 (秒)
                  </label>
                  <Input
                    type="number"
                    value={settings.monitoring.refreshInterval}
                    onChange={(e) => handleInputChange('monitoring', 'refreshInterval', parseInt(e.target.value))}
                    placeholder="请输入刷新间隔"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数据保留期 (天)
                  </label>
                  <Input
                    type="number"
                    value={settings.monitoring.dataRetention}
                    onChange={(e) => handleInputChange('monitoring', 'dataRetention', parseInt(e.target.value))}
                    placeholder="请输入数据保留天数"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="alertsEnabled"
                    checked={settings.monitoring.alertsEnabled}
                    onChange={(e) => handleInputChange('monitoring', 'alertsEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="alertsEnabled" className="text-sm font-medium text-gray-700">
                    启用系统警报
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-yellow-600" />
                  <span>通知配置</span>
                </CardTitle>
                <CardDescription>系统通知和邮件设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emailEnabled"
                    checked={settings.notifications.emailEnabled}
                    onChange={(e) => handleInputChange('notifications', 'emailEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="emailEnabled" className="text-sm font-medium text-gray-700">
                    启用邮件通知
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    管理员邮箱
                  </label>
                  <Input
                    type="email"
                    value={settings.notifications.adminEmail}
                    onChange={(e) => handleInputChange('notifications', 'adminEmail', e.target.value)}
                    placeholder="请输入管理员邮箱地址"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    警报阈值
                  </label>
                  <Input
                    type="number"
                    value={settings.notifications.alertThreshold}
                    onChange={(e) => handleInputChange('notifications', 'alertThreshold', parseInt(e.target.value))}
                    placeholder="请输入警报阈值"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span>安全配置</span>
                </CardTitle>
                <CardDescription>系统安全相关的设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    会话超时 (秒)
                  </label>
                  <Input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    placeholder="请输入会话超时时间"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    密码最小长度
                  </label>
                  <Input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => handleInputChange('security', 'passwordMinLength', parseInt(e.target.value))}
                    placeholder="请输入密码最小长度"
                    min="6"
                    max="32"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="twoFactorEnabled"
                    checked={settings.security.twoFactorEnabled}
                    onChange={(e) => handleInputChange('security', 'twoFactorEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="twoFactorEnabled" className="text-sm font-medium text-gray-700">
                    启用双因素认证
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 