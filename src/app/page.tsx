"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, GraduationCap, Building, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.role) {
        // 有角色的用户重定向到仪表板
        router.push(`/${session.user.role}`);
      } else if (session.user.needsRoleSelection) {
        // 需要选择角色的用户重定向到登录页面
        router.push("/auth/signin");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  // 只有在已认证且有角色的情况下才显示loading
  if (status === "authenticated" && session?.user?.role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <span className="ml-4 text-4xl font-bold gradient-text">OpenImpactLab</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Make a{" "}
              <span className="gradient-text">Positive Impact</span>
              <br />
              in Your Community
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Connect with NGOs, work on meaningful projects, and develop skills while creating positive change in the world. 🌟
            </p>

            {/* CTA Button */}
            <Link href="/auth/signin">
              <Button size="lg" className="text-lg px-8 py-4 h-auto">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Who Can Join Our Community?
          </h2>
          <p className="text-xl text-gray-600">
            OpenImpactLab brings together three key groups to create meaningful change
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Students */}
          <Card className="card-hover text-center p-8">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Students</CardTitle>
              <CardDescription className="text-lg">
                High school students ready to make a difference
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-left space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  Join meaningful projects
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  Develop real-world skills
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  Earn certificates
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  Build your portfolio
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Teachers */}
          <Card className="card-hover text-center p-8">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Teachers</CardTitle>
              <CardDescription className="text-lg">
                Educators guiding student learning journeys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-left space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  Monitor student progress
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  Provide guidance
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  Review submissions
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  Track learning outcomes
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* NGOs */}
          <Card className="card-hover text-center p-8">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">NGOs</CardTitle>
              <CardDescription className="text-lg">
                Organizations creating positive social impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-left space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                  Create impactful projects
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                  Engage young talent
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                  Scale your mission
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                  Issue certificates
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Start Making an Impact?
            </h2>
            <p className="text-xl text-pink-100 mb-8">
              Join thousands of students, teachers, and NGOs creating positive change
            </p>
            <Link href="/auth/signin">
              <Button variant="secondary" size="lg" className="text-lg px-8 py-4 h-auto bg-white text-purple-600 hover:bg-gray-100">
                Sign Up Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">OpenImpactLab</span>
            </div>
          </div>
          <p className="text-center text-gray-500 mt-4">
            © 2024 OpenImpactLab. Making a positive impact, one project at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
