"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getUser, updateUser, getStudentDashboard } from "@/lib/firestore";
import { User, StudentDashboard } from "@/lib/types";
import { generateAvatar } from "@/lib/utils";
import { 
  User as UserIcon, 
  School, 
  Heart, 
  Edit,
  Trophy,
  Clock,
  Award,
  BookOpen,
  Save,
  X
} from "lucide-react";

export default function StudentProfilePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    school: "",
    grade: "",
    interests: [] as string[]
  });
  const [newInterest, setNewInterest] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    try {
      const [userData, dashboardData] = await Promise.all([
        getUser(session!.user!.id),
        getStudentDashboard(session!.user!.id)
      ]);
      
      setUser(userData);
      setDashboard(dashboardData);
      
      if (userData) {
        setEditForm({
          name: userData.name,
          bio: userData.profile?.bio || "",
          school: userData.profile?.school || "",
          grade: userData.profile?.grade || "",
          interests: userData.profile?.interests || []
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
          bio: editForm.bio,
          school: editForm.school,
          grade: editForm.grade,
          interests: editForm.interests
        }
      });
      
      // 重新加载数据
      await loadUserData();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !editForm.interests.includes(newInterest.trim())) {
      setEditForm({
        ...editForm,
        interests: [...editForm.interests, newInterest.trim()]
      });
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter(i => i !== interest)
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
            <h1 className="text-3xl font-bold text-gray-900">个人资料</h1>
            <p className="text-gray-600 mt-2">
              管理您的个人信息和学习偏好 👤
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
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <span>基本信息</span>
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
                        className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                        placeholder="您的姓名"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                    )}
                    <p className="text-gray-500">{user?.email}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                      学生
                    </span>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    个人简介
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="介绍一下自己..."
                    />
                  ) : (
                    <p className="text-gray-700">
                      {user?.profile?.bio || "还没有添加个人简介"}
                    </p>
                  )}
                </div>

                {/* School Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      学校
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.school}
                        onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="您的学校"
                      />
                    ) : (
                      <p className="text-gray-700 flex items-center">
                        <School className="w-4 h-4 mr-2 text-gray-500" />
                        {user?.profile?.school || "未设置"}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年级
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.grade}
                        onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">选择年级</option>
                        <option value="9">高一</option>
                        <option value="10">高二</option>
                        <option value="11">高三</option>
                        <option value="12">高四</option>
                      </select>
                    ) : (
                      <p className="text-gray-700">
                        {user?.profile?.grade ? `高${user.profile.grade === '9' ? '一' : user.profile.grade === '10' ? '二' : user.profile.grade === '11' ? '三' : '四'}` : "未设置"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    兴趣标签
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editForm.interests.map((interest, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                        <Heart className="w-3 h-3 mr-1" />
                        {interest}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveInterest(interest)}
                            className="ml-2 text-purple-600 hover:text-purple-800"
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
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="添加兴趣..."
                      />
                      <Button onClick={handleAddInterest} variant="outline">
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
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span>学习统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboard?.activeProjects || 0}
                  </div>
                  <div className="text-sm text-gray-600">进行中项目</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {dashboard?.completedProjects || 0}
                  </div>
                  <div className="text-sm text-gray-600">已完成项目</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboard?.totalHours || 0}
                  </div>
                  <div className="text-sm text-gray-600">学习小时</div>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {dashboard?.certificates || 0}
                  </div>
                  <div className="text-sm text-gray-600">获得证书</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 