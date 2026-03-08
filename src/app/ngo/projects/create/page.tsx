"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { createProject } from "@/lib/firestore";
import { Subtask } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { useFormState } from "@/lib/form-utils";
import { 
  Save, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Upload,
  Tag,
  X,
  Users,
  BookOpen,
  Target,
  Sparkles,
  Eraser,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { GITHUB_SUBMISSION_SUBTASK_ID, GITHUB_SUBMISSION_SUBTASK_PROPS } from "@/lib/constants";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { calculateDeadlineFromDays, estimateDaysFromDifficulty } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { ProjectQualityAssistant } from "@/components/project/project-quality-assistant";

const initialFormData = {
  title: "",
  description: "",
  shortDescription: "",
  difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
  maxParticipants: "",
  deadline: "",
  tags: [] as string[],
  requirements: [] as string[],
  learningGoals: [] as string[]
};

const initialSubtasks = [
  {
    title: "",
    description: "",
    order: 1,
    estimatedHours: 0,
    resources: [],
    completionCriteria: []
  }
];

export default function CreateProjectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isRefining, setIsRefining] = useState(false);
  const [isRefiningSubtasks, setIsRefiningSubtasks] = useState(false);
  const [showClearFormDialog, setShowClearFormDialog] = useState(false);
  
  // Use the useFormState hook for form state management
  const {
    formData,
    setFormData,
    handleChange,
    isSubmitting: isLoading,
    resetForm
  } = useFormState(
    { ...initialFormData },
    async (data) => {
      try {
        // This will be called when handleSubmit is invoked
        // For now, we'll keep the existing submit logic separate
        return { success: true };
      } catch (error) {
        console.error("Error in form submission:", error);
        return { success: false, message: "Form submission failed" };
      }
    },
    {
      resetOnSuccess: false
    }
  );
  
  const [subtasks, setSubtasks] = useState<Omit<Subtask, 'id'>[]>([...initialSubtasks.map(st => ({...st}))]);
  
  const [newTag, setNewTag] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newLearningGoal, setNewLearningGoal] = useState("");

  // Instead of handleInputChange, we'll use the setFieldValue from useFormState
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleClearFormIntent = () => {
    setShowClearFormDialog(true);
  };

  const handleClearForm = () => {
    setFormData({...initialFormData});
    setSubtasks([...initialSubtasks.map(st => ({...st}))]);
    setNewTag("");
    setNewRequirement("");
    setNewLearningGoal("");
    toast({ title: "Form Cleared", description: "All project information fields have been cleared.", variant: "default" });
    setShowClearFormDialog(false);
  };

  const handleRefineSubtasksWithAI = async () => {
    if (!formData.title?.trim() || !formData.description?.trim()) {
      toast({ title: "Missing Information", description: "Please fill in project title and description before refining subtasks.", variant: "destructive" });
      return;
    }
    // Check if there is at least one subtask with some content to refine, or allow generation from scratch if desired.
    // For now, let's assume we proceed even with empty initial subtasks to let AI generate them.

    setIsRefiningSubtasks(true);
    try {
      const dataToRefine = {
        projectTitle: formData.title,
        projectDescription: formData.description,
        projectDifficulty: formData.difficulty,
        projectRequirements: formData.requirements,
        projectLearningGoals: formData.learningGoals,
        existingSubtasks: subtasks.map(st => ({ 
          title: st.title,
          description: st.description,
          estimatedHours: st.estimatedHours
        })),
      };

      const response = await fetch('/api/refine-subtasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToRefine),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle error response - responseData should be an error object with a message
        const errorMessage = typeof responseData === 'object' && responseData !== null && 'message' in responseData 
          ? responseData.message 
          : 'Failed to refine subtasks with AI.';
        
        toast({ title: "AI Subtask Refinement Error", description: errorMessage, variant: "destructive" });
        throw new Error(errorMessage);
      }

      // Check if responseData is a valid array of subtasks
      if (Array.isArray(responseData) && responseData.length > 0) {
        // Validate each subtask has the required fields
        const validSubtasks = responseData.filter(st => 
          st && typeof st === 'object' && 
          'title' in st && 
          'description' in st
        );
        
        if (validSubtasks.length === 0) {
          toast({ title: "AI Refinement Issue", description: "AI returned subtasks but they were invalid. Using default subtasks instead.", variant: "destructive" });
          console.error("Invalid subtasks format received:", responseData);
          setSubtasks([...initialSubtasks.map(st => ({...st}))]);
          return;
        }
        
        setSubtasks(validSubtasks.map((st, index) => ({
          ...initialSubtasks[0], // Reset parts like resources, completionCriteria to default
          title: st.title || "",
          description: st.description || "",
          estimatedHours: typeof st.estimatedHours === 'number' ? st.estimatedHours : 0,
          order: index + 1, // Re-assign order
          // AI might not provide resources/completionCriteria, so we ensure they exist from initialSubtasks structure
          resources: st.resources || [], 
          completionCriteria: st.completionCriteria || [], 
        })));
        toast({ title: "Subtasks Refined", description: "Project subtasks have been refined with AI!", variant: "default" });
      } else {
        // Handle cases where AI might return empty or non-array response for subtasks
        toast({ title: "AI Refinement Issue", description: "AI refinement did not return valid subtasks. Subtasks have been reset.", variant: "destructive" });
        console.error("Unexpected response format:", responseData);
        setSubtasks([...initialSubtasks.map(st => ({...st}))]); // Reset to initial if AI fails to provide valid subtasks
      }

    } catch (error: any) {
      console.error("Error refining subtasks with AI:", error);
      // Avoid double-toasting if already handled above
      if (!error.message?.includes('Failed to refine subtasks with AI')) {
        toast({ title: "AI Subtask Refinement Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsRefiningSubtasks(false);
    }
  };

  const handleRefineWithAI = async () => {
    setIsRefining(true);
    try {
      // Calculate total estimated hours from all subtasks
      const totalEstimatedHours = subtasks.reduce((total, subtask) => {
        return total + (typeof subtask.estimatedHours === 'number' ? subtask.estimatedHours : 0);
      }, 0);

      const projectDetailsToRefine = {
        title: formData.title,
        shortDescription: formData.shortDescription,
        description: formData.description,
        difficulty: formData.difficulty,
        maxParticipants: formData.maxParticipants,
        deadline: formData.deadline,
        estimatedHours: totalEstimatedHours.toString(), // Pass the calculated total
        tags: formData.tags,
        requirements: formData.requirements,
        learningGoals: formData.learningGoals,
      };

      if (!projectDetailsToRefine.title.trim() && !projectDetailsToRefine.description.trim()) {
        toast({ title: "Missing Information", description: "Please provide at least a project title or description to refine.", variant: "destructive" });
        setIsRefining(false);
        return;
      }

      const response = await fetch('/api/refine-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectDetailsToRefine),
      });

      const responseData = await response.json();

      if (!response.ok) {
        toast({ title: "AI Refinement Error", description: responseData.message || 'Failed to refine project details with AI.', variant: "destructive" });
        throw new Error(responseData.message || 'Failed to refine project details with AI.');
      }

      // Calculate deadline from estimatedDays if available
      let formattedDeadline = formData.deadline; // Keep existing deadline by default
      
      if (responseData.estimatedDays && typeof responseData.estimatedDays === 'number') {
        // Use our utility function to calculate a deadline from estimated days
        const deadlineDate = calculateDeadlineFromDays(responseData.estimatedDays);
        formattedDeadline = deadlineDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else if (responseData.deadline) {
        // For backward compatibility, use deadline directly if provided
        try {
          const deadlineDate = new Date(responseData.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            formattedDeadline = deadlineDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          }
        } catch (e) {
          console.error("Error formatting deadline:", e);
          // If there's an error with the provided deadline, use our utility function to calculate a reasonable one
          const estimatedDays = estimateDaysFromDifficulty(responseData.difficulty || formData.difficulty);
          const deadlineDate = calculateDeadlineFromDays(estimatedDays);
          formattedDeadline = deadlineDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        }
      }

      setFormData(prev => ({
        ...prev,
        title: responseData.title || prev.title,
        shortDescription: responseData.shortDescription || prev.shortDescription,
        description: responseData.description || prev.description,
        difficulty: responseData.difficulty || prev.difficulty,
        maxParticipants: responseData.maxParticipants !== undefined && responseData.maxParticipants !== null ? String(responseData.maxParticipants) : prev.maxParticipants,
        deadline: formattedDeadline || prev.deadline,
        tags: responseData.tags || prev.tags,
        requirements: responseData.requirements || prev.requirements,
        learningGoals: responseData.learningGoals || prev.learningGoals,
      }));
      
      toast({ title: "Project Details Refined", description: "Project details have been refined with AI!", variant: "default" });

    } catch (error: any) {
      console.error("Error refining project with AI:", error);
      // Avoid double-toasting
      if (!error.message?.includes('Failed to refine project details with AI')) {
         toast({ title: "AI Refinement Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsRefining(false);
    }
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!session?.user?.id || !session?.user?.name) {
      toast({ title: "Authentication Error", description: "User information is incomplete, please log in again.", variant: "destructive" });
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      toast({ title: "Validation Error", description: "Please fill in the project title.", variant: "destructive" });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({ title: "Validation Error", description: "Please fill in the project description.", variant: "destructive" });
      return;
    }

    if (status === 'published' && !formData.deadline) {
      toast({ title: "Validation Error", description: "Please set a deadline for the project.", variant: "destructive" });
      return;
    }

    const validSubtasks = subtasks.filter(s => s.title.trim() && s.description.trim());
    if (validSubtasks.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one valid subtask.", variant: "destructive" });
      return;
    }

    try {
      // Generate subtask IDs
      const userDefinedSubtasksWithIds: Subtask[] = validSubtasks.map((subtask, index) => ({
        ...subtask,
        id: `subtask_${Date.now()}_${index}`,
        // User-defined tasks start from order 1 (or higher if GitHub task is 0 or 1)
        order: index + 1 // This will be adjusted after prepending GitHub task
      }));

      // Create the GitHub submission task
      const githubSubtask: Subtask = {
        id: GITHUB_SUBMISSION_SUBTASK_ID,
        ...GITHUB_SUBMISSION_SUBTASK_PROPS,
        order: 0, // Ensuring it's the very first task
      };

      // Prepend GitHub task and re-order subsequent tasks
      const allSubtasksWithGithubFirst: Subtask[] = [githubSubtask, ...userDefinedSubtasksWithIds].map((st, index) => ({
        ...st,
        order: index, // Re-assign order: GitHub task 0, next user task 1, etc.
      })); 

      // Convert deadline string to Timestamp
      let deadlineTimestamp;
      if (formData.deadline) {
        // Create a date at 23:59:59 on the selected day for deadline
        const deadlineDate = new Date(formData.deadline);
        deadlineDate.setHours(23, 59, 59);
        deadlineTimestamp = Timestamp.fromDate(deadlineDate);
      } else {
        // If no deadline specified (for draft), set a default far future date
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1); // One year from now
        deadlineTimestamp = Timestamp.fromDate(futureDate);
      }

      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim() || formData.description.substring(0, 150) + "...",
        ngoId: session.user.id,
        ngoName: session.user.name,
        status,
        difficulty: formData.difficulty,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        deadline: deadlineTimestamp,
        tags: formData.tags,
        requirements: formData.requirements,
        learningGoals: formData.learningGoals,
        subtasks: allSubtasksWithGithubFirst // Use the array with GitHub task prepended and re-ordered
      };

      console.log("Creating project:", projectData);
      const projectId = await createProject(projectData);
      console.log("Project created successfully, ID:", projectId);
      
      router.push(`/ngo/projects/${projectId}`);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({ title: "Project Creation Failed", description: "Failed to create project, please try again.", variant: "destructive" });
    }
  };

  const validSubtaskCount = subtasks.filter((subtask) => subtask.title.trim() && subtask.description.trim()).length;
  const totalEstimatedHours = subtasks.reduce((sum, subtask) => sum + (subtask.estimatedHours || 0), 0);
  const publishingSignals = formData.title.trim().length > 0
    && formData.description.trim().length > 0
    && formData.requirements.length > 0
    && formData.learningGoals.length > 0
    && validSubtaskCount > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHero
          eyebrow="NGO authoring workspace"
          icon={Sparkles}
          title="Create New Project"
          description="Design a publish-ready learning project with clear outcomes, strong task structure, and an experience students can understand immediately."
          actions={
            <>
              <Link href="/ngo/projects">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Project List
                </Button>
              </Link>
              <Button
                onClick={() => handleSubmit('published')}
                disabled={isLoading || isRefining || isRefiningSubtasks}
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                Publish Project
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Valid Subtasks"
            value={validSubtaskCount}
            icon={Target}
            tone="green"
            hint="Subtasks with both a title and a usable description."
          />
          <StatTile
            label="Estimated Hours"
            value={totalEstimatedHours}
            icon={Calendar}
            tone="blue"
            hint="A rough effort signal students will feel before joining."
          />
          <StatTile
            label="Requirements"
            value={formData.requirements.length}
            icon={Users}
            tone="purple"
            hint="Participation gates or expectations for learners."
          />
          <StatTile
            label="Publish Readiness"
            value={publishingSignals ? 'Ready' : 'Drafting'}
            icon={BookOpen}
            tone="amber"
            hint="A quick signal for whether the project has the basics in place."
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
          {/* Main Form */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card className="border-white/70 bg-white/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>Basic Information</span>
                  <Button
                    onClick={handleRefineWithAI}
                    disabled={isLoading || isRefining}
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                  >
                    {isRefining ? (
                      <LoadingState size="sm" className="w-4 h-4 mr-2" fullHeight={false} />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Refine with AI
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Community Clean Water Project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the project in one sentence..."
                    maxLength={150}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.shortDescription.length}/150 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                    placeholder="Describe the project's goals, background, expected impact, etc..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => handleInputChange('difficulty', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Participants
                    </label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Leave blank for no limit"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => handleInputChange('deadline', e.target.value)}
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Project will be automatically marked complete after this date</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-white/70 bg-white/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <span>Project Tags</span>
                </CardTitle>
                <CardDescription>
                  Add relevant tags to help students discover your project
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
                    placeholder="Add tag..."
                  />
                  <Button onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subtasks */}
            <Card className="border-white/70 bg-white/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span>Project Subtasks</span>
                  <Button
                    onClick={handleRefineSubtasksWithAI}
                    disabled={isLoading || isRefining || isRefiningSubtasks || 
                              !formData.title?.trim() || !formData.description?.trim() || 
                              formData.requirements.length === 0 || formData.learningGoals.length === 0}
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    title={(!formData.title?.trim() || !formData.description?.trim()) 
                           ? "Fill project title & description first" 
                           : (formData.requirements.length === 0 || formData.learningGoals.length === 0) 
                           ? "Add at least one requirement and one learning goal first" 
                           : "Refine subtasks with AI"}
                  >
                    {isRefiningSubtasks ? (
                      <LoadingState size="sm" className="w-4 h-4 mr-2" fullHeight={false} />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Refine Subtasks
                  </Button>
                </CardTitle>
                <CardDescription>
                  Break down the project into specific learning tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subtasks.map((subtask, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-white/80 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Subtask {index + 1}</h4>
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
                        placeholder="Subtask title..."
                      />
                    </div>
                    
                    <div>
                      <textarea
                        value={subtask.description}
                        onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Subtask detailed description..."
                      />
                    </div>
                    
                    <div>
                      <input
                        type="number"
                        value={subtask.estimatedHours || ''}
                        onChange={(e) => handleSubtaskChange(index, 'estimatedHours', e.target.value ? parseInt(e.target.value) : 0)}
                        className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Est. hours"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
                
                <Button onClick={addSubtask} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subtask
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24 self-start">
            <ProjectQualityAssistant
              formData={formData}
              subtasks={subtasks}
              mode="create"
            />
            {/* Requirements */}
            <Card className="border-white/70 bg-white/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg">Participation Requirements</CardTitle>
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
                    placeholder="Add requirement..."
                  />
                  <Button onClick={addRequirement} size="sm" variant="outline">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Learning Goals */}
            <Card className="border-white/70 bg-white/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg">Learning Goals</CardTitle>
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
                    placeholder="Add learning goal..."
                  />
                  <Button onClick={addLearningGoal} size="sm" variant="outline">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur-xl">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Ship this project confidently</p>
                  <p className="text-xs leading-5 text-slate-500">
                    Publish when the quality panel feels strong, or save a draft and keep iterating.
                  </p>
                </div>
                <Button
                  onClick={() => handleSubmit('published')}
                  disabled={isLoading || isRefining || isRefiningSubtasks}
                  className="w-full"
                >
                  {isLoading && !isRefining && !isRefiningSubtasks ? (
                    <LoadingState size="sm" className="mr-2" fullHeight={false} />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Publish Project
                </Button>
                
                <Button
                  onClick={() => handleSubmit('draft')}
                  disabled={isLoading || isRefining || isRefiningSubtasks}
                  variant="outline"
                  className="w-full"
                >
                  Save as Draft
                </Button>

                <Button
                  onClick={handleClearFormIntent}
                  disabled={isLoading || isRefining || isRefiningSubtasks}
                  variant="destructive"
                  className="w-full mt-2"
                >
                  <Eraser className="w-4 h-4 mr-2" />
                  Clear Form (Basic Info, Tags, Subtasks)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AlertDialog for clearing form */}
      <AlertDialog open={showClearFormDialog} onOpenChange={setShowClearFormDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all form fields? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearForm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
} 
