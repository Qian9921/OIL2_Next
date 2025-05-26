'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome to your learning dashboard. View your projects and progress.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View and manage your current learning projects</p>
              <Button onClick={() => router.push('/student/my-projects')}>
                Go to My Projects <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Browse Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Discover new learning opportunities</p>
              <Button onClick={() => router.push('/student/projects')}>
                Browse All Projects <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
} 