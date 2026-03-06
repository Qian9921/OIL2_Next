"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getDefaultRouteForRole } from "@/lib/role-routing";
import { generateAvatar } from "@/lib/utils";
import { 
  Home, 
  FolderOpen, 
  BookOpen, 
  Settings, 
  LogOut,
  Heart,
  Sparkles,
  Award,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

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
        { label: "Browse Projects", href: "/student/projects", icon: FolderOpen },
        { label: "My Projects", href: "/student/my-projects", icon: BookOpen },
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

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  const navItems = getNavItems(session?.user?.role || "");
  const homeRoute = getDefaultRouteForRole(session?.user?.role);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-purple-100">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-purple-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <Link href={homeRoute} className="text-xl font-bold gradient-text">
              OpenImpactLab
            </Link>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-purple-100">
          <div className="flex items-center space-x-3">
            <Avatar
              src={session?.user?.avatar || generateAvatar(session?.user?.email || "")}
              alt={session?.user?.name || "User"}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {session?.user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-purple-600" : ""}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-purple-100">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-purple-100 h-16 flex-shrink-0 flex items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="text-lg font-semibold text-gray-800">
              Welcome to OpenImpactLab!
            </span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6 page-transition overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
} 
