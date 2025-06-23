"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginToMonitor, isMonitorAuthenticated } from '@/lib/monitor-auth';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/monitor/language-switcher';
import { 
  Monitor, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function MonitorLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 如果已经登录，直接跳转到监控首页
    if (isMonitorAuthenticated()) {
      router.push('/admin/monitor');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 添加简单的登录延迟以改善用户体验
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const success = loginToMonitor(username, password);
      if (success) {
        router.push('/admin/monitor');
      } else {
        setError(t('login.error.invalid.credentials'));
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(t('login.error.system'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 语言切换器 */}
        <div className="flex justify-end mb-6">
          <LanguageSwitcher />
        </div>

        {/* 登录卡片 */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {t('login.title')}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {t('login.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 系统说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Monitor className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">
                    {t('login.system.description.title')}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {t('login.system.description.content')}
                  </p>
                </div>
              </div>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('login.username')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('login.username.placeholder')}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.password.placeholder')}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('login.logging.in')}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>{t('login.login')}</span>
                  </div>
                )}
              </Button>
            </form>

            {/* 测试凭据说明 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    {t('login.test.credentials.title')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                      <span className="text-gray-600">{t('login.username')}:</span>
                      <code className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">admin</code>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                      <span className="text-gray-600">{t('login.password')}:</span>
                      <code className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">monitor123</code>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {t('login.test.credentials.note')}
                  </p>
                </div>
              </div>
            </div>

            {/* 功能说明 */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">
                {t('login.features.title')}
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>{t('login.features.realtime.monitoring')}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>{t('login.features.student.management')}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>{t('login.features.data.analytics')}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>{t('login.features.activity.tracking')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{t('login.footer.security')} | {t('login.footer.version')}: v2.0.0</p>
        </div>
      </div>
    </div>
  );
} 