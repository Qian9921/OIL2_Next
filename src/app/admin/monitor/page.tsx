"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isMonitorAuthenticated } from '@/lib/monitor-auth';
import { LoadingState } from '@/components/ui/loading-state';
import { I18nProvider, useI18n } from '@/lib/i18n';

const MonitorHomeContent: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    // 检查认证状态并重定向
    if (isMonitorAuthenticated()) {
      router.push('/admin/monitor/dashboard');
    } else {
      router.push('/admin/monitor/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingState text={t('common.loading')} />
    </div>
  );
};

export default function MonitorHomePage() {
  return (
    <I18nProvider>
      <MonitorHomeContent />
    </I18nProvider>
  );
} 