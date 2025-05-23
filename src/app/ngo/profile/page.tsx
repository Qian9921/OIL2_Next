"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getUser, updateUser, getNGODashboard } from "@/lib/firestore";
import { User, NGODashboard } from "@/lib/types";
import { generateAvatar } from "@/lib/utils";
import { 
  Building, 
  Globe, 
  MapPin, 
  Edit,
  Save,
  Trophy,
  Users,
  FolderOpen,
  AlertCircle,
  Heart,
  X
} from "lucide-react";

export default function NGOProfilePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<NGODashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    website: "",
    location: "",
    focusAreas: [] as string[]
  });
  const [newFocusArea, setNewFocusArea] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    try {
      const [userData, dashboardData] = await Promise.all([
        getUser(session!.user!.id),
        getNGODashboard(session!.user!.id)
      ]);
      
      setUser(userData);
      setDashboard(dashboardData);
      
      if (userData) {
        setEditForm({
          name: userData.name,
          bio: userData.profile?.bio || "",
          website: userData.profile?.website || "",
          location: userData.profile?.location || "",
          focusAreas: userData.profile?.focusAreas || []
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await updateUser(user.id, {
        name: editForm.name,
        profile: {
          ...user.profile,
          bio: editForm.bio,
          website: editForm.website,
          location: editForm.location,
          focusAreas: editForm.focusAreas
        }
      });
      
      await loadUserData();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleAddFocusArea = () => {
    if (newFocusArea.trim() && !editForm.focusAreas.includes(newFocusArea.trim())) {
      setEditForm({
        ...editForm,
        focusAreas: [...editForm.focusAreas, newFocusArea.trim()]
      });
      setNewFocusArea("");
    }
  };

  const handleRemoveFocusArea = (area: string) => {
    setEditForm({
      ...editForm,
      focusAreas: editForm.focusAreas.filter(a => a !== area)
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">组织资料</h1>
            <p className="text-gray-600 mt-2">
              管理您的组织信息和影响力数据 🏢
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              编辑资料
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-purple-600" />
                  <span>组织信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar and Name */}
                <div className="flex items-center space-x-4">
                  <Avatar
                    src={user?.avatar || generateAvatar(user?.email || "")}
                    alt={user?.name}
                    size="lg"
                  />
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-purple-500 outline-none w-full"
                        placeholder="组织名称"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                    )}
                    <p className="text-gray-500">{user?.email}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                      NGO组织
                    </span>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    组织简介
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                      placeholder="介绍您的组织使命、愿景和主要工作..."
                    />
                  ) : (
                    <p className="text-gray-700">
                      {user?.profile?.bio || "还没有添加组织简介"}
                    </p>
                  )}
                </div>

                {/* Website and Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      官方网站
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://yourorganization.org"
                      />
                    ) : (
                      <p className="text-gray-700 flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-gray-500" />
                        {user?.profile?.website ? (
                          <a 
                            href={user.profile.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline"
                          >
                            {user.profile.website}
                          </a>
                        ) : "未设置"}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      所在地区
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="例如：北京市海淀区"
                      />
                    ) : (
                      <p className="text-gray-700 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        {user?.profile?.location || "未设置"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Focus Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    关注领域
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editForm.focusAreas.map((area, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        <Heart className="w-3 h-3 mr-1" />
                        {area}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveFocusArea(area)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  
                  {isEditing && (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newFocusArea}
                        onChange={(e) => setNewFocusArea(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddFocusArea()}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="添加关注领域..."
                      />
                      <Button onClick={handleAddFocusArea} variant="outline">
                        添加
                      </Button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      保存修改
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      取消
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Card */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span>影响力统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <FolderOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboard?.publishedProjects || 0}
                  </div>
                  <div className="text-sm text-gray-600">发布项目</div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboard?.totalParticipants || 0}
                  </div>
                  <div className="text-sm text-gray-600">总参与者</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {dashboard?.completedProjects || 0}
                  </div>
                  <div className="text-sm text-gray-600">完成项目</div>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {dashboard?.pendingReviews || 0}
                  </div>
                  <div className="text-sm text-gray-600">待审核</div>
                </div>
              </CardContent>
            </Card>

            {/* Project Performance */}
            {dashboard?.projectStats && dashboard.projectStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">项目表现</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.projectStats.slice(0, 3).map((stat) => (
                    <div key={stat.projectId} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 text-sm mb-2 truncate">
                        {stat.projectTitle}
                      </h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>参与率</span>
                          <span>{stat.participants} 人</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>完成率</span>
                          <span>{Math.round(stat.completionRate)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-purple-500 h-1 rounded-full"
                            style={{ width: `${stat.averageProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 