"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createProject } from "@/lib/firestore";
import { Subtask } from "@/lib/types";
import { 
  Save, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Upload,
  Tag,
  X,
  Clock,
  Users,
  BookOpen,
  Target
} from "lucide-react";
import Link from "next/link";

export default function CreateProjectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    shortDescription: "",
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    maxParticipants: "",
    estimatedHours: "",
    tags: [] as string[],
    requirements: [] as string[],
    learningGoals: [] as string[]
  });
  
  const [subtasks, setSubtasks] = useState<Omit<Subtask, 'id'>[]>([
    {
      title: "",
      description: "",
      order: 1,
      estimatedHours: 0,
      resources: [],
      completionCriteria: []
    }
  ]);
  
  const [newTag, setNewTag] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newLearningGoal, setNewLearningGoal] = useState("");

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubtaskChange = (index: number, field: string, value: any) => {
    setSubtasks(prev => prev.map((subtask, i) => 
      i === index ? { ...subtask, [field]: value } : subtask
    ));
  };

  const addSubtask = () => {
    setSubtasks(prev => [...prev, {
      title: "",
      description: "",
      order: prev.length + 1,
      estimatedHours: 0,
      resources: [],
      completionCriteria: []
    }]);
  };

  const removeSubtask = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index).map((subtask, i) => ({
      ...subtask,
      order: i + 1
    })));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    handleInputChange('tags', formData.tags.filter(t => t !== tag));
  };

  const addRequirement = () => {
    if (newRequirement.trim() && !formData.requirements.includes(newRequirement.trim())) {
      handleInputChange('requirements', [...formData.requirements, newRequirement.trim()]);
      setNewRequirement("");
    }
  };

  const removeRequirement = (requirement: string) => {
    handleInputChange('requirements', formData.requirements.filter(r => r !== requirement));
  };

  const addLearningGoal = () => {
    if (newLearningGoal.trim() && !formData.learningGoals.includes(newLearningGoal.trim())) {
      handleInputChange('learningGoals', [...formData.learningGoals, newLearningGoal.trim()]);
      setNewLearningGoal("");
    }
  };

  const removeLearningGoal = (goal: string) => {
    handleInputChange('learningGoals', formData.learningGoals.filter(g => g !== goal));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!session?.user?.id || !session?.user?.name) {
      alert("用户信息不完整，请重新登录");
      return;
    }

    // 验证必填字段
    if (!formData.title.trim()) {
      alert("请填写项目标题");
      return;
    }
    
    if (!formData.description.trim()) {
      alert("请填写项目描述");
      return;
    }

    const validSubtasks = subtasks.filter(s => s.title.trim() && s.description.trim());
    if (validSubtasks.length === 0) {
      alert("请至少添加一个有效的子任务");
      return;
    }

    setIsLoading(true);
    
    try {
      // 生成subtask IDs
      const subtasksWithIds: Subtask[] = validSubtasks.map((subtask, index) => ({
        ...subtask,
        id: `subtask_${Date.now()}_${index}`,
        order: index + 1
      }));

      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim() || formData.description.substring(0, 150) + "...",
        ngoId: session.user.id,
        ngoName: session.user.name,
        status,
        difficulty: formData.difficulty,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
        tags: formData.tags,
        requirements: formData.requirements,
        learningGoals: formData.learningGoals,
        subtasks: subtasksWithIds
      };

      console.log("创建项目:", projectData);
      const projectId = await createProject(projectData);
      console.log("项目创建成功，ID:", projectId);
      
      router.push(`/ngo/projects/${projectId}`);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("创建项目失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/ngo/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回项目列表
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">创建新项目</h1>
              <p className="text-gray-600 mt-2">
                创建一个有意义的社会影响项目 ✨
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>基本信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目标题 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：社区清洁水源项目"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    简短描述
                  </label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="一句话描述项目..."
                    maxLength={150}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.shortDescription.length}/150 字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    详细描述 *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                    placeholder="详细描述项目的目标、背景、预期影响等..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      难度等级
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => handleInputChange('difficulty', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="beginner">初级</option>
                      <option value="intermediate">中级</option>
                      <option value="advanced">高级</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大参与人数
                    </label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="不限制可留空"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      预估学习时长(小时)
                    </label>
                    <input
                      type="number"
                      value={formData.estimatedHours}
                      onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如：40"
                      min="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <span>项目标签</span>
                </CardTitle>
                <CardDescription>
                  添加相关标签帮助学生发现您的项目
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="添加标签..."
                  />
                  <Button onClick={addTag} variant="outline">
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subtasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span>项目子任务</span>
                </CardTitle>
                <CardDescription>
                  将项目分解为具体的学习任务
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subtasks.map((subtask, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">子任务 {index + 1}</h4>
                      {subtasks.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubtask(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <input
                        type="text"
                        value={subtask.title}
                        onChange={(e) => handleSubtaskChange(index, 'title', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="子任务标题..."
                      />
                    </div>
                    
                    <div>
                      <textarea
                        value={subtask.description}
                        onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="子任务详细描述..."
                      />
                    </div>
                    
                    <div>
                      <input
                        type="number"
                        value={subtask.estimatedHours || ''}
                        onChange={(e) => handleSubtaskChange(index, 'estimatedHours', e.target.value ? parseInt(e.target.value) : 0)}
                        className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="预估小时"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
                
                <Button onClick={addSubtask} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  添加子任务
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">参与要求</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {formData.requirements.map((req, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{req}</span>
                      <button
                        onClick={() => removeRequirement(req)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="添加要求..."
                  />
                  <Button onClick={addRequirement} size="sm" variant="outline">
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Learning Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">学习目标</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {formData.learningGoals.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{goal}</span>
                      <button
                        onClick={() => removeLearningGoal(goal)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newLearningGoal}
                    onChange={(e) => setNewLearningGoal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLearningGoal()}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="添加学习目标..."
                  />
                  <Button onClick={addLearningGoal} size="sm" variant="outline">
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Button
                  onClick={() => handleSubmit('published')}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="loading-spinner mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  发布项目
                </Button>
                
                <Button
                  onClick={() => handleSubmit('draft')}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  保存为草稿
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 