"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingState } from '@/components/ui/loading-state';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { isMonitorAuthenticated } from '@/lib/monitor-auth';

const MonitorHomeContent: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    let isMounted = true;

    const redirectToDestination = async () => {
      const authenticated = await isMonitorAuthenticated();

      if (!isMounted) {
        return;
      }

      router.replace(authenticated ? '/admin/monitor/dashboard' : '/admin/monitor/login');
    };

    void redirectToDestination();

    return () => {
      isMounted = false;
    };
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
