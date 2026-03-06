"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { LoadingState } from '@/components/ui/loading-state';
import { I18nProvider } from '@/lib/i18n';
import { isMonitorAuthenticated } from '@/lib/monitor-auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      if (pathname === '/admin/monitor/login') {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
        return;
      }

      const authenticated = await isMonitorAuthenticated();

      if (!isMounted) {
        return;
      }

      if (!authenticated) {
        router.replace('/admin/monitor/login');
        return;
      }

      setIsCheckingAuth(false);
    };

    setIsCheckingAuth(true);
    void verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  return (
    <I18nProvider>
      {isCheckingAuth && pathname !== '/admin/monitor/login' ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingState text="Checking admin access..." />
        </div>
      ) : (
        children
      )}
    </I18nProvider>
  );
}
