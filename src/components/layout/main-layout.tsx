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
  match: "exact" | "prefix";
}

const getNavItems = (role: string): NavItem[] => {
  switch (role) {
    case "student":
      return [
        { label: "Dashboard", href: "/student", icon: Home, match: "exact" },
        { label: "Browse", href: "/student/projects", icon: FolderOpen, match: "prefix" },
        { label: "My Work", href: "/student/my-projects", icon: BookOpen, match: "prefix" },
        { label: "Profile", href: "/student/profile", icon: Settings, match: "prefix" },
      ];
    case "ngo":
      return [
        { label: "Dashboard", href: "/ngo", icon: Home, match: "exact" },
        { label: "Projects", href: "/ngo/projects", icon: FolderOpen, match: "prefix" },
        { label: "Certificates", href: "/ngo/certificates", icon: Award, match: "prefix" },
        { label: "Profile", href: "/ngo/profile", icon: Settings, match: "prefix" },
      ];
    default:
      return [];
  }
};

function isActivePath(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = getNavItems(session?.user?.role || "");
  const homeRoute = getDefaultRouteForRole(session?.user?.role) ?? "/";

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,248,246,0.98),rgba(255,255,255,0.94)_38%,rgba(244,248,255,0.97)_100%)]"
      style={{ ["--app-shell-top-offset" as string]: "1.5rem" }}
    >
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
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-rose-100/60 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-sky-100/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-amber-100/45 blur-3xl" />
      </div>

      <aside className="fixed inset-y-4 left-4 z-40 hidden w-72 lg:flex">
        <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/78 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <ShineBorder borderWidth={1} duration={16} shineColor={["rgba(129,140,248,0.12)", "rgba(251,191,186,0.12)", "rgba(125,211,252,0.1)"]} />

          <div className="relative overflow-hidden rounded-[1.6rem] border border-white/80 bg-gradient-to-br from-white via-rose-50/70 to-sky-50/85 px-4 py-5 shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-sky-100/45 via-transparent to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-400 to-sky-400 text-white shadow-lg shadow-indigo-100/80">
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

          <div className="mt-4 rounded-[1.6rem] border border-white/80 bg-white/75 p-4 shadow-sm">
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
              const active = isActivePath(pathname, item);

              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                      active
                        ? "border-white/80 bg-gradient-to-r from-indigo-400 to-sky-400 text-white shadow-md shadow-indigo-100/90"
                        : "border-transparent bg-white/55 text-slate-600 hover:border-white/80 hover:bg-white/85 hover:text-slate-900 hover:shadow-sm"
                    }`}
                  >
                    <div className="relative flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-500"
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
              <Sparkles className="h-5 w-5 flex-shrink-0 text-indigo-400" />
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
        <main className="flex-1 px-4 pb-28 pt-4 lg:px-6 lg:pb-8 lg:pt-6">
          <div className="page-transition">{children}</div>
        </main>

        {navItems.length > 0 && (
          <nav className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/88 px-2 py-2 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <ShineBorder borderWidth={1} duration={12} shineColor={["rgba(129,140,248,0.12)", "rgba(251,191,186,0.1)", "rgba(125,211,252,0.08)"]} />
              <div className="relative grid grid-cols-4 gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item);

                  return (
                    <Link key={item.href} href={item.href} className="block">
                      <div
                        className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all ${
                          active
                            ? "bg-gradient-to-r from-indigo-400 to-sky-400 text-white shadow-md shadow-indigo-100/80"
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
