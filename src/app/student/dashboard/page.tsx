'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/ui/loading-state';

export default function StudentDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student');
  }, [router]);

  return <LoadingState text="Redirecting to your workspace..." />;
}
