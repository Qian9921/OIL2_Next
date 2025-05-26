'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentDashboard } from '@/lib/firestore';
import { StudentDashboard } from '@/lib/types';
import { LoadingState } from '@/components/ui/loading-state';
import { Brain, ArrowLeft, Filter, Search, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScoreBadge, ScoreProgressBar, MetricScoreCard } from '@/components/task/score-components';
import { PromptTipsCard } from '@/components/task/dashboard-components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptFeedbackDisplay } from '@/components/task/feedback-components';

export default function PromptHistoryPage() {
  const { data: session } = useSession();
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPrompts, setFilteredPrompts] = useState<any[]>([]);
  const [sortOption, setSortOption] = useState<'date' | 'quality'>('date');

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboard();
    }
  }, [session]);

  useEffect(() => {
    if (dashboard?.promptQualityMetrics?.recentPrompts) {
      const filtered = dashboard.promptQualityMetrics.recentPrompts.filter(prompt => 
        prompt.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.taskTitle.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Sort by date (newest first) or quality score (highest first)
      const sorted = [...filtered].sort((a, b) => 
        sortOption === 'date' 
          ? b.timestamp.getTime() - a.timestamp.getTime() 
          : b.qualityScore - a.qualityScore
      );
      
      setFilteredPrompts(sorted);
    }
  }, [dashboard, searchQuery, sortOption]);

  const loadDashboard = async () => {
    try {
      const data = await getStudentDashboard(session!.user!.id);
      setDashboard(data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading prompt history..." />
      </MainLayout>
    );
  }

  const hasPromptMetrics = dashboard?.promptQualityMetrics && 
    dashboard.promptQualityMetrics.totalPrompts > 0;

  if (!hasPromptMetrics) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-6">
            <Link href="/student">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-purple-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Prompt History Yet</h2>
            <p className="text-gray-600 mb-6">
              You haven't interacted with AI assistants in your projects yet.
            </p>
            <div className="max-w-md mx-auto">
              <Link href="/student/projects">
                <Button className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Projects to Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Safely access metrics with null check
  const metrics = dashboard?.promptQualityMetrics;
  if (!metrics) {
    return (
      <MainLayout>
        <LoadingState text="Loading metrics..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/student">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Your Prompt History</h1>
          <p className="text-purple-100">
            Review your AI interactions and improve your prompting skills
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-600" />
                Quality Metrics
              </CardTitle>
              <CardDescription>Your prompt performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Overall Quality</div>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xl font-bold text-purple-600">
                    {metrics.averageScore.toFixed(0)}%
                  </div>
                  <ScoreBadge score={metrics.averageScore} />
                </div>
                <ScoreProgressBar score={metrics.averageScore} className="mb-3" />
              </div>
              
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-600 mb-1">Component Scores</div>
                <MetricScoreCard 
                  label="Goal Clarity" 
                  score={metrics.averageGoalScore} 
                  bgColor="bg-blue-50" 
                  borderColor="border-blue-100" 
                  barColor="bg-blue-600" 
                />
                <MetricScoreCard 
                  label="Context" 
                  score={metrics.averageContextScore} 
                  bgColor="bg-green-50" 
                  borderColor="border-green-100" 
                  barColor="bg-green-600" 
                />
                <MetricScoreCard 
                  label="Expectations" 
                  score={metrics.averageExpectationsScore} 
                  bgColor="bg-purple-50" 
                  borderColor="border-purple-100" 
                  barColor="bg-purple-600" 
                />
                <MetricScoreCard 
                  label="Source Material" 
                  score={metrics.averageSourceScore} 
                  bgColor="bg-amber-50" 
                  borderColor="border-amber-100" 
                  barColor="bg-amber-600" 
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                <span>Best streak: <span className="font-semibold text-purple-600">{metrics.bestStreak}🔥</span></span>
                <span>Total: {metrics.totalPrompts}</span>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-3 space-y-6">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">Prompt History</TabsTrigger>
                <TabsTrigger value="tips">Improvement Tips</TabsTrigger>
              </TabsList>
              
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">All Prompts</CardTitle>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-500">Sort by:</div>
                        <Button 
                          variant={sortOption === 'date' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setSortOption('date')}
                        >
                          Date
                        </Button>
                        <Button 
                          variant={sortOption === 'quality' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setSortOption('quality')}
                        >
                          Quality
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search prompts..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-[600px] overflow-y-auto">
                    <div className="space-y-4">
                      {filteredPrompts.length > 0 ? (
                        filteredPrompts.map(prompt => (
                          <div key={prompt.id} className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
                              <div>
                                <div className="font-medium">{prompt.projectTitle}</div>
                                <div className="text-sm text-gray-600">{prompt.taskTitle}</div>
                              </div>
                              <div className="flex flex-col items-end">
                                <ScoreBadge score={prompt.qualityScore} />
                                <div className="text-xs text-gray-500 mt-1">{formatDate(prompt.timestamp)}</div>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="text-sm mb-3">
                                <span className="font-medium">Prompt:</span>
                                <div className="mt-1 p-3 bg-gray-50 rounded border text-gray-800">
                                  {prompt.content}
                                </div>
                              </div>
                              
                              {prompt.feedback && (
                                <div className="text-sm mb-3">
                                  <span className="font-medium">Feedback:</span>
                                  <PromptFeedbackDisplay
                                    feedback={prompt.feedback}
                                    size="sm"
                                    showTitle={false}
                                    className="mt-1"
                                  />
                                </div>
                              )}
                              
                              <div className="text-right">
                                <Link href={`/projects/${prompt.projectId}/task/${prompt.subtaskId}`}>
                                  <Button variant="outline" size="sm">
                                    View in Project
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No prompts found matching your search</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="tips">
                <PromptTipsCard
                  averageGoalScore={metrics.averageGoalScore}
                  averageContextScore={metrics.averageContextScore}
                  averageExpectationsScore={metrics.averageExpectationsScore}
                  averageSourceScore={metrics.averageSourceScore}
                  recentPrompts={filteredPrompts}
                />
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>General Prompt Engineering Tips</CardTitle>
                    <CardDescription>
                      Improve your AI interactions with these best practices
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">1. Be Specific and Clear</h3>
                      <p className="text-sm text-gray-600">
                        Clearly state what you want to achieve. Vague prompts lead to vague responses.
                        Use specific examples or desired outcomes to guide the AI.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">2. Provide Context</h3>
                      <p className="text-sm text-gray-600">
                        Include relevant background information and what you've already tried.
                        For coding tasks, mention the programming language and any relevant libraries.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">3. Structure Your Prompt</h3>
                      <p className="text-sm text-gray-600">
                        Break down complex requests into clear sections. Use numbered points for 
                        multi-part questions or requirements.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">4. Specify Format</h3>
                      <p className="text-sm text-gray-600">
                        Indicate how you want the response formatted (e.g., bullet points, code examples, 
                        step-by-step instructions).
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">5. Iterate and Refine</h3>
                      <p className="text-sm text-gray-600">
                        If the initial response isn't quite right, refine your prompt based on what 
                        you learned from the first attempt.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 