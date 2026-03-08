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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,248,246,0.98),rgba(255,255,255,0.95)_38%,rgba(244,248,255,0.97)_100%)]">
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
