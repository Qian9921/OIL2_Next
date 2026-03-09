"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createUser } from "@/lib/firestore";
import { getDefaultRouteForRole, SignupRole } from "@/lib/role-routing";
import { generateAvatar } from "@/lib/utils";
import { Heart, GraduationCap, Building } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.role) {
        router.push(getDefaultRouteForRole(session.user.role));
      } else if (session.user.needsRoleSelection) {
        setUserInfo({
          name: session.user.name || "",
          email: session.user.email || "",
        });
        setShowRoleSelection(true);
        setIsLoading(false);
      }
    }
  }, [session, status, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setShowRoleSelection(false);
    
    try {
      const result = await signIn("google", { redirect: false });

      if (result?.error) {
        setError("登录失败：" + result.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("登录过程中出现错误：" + error);
      setIsLoading(false);
    }
  };

  const handleRoleSelection = async (role: SignupRole) => {
    if (!userInfo) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await createUser({
        name: userInfo.name,
        email: userInfo.email,
        role,
        avatar: generateAvatar(userInfo.email),
      });

      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error("Role selection error:", error);
      setError("创建用户失败，请重试：" + error);
      setIsLoading(false);
    }
  };

  if (showRoleSelection && userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-sky-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl gradient-text">Choose Your Role</CardTitle>
            <CardDescription>
              Welcome to OpenImpactLab! Please select your role to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <Button
              onClick={() => handleRoleSelection("student")}
              disabled={isLoading}
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 hover:border-blue-300"
            >
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <div>
                <div className="font-semibold">Student</div>
                <div className="text-xs text-gray-500">Join and complete projects</div>
              </div>
            </Button>

            <Button
              onClick={() => handleRoleSelection("ngo")}
              disabled={isLoading}
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-rose-50 hover:border-rose-200"
            >
              <Building className="w-8 h-8 text-rose-500" />
              <div>
                <div className="font-semibold">NGO</div>
                <div className="text-xs text-gray-500">Create and manage projects</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-sky-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl gradient-text">OpenImpactLab</CardTitle>
          <CardDescription>
            Sign in to start making a positive impact in your community!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm mb-4">
              {error}
            </div>
          )}
          
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-12"
            size="lg"
          >
            {isLoading ? (
              <div className="loading-spinner mr-2" />
            ) : (
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 
