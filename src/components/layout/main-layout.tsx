"use client";

import React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  FolderOpen,
  Heart,
  Home,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";

import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/ui/grid-pattern";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ShineBorder } from "@/components/ui/shine-border";
import { getDefaultRouteForRole } from "@/lib/role-routing";
import { generateAvatar } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const getNavItems = (role: string): NavItem[] => {
  switch (role) {
    case "student":
    case "teacher":
      return [
        { label: "Dashboard", href: "/student", icon: Home },
        { label: "Browse", href: "/student/projects", icon: FolderOpen },
        { label: "My Work", href: "/student/my-projects", icon: BookOpen },
        { label: "Profile", href: "/student/profile", icon: Settings },
      ];
    case "ngo":
      return [
        { label: "Dashboard", href: "/ngo", icon: Home },
        { label: "Projects", href: "/ngo/projects", icon: FolderOpen },
        { label: "Certificates", href: "/ngo/certificates", icon: Award },
        { label: "Profile", href: "/ngo/profile", icon: Settings },
      ];
    default:
      return [];
  }
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/student" || href === "/ngo") {
    return pathname.startsWith(`${href}/`);
  }

  return pathname.startsWith(`${href}/`);
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = getNavItems(session?.user?.role || "");
  const homeRoute = getDefaultRouteForRole(session?.user?.role) ?? "/";
  const activeItem =
    navItems.find((item) => isActivePath(pathname, item.href)) ??
    navItems[0];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,232,255,0.95),rgba(255,255,255,0.9)_38%,rgba(240,249,255,0.92)_100%)]">
      <ScrollProgress />

      <div className="pointer-events-none absolute inset-0">
        <GridPattern
          width={56}
          height={56}
          x={-1}
          y={-1}
          strokeDasharray="3 6"
          squares={[
            [0, 1],
            [4, 0],
            [8, 2],
            [13, 1],
          ]}
          className="opacity-35 [mask-image:radial-gradient(70%_55%_at_50%_10%,white,transparent)]"
        />
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-fuchsia-200/35 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-violet-200/25 blur-3xl" />
      </div>

      <aside className="fixed inset-y-4 left-4 z-40 hidden w-72 lg:flex">
        <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
          <ShineBorder borderWidth={1} duration={16} />

          <div className="relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-gradient-to-br from-white via-white to-fuchsia-50/90 px-4 py-5 shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-cyan-100/50 via-transparent to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-fuchsia-200/60">
                <Heart className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <Link href={homeRoute} className="block text-lg font-semibold text-slate-900">
                  <AnimatedGradientText>OpenImpactLab</AnimatedGradientText>
                </Link>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Social impact learning OS
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar
                src={session?.user?.avatar || generateAvatar(session?.user?.email || "")}
                alt={session?.user?.name || "User"}
                size="md"
                className="ring-2 ring-white/80 shadow-md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{session?.user?.name}</p>
                <p className="truncate text-xs uppercase tracking-[0.16em] text-slate-500">
                  {session?.user?.role || "workspace"}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                      active
                        ? "border-white/80 bg-gradient-to-r from-fuchsia-500/95 via-violet-500/95 to-cyan-500/95 text-white shadow-lg shadow-violet-200/60"
                        : "border-transparent bg-white/55 text-slate-600 hover:border-white/70 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm"
                    }`}
                  >
                    <div className="relative flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-fuchsia-50 group-hover:text-fuchsia-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className={`text-xs ${active ? "text-white/80" : "text-slate-400"}`}>
                          {active ? "Current workspace" : "Open section"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Keep shipping</p>
                <p className="text-xs leading-5 text-slate-500">
                  High-clarity UI, fast feedback, and smooth learner flow.
                </p>
              </div>
              <Sparkles className="h-5 w-5 flex-shrink-0 text-fuchsia-500" />
            </div>

            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="mt-3 w-full justify-start rounded-2xl border border-transparent bg-white/70 text-slate-600 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col lg:pl-80">
        <header className="sticky top-0 z-30 px-4 pt-4 lg:px-6">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/70 px-4 py-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:px-5 lg:px-6">
            <ShineBorder borderWidth={1} duration={15} />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-fuchsia-100/40 via-transparent to-transparent" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
                  <span>{session?.user?.role || "platform"} workspace</span>
                </div>
                <p className="mt-1 truncate text-lg font-semibold text-slate-900">
                  {activeItem?.label || "Dashboard"}
                </p>
                <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                  Premium learning flow, polished task execution, and fast iteration.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm sm:flex">
                  <Avatar
                    src={session?.user?.avatar || generateAvatar(session?.user?.email || "")}
                    alt={session?.user?.name || "User"}
                    size="sm"
                    className="ring-2 ring-white"
                  />
                  <div className="max-w-[10rem]">
                    <p className="truncate text-sm font-semibold text-slate-900">{session?.user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{session?.user?.email}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="hidden rounded-2xl border-white/70 bg-white/80 shadow-sm sm:inline-flex"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 lg:px-6 lg:pb-8">
          <div className="page-transition">{children}</div>
        </main>

        {navItems.length > 0 && (
          <nav className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/85 px-2 py-2 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
              <ShineBorder borderWidth={1} duration={12} />
              <div className="relative grid grid-cols-4 gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link key={item.href} href={item.href} className="block">
                      <div
                        className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all ${
                          active
                            ? "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-md shadow-violet-200/70"
                            : "text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
