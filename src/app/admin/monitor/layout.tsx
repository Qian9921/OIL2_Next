'use client';

import { I18nProvider } from '@/lib/i18n';

interface MonitorLayoutProps {
  children: React.ReactNode;
}

export default function MonitorLayout({ children }: MonitorLayoutProps) {
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
  );
} 