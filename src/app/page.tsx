"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, Building, ArrowRight, Sparkles, Code, Terminal, Heart, Award, Globe } from "lucide-react";
import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";
import { FeatureBadge } from "@/components/ui/feature-badge";
import { MetricCard, SimpleProgressBar } from "@/components/ui/metric-card";
import { InfoBanner } from "@/components/ui/info-banner";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.role) {
        // Users with a role are redirected to the dashboard
        router.push(`/${session.user.role}`);
      } else if (session.user.needsRoleSelection) {
        // Users who need to select a role are redirected to the login page
        router.push("/auth/signin");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 flex items-center justify-center">
        <LoadingState text="Loading..." />
      </div>
    );
  }

  // Loading is displayed only when authenticated and with a role
  if (status === "authenticated" && session?.user?.role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 flex items-center justify-center">
        <LoadingState text="Redirecting to dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-indigo-300 mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-[10%] w-72 h-72 rounded-full bg-purple-300 mix-blend-multiply filter blur-3xl animation-delay-2000"></div>
          <div className="absolute bottom-20 left-[20%] w-80 h-80 rounded-full bg-blue-300 mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10">
          <div className="text-center md:text-left flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-12">
              {/* Logo */}
              <div className="flex items-center justify-center md:justify-start mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <span className="ml-4 text-4xl font-bold gradient-text">OpenImpactLab</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Master <span className="gradient-text">Generative AI</span> & Prompt Engineering
              </h1>

              <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl">
                Learn how to craft high-quality AI prompts through real-world projects with students, teachers, and NGOs. Get feedback on your prompts and develop in-demand skills for social impact.
              </p>

              {/* Benefits Badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                <FeatureBadge 
                  text="Real-time Feedback" 
                  color="indigo"
                  icon={(
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                />
                <FeatureBadge 
                  text="NGO Certificates" 
                  color="purple"
                  icon={(
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                />
                <FeatureBadge 
                  text="Portfolio Building" 
                  color="green"
                  icon={(
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                />
              </div>

              {/* Waitlist Form */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 max-w-md mb-6">
                <div className="text-sm font-medium text-gray-800 mb-2">Get early access to our AI prompt engineering courses:</div>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 py-2 px-4 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-r-lg transition-colors">
                    Join
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">Get notified when we launch. No spam, we promise!</div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center md:justify-start">
                <Link href="/auth/signin">
                  <Button size="lg" className="text-lg px-8 py-4 h-auto shadow-lg transition-all hover:translate-y-[-2px] bg-indigo-600 hover:bg-indigo-700">
                    Get Early Access
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto border-2 border-indigo-300 text-indigo-700">
                    View Sample Prompts
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Hero Image/Illustration */}
            <div className="md:w-1/2 mt-12 md:mt-0 flex justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                <div className="relative">
                  <div className="relative shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
                    <div className="bg-white rounded-2xl p-6 flex flex-col items-center space-y-5">
                      <div className="w-full bg-indigo-50 rounded-xl p-4">
                        <div className="text-sm font-medium text-indigo-800 mb-2">Your Prompt:</div>
                        <div className="bg-white rounded-lg p-3 border border-indigo-200 text-gray-700">
                          Design an AI solution to help local NGOs track water quality in rural communities. Include visualizations for public awareness and an alert system for dangerous contamination levels.
                        </div>
                      </div>
                      
                      <div className="w-full bg-purple-50 rounded-xl p-4">
                        <div className="text-sm font-medium text-purple-800 mb-2">Prompt Quality Analysis:</div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-white rounded border border-purple-100 p-2 text-center">
                            <p className="font-medium text-xs text-purple-900">Goal</p>
                            <p className="text-sm text-purple-700">90%</p>
                          </div>
                          <div className="bg-white rounded border border-purple-100 p-2 text-center">
                            <p className="font-medium text-xs text-purple-900">Context</p>
                            <p className="text-sm text-purple-700">75%</p>
                          </div>
                          <div className="bg-white rounded border border-purple-100 p-2 text-center">
                            <p className="font-medium text-xs text-purple-900">Expectations</p>
                            <p className="text-sm text-purple-700">85%</p>
                          </div>
                          <div className="bg-white rounded border border-purple-100 p-2 text-center">
                            <p className="font-medium text-xs text-purple-900">Source</p>
                            <p className="text-sm text-purple-700">65%</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">Overall: 79%</span>
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '79%' }}></div>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Good Prompt! 🔥</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-blue-50 rounded-xl p-4">
                        <div className="text-sm font-medium text-blue-800 mb-2">Feedback:</div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200 text-gray-700 text-sm">
                          <p>Strong goal and expectations. Consider adding:</p>
                          <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li>More context about specific regions</li>
                            <li>Existing data sources or constraints</li>
                            <li>Target audience for visualizations</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Auction Partnership Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-200 opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-red-200 opacity-20 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Time Auction 合作项目</h2>
                  <p className="text-lg text-gray-600">与专业志愿服务平台合作，提供真实的NGO项目体验</p>
                </div>
              </div>
              <Link href="/time-auction">
                <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg">
                  探索项目
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-orange-100">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">专业技能匹配</h3>
                <p className="text-sm text-gray-600">根据您的技能和兴趣，匹配最适合的NGO志愿项目</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">独特奖励体验</h3>
                <p className="text-sm text-gray-600">完成项目后获得独特的学习机会和体验奖励</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-pink-100">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">全球影响力</h3>
                <p className="text-sm text-gray-600">参与国际NGO项目，创造真正的社会影响</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What You'll Learn Section */}
      <div className="bg-gradient-to-br from-indigo-100 to-purple-100 py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-1/4 w-64 h-64 rounded-full bg-indigo-300 mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-purple-300 mix-blend-multiply filter blur-3xl animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-full animate-pulse-glow">
                Our 4-Dimension Prompt Framework
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Master the <span className="gradient-text">Science of Prompting</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Learn our research-backed framework to craft effective prompts across any AI tool or platform
            </p>
          </div>
          
          {/* Skills Grid */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard
                title="Goal"
                icon={(
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                color="indigo"
              >
                <SimpleProgressBar progress={90} color="indigo" className="mb-3 mt-1" />
                <p className="text-gray-700">Learn to craft prompts with specific, clear goals using action verbs and targeted questions to get precise AI responses</p>
              </MetricCard>
              
              <MetricCard
                title="Context"
                icon={(
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                color="purple"
              >
                <SimpleProgressBar progress={75} color="purple" className="mb-3 mt-1" />
                <p className="text-gray-700">Master the art of providing essential background information and explaining why you need specific outputs for more relevant AI responses</p>
              </MetricCard>
              
              <MetricCard
                title="Expectations"
                icon={(
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                )}
                color="blue"
              >
                <SimpleProgressBar progress={85} color="blue" className="mb-3 mt-1" />
                <p className="text-gray-700">Learn to specify format, length, tone, and audience preferences to get responses perfectly tailored to your needs</p>
              </MetricCard>
              
              <MetricCard
                title="Source"
                icon={(
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )}
                color="amber"
              >
                <SimpleProgressBar progress={65} color="amber" className="mb-3 mt-1" />
                <p className="text-gray-700">Discover how to reference existing knowledge, constraints, and data sources to ground AI responses in accurate information</p>
              </MetricCard>
            </div>
            
            <InfoBanner
              title="Prompt Streak System"
              description="Build a streak of high-quality prompts to earn badges and track your improvement over time"
              icon={<span className="text-lg font-bold">🔥</span>}
              badge="Real-time Feedback"
              variant="primary"
              className="mt-8"
              iconContainerClassName="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md"
            />
            
            {/* Certificate highlight */}
            <InfoBanner
              title="NGO-Certified Portfolio Projects"
              description="Complete real-world projects and receive official certificates from NGOs to showcase in your professional portfolio"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
              badge="Career Boost"
              variant="secondary"
              className="mt-4"
              iconContainerClassName="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Who Can Benefit Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Who Can Join <span className="gradient-text">OpenImpactLab?</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform connects students, teachers, and NGOs to create social impact through AI prompt engineering
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Beginners */}
          <Card className="card-hover border-0 shadow-lg p-6 text-center relative">
            <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-lg">Students</div>
            <CardHeader className="pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Master prompt engineering with real-time feedback on your prompts. Track your improvement with our 4-dimension scoring system and earn streak badges as you progress.
              </p>
              <div className="mb-4">
                <FeatureBadge 
                  text="Earn NGO certificates for your portfolio"
                  color="green"
                  icon={(
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                  className="w-full justify-center py-2"
                />
              </div>
              <Link href="/auth/signin?role=student">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Join as a Student</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Professionals */}
          <Card className="card-hover border-0 shadow-lg p-6 text-center relative">
            <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-lg">NGOs</div>
            <CardHeader className="pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <Building className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">NGOs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Create real-world challenges for students to solve using AI prompt engineering. Our quality assessment tools ensure you'll receive well-crafted solutions to your organization's needs.
              </p>
              <div className="mb-4">
                <FeatureBadge 
                  text="Issue certificates to successful students"
                  color="purple"
                  icon={(
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                  className="w-full justify-center py-2"
                />
              </div>
              <Link href="/auth/signin?role=ngo">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">Register Your NGO</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Experts */}
          <Card className="card-hover border-0 shadow-lg p-6 text-center relative">
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-lg">Teachers</div>
            <CardHeader className="pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Guide students with our detailed prompt analysis framework. Monitor student progress through comprehensive analytics on prompt quality and provide targeted assistance where needed.
              </p>
              <Link href="/auth/signin?role=teacher">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Join as a Teacher</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="galaxy absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Level Up Your AI Prompting Skills
              </h2>
              <p className="text-xl text-indigo-100 mb-6 max-w-2xl mx-auto">
                Join our platform to master the 4-dimension prompt framework and get real-time feedback on your prompts while collaborating on projects that make a real difference.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/auth/signin">
                  <Button variant="secondary" size="lg" className="text-lg px-8 py-4 h-auto bg-white text-indigo-600 hover:bg-gray-100 shadow-lg">
                    Join OpenImpactLab
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <div className="flex items-center text-white bg-indigo-700/30 backdrop-blur-sm rounded-full px-4 py-1.5">
                  <span className="mr-2 text-sm">🚀</span>
                  <span className="text-sm font-medium">Limited early access spots available!</span>
                </div>
              </div>
              
              {/* Certificate Banner */}
              <InfoBanner
                title="Build Your Professional Portfolio"
                description="Complete real-world projects and receive official certificates from participating NGOs to showcase your AI prompt engineering skills to potential employers."
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                }
                variant="dark"
                className="mt-8 max-w-2xl mx-auto"
                iconContainerClassName="bg-white rounded-full p-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">OpenImpactLab</span>
            </div>
            <p className="text-gray-500 text-sm text-center md:text-right">
              © 2024 OpenImpactLab. All rights reserved. Master GenAI prompting for social impact - launching soon.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Add these styles to the existing globals.css file for animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .galaxy {
          background: radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
        }
      `}</style>
    </div>
  );
}
