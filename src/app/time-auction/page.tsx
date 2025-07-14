"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Project } from "@/lib/types";
import { 
  Heart, 
  Users, 
  Search,
  Filter,
  ExternalLink,
  Award,
  Globe,
  Clock,
  MapPin,
  Star
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ProjectCard } from "@/components/project/project-card";
import { LoadingState } from "@/components/ui/loading-state";

export default function TimeAuctionPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadTimeAuctionProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, difficultyFilter, statusFilter]);

  const loadTimeAuctionProjects = async () => {
    try {
      const response = await fetch('/api/time-auction/projects');
      if (response.ok) {
        const timeAuctionProjects = await response.json();
        setProjects(timeAuctionProjects);
      } else {
        throw new Error('Failed to load Time Auction projects');
      }
    } catch (error) {
      console.error("Error loading Time Auction projects:", error);
      toast({
        title: "加载失败",
        description: "无法加载Time Auction项目，请稍后再试",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter(project => project.difficulty === difficultyFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="加载Time Auction项目中..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Time Auction品牌展示区 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-2xl p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-orange-200 opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-red-200 opacity-20 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Time Auction</h1>
                <p className="text-lg text-gray-600">合作伙伴项目</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">关于Time Auction</h2>
                <p className="text-gray-700 mb-4">
                  Time Auction是一个致力于推广志愿服务的慈善机构。我们通过激励性的体验鼓励志愿服务，
                  同时将有技能的志愿者与NGO组织连接起来。
                </p>
                <p className="text-gray-700 mb-6">
                  通过在任何非营利组织做志愿服务，您可以获得独特的体验机会——从向米其林星级厨师学习烹饪，
                  到与励志企业家共进晚餐。自2014年以来，我们已经贡献了超过100,000小时的志愿服务时间。
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
                    <Users className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">880+ NGO合作伙伴</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">100,000+ 志愿服务小时</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
                    <Globe className="w-4 h-4 text-pink-600" />
                    <span className="text-sm font-medium">全球影响力</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">合作项目特色</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">专业技能匹配</h3>
                      <p className="text-sm text-gray-600">根据您的专业技能匹配最适合的NGO项目</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">独特奖励体验</h3>
                      <p className="text-sm text-gray-600">完成项目后获得独特的学习和体验机会</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">灵活参与方式</h3>
                      <p className="text-sm text-gray-600">线上线下结合，时间地点灵活安排</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Link href="https://timeauction.org" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                      访问Time Auction官网
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 项目筛选和搜索 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索项目..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="all">所有难度</option>
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
              </select>
              
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">所有状态</option>
                <option value="published">开放申请</option>
                <option value="archived">已关闭</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            共找到 {filteredProjects.length} 个Time Auction项目
          </div>
        </div>

        {/* 项目列表 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showJoinButton={false}
              additionalContent={
                <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3 text-orange-600" />
                      <span className="font-medium text-orange-800">Time Auction项目</span>
                    </div>
                    <Link 
                      href={`/projects/${project.id}`}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      查看详情 →
                    </Link>
                  </div>
                </div>
              }
            />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的项目</h3>
            <p className="text-gray-600">尝试调整搜索条件或筛选器</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 