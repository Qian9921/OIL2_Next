import React from 'react';

import { MainLayout } from '@/components/layout/main-layout';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function TaskPageLoadingSkeleton() {
  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-6 md:px-6 xl:grid xl:h-[calc(100dvh-6.75rem)] xl:grid-rows-[auto_minmax(0,1fr)] xl:overflow-hidden">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-10 w-80" />
              <SkeletonBlock className="h-4 w-56" />
            </div>
            <SkeletonBlock className="h-10 w-44" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:min-h-0 xl:grid-cols-[1.1fr_1.2fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:min-h-0 xl:overflow-hidden">
            <SkeletonBlock className="h-7 w-52" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
          <div className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-0 xl:overflow-hidden">
            <div className="space-y-3 border-b p-6">
              <SkeletonBlock className="h-7 w-52" />
              <SkeletonBlock className="h-4 w-80" />
            </div>
            <div className="flex-1 space-y-4 overflow-hidden bg-slate-50 p-6">
              <SkeletonBlock className="h-24 w-[72%]" />
              <SkeletonBlock className="ml-auto h-20 w-[58%]" />
              <SkeletonBlock className="h-28 w-[68%]" />
            </div>
            <div className="border-t bg-white p-4">
              <SkeletonBlock className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export function ProjectAuthoringLoadingSkeleton({ title }: { title: string }) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-40" />
          <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-200/80 px-4 py-2 text-3xl font-bold text-slate-300">{title}</div>
          <SkeletonBlock className="h-4 w-72" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <SkeletonBlock className="h-7 w-52" />
                <SkeletonBlock className="h-9 w-36" />
              </div>
              <div className="space-y-4">
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-32 w-full" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SkeletonBlock className="h-12 w-full" />
                  <SkeletonBlock className="h-12 w-full" />
                  <SkeletonBlock className="h-12 w-full" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <SkeletonBlock className="h-7 w-48" />
                <SkeletonBlock className="h-9 w-40" />
              </div>
              <div className="space-y-4">
                <SkeletonBlock className="h-28 w-full" />
                <SkeletonBlock className="h-28 w-full" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SkeletonBlock className="h-7 w-44" />
              <div className="mt-4 space-y-3">
                <SkeletonBlock className="h-20 w-full" />
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-16 w-full" />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SkeletonBlock className="h-7 w-40" />
              <div className="mt-4 space-y-3">
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export function ProjectListLoadingSkeleton() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-3">
            <SkeletonBlock className="h-10 w-48" />
            <SkeletonBlock className="h-4 w-72" />
          </div>
          <SkeletonBlock className="h-10 w-44" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <SkeletonBlock className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-8 w-16" />
                  <SkeletonBlock className="h-4 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <SkeletonBlock className="h-6 w-52" />
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-20 w-full" />
                <div className="flex gap-2">
                  <SkeletonBlock className="h-8 w-24" />
                  <SkeletonBlock className="h-8 w-20" />
                </div>
                <SkeletonBlock className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

export function ProjectDetailLoadingSkeleton() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-10 w-96" />
          <SkeletonBlock className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SkeletonBlock className="h-40 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SkeletonBlock className="h-7 w-44" />
              <div className="mt-4 space-y-3">
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SkeletonBlock className="h-7 w-36" />
              <div className="mt-4 space-y-3">
                <SkeletonBlock className="h-20 w-full" />
                <SkeletonBlock className="h-20 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
