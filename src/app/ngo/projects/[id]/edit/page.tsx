"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { getProject, updateProject } from "@/lib/firestore";
import { Project, Subtask } from "@/lib/types";
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

export default function EditProjectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
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

  // Load project data on component mount
  useEffect(() => {
    if (params.id) {
      loadProjectData();
    }
  }, [params.id]);

  const loadProjectData = async () => {
    try {
      const projectData = await getProject(params.id as string);
      if (!projectData) {
        toast({ title: "Project Not Found", description: "Please check if the project ID is correct", variant: "destructive" });
        router.push("/ngo/projects");
        return;
      }

      // Check if current user is the owner
      if (session?.user?.id !== projectData.ngoId) {
        toast({ title: "Access Denied", description: "You do not have permission to edit this project", variant: "destructive" });
        router.push("/ngo/projects");
        return;
      }

      setProject(projectData);
      
      // Populate form with existing project data
      setFormData({
        title: projectData.title || "",
        description: projectData.description || "",
        shortDescription: projectData.shortDescription || "",
        difficulty: projectData.difficulty || "beginner",
        maxParticipants: projectData.maxParticipants ? String(projectData.maxParticipants) : "",
        deadline: projectData.deadline ? projectData.deadline.toDate().toISOString().split('T')[0] : "",
        tags: projectData.tags || [],
        requirements: projectData.requirements || [],
        learningGoals: projectData.learningGoals || []
      });

      // Populate subtasks (exclude GitHub submission task)
      if (projectData.subtasks && projectData.subtasks.length > 0) {
        const userSubtasks = projectData.subtasks.filter(st => st.id !== GITHUB_SUBMISSION_SUBTASK_ID);
        if (userSubtasks.length > 0) {
          setSubtasks(userSubtasks.map(st => ({
            title: st.title,
            description: st.description,
            order: st.order,
            estimatedHours: st.estimatedHours || 0,
            resources: st.resources || [],
            completionCriteria: st.completionCriteria || []
          })));
        }
      }
    } catch (error) {
      console.error("Error loading project data:", error);
      toast({ title: "Loading Failed", description: "Unable to load project data", variant: "destructive" });
    } finally {
      setIsLoadingProject(false);
    }
  };

  // Form handling functions
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
    if (project) {
      // Reset to original project data
      setFormData({
        title: project.title || "",
        description: project.description || "",
        shortDescription: project.shortDescription || "",
        difficulty: project.difficulty || "beginner",
        maxParticipants: project.maxParticipants ? String(project.maxParticipants) : "",
        deadline: project.deadline ? project.deadline.toDate().toISOString().split('T')[0] : "",
        tags: project.tags || [],
        requirements: project.requirements || [],
        learningGoals: project.learningGoals || []
      });

      // Reset subtasks
      if (project.subtasks && project.subtasks.length > 0) {
        const userSubtasks = project.subtasks.filter(st => st.id !== GITHUB_SUBMISSION_SUBTASK_ID);
        if (userSubtasks.length > 0) {
          setSubtasks(userSubtasks.map(st => ({
            title: st.title,
            description: st.description,
            order: st.order,
            estimatedHours: st.estimatedHours || 0,
            resources: st.resources || [],
            completionCriteria: st.completionCriteria || []
          })));
        } else {
          setSubtasks([...initialSubtasks.map(st => ({...st}))]);
        }
      } else {
        setSubtasks([...initialSubtasks.map(st => ({...st}))]);
      }
    }
    setNewTag("");
    setNewRequirement("");
    setNewLearningGoal("");
    toast({ title: "Form Reset", description: "All fields have been reset to original project data", variant: "default" });
    setShowClearFormDialog(false);
  };

  // AI refinement functions (same as create page)
  const handleRefineSubtasksWithAI = async () => {
    if (!formData.title?.trim() || !formData.description?.trim()) {
      toast({ title: "Missing Information", description: "Please fill in project title and description before AI optimization", variant: "destructive" });
      return;
    }

    setIsRefiningSubtasks(true);
    try {
      // Create a clean copy of the data to prevent issues with special characters or markdown
      const dataToRefine = {
        projectTitle: formData.title || "",
        projectDescription: formData.description || "",
        projectDifficulty: formData.difficulty || "beginner",
        projectRequirements: Array.isArray(formData.requirements) ? [...formData.requirements] : [],
        projectLearningGoals: Array.isArray(formData.learningGoals) ? [...formData.learningGoals] : [],
        existingSubtasks: subtasks.map(st => ({ 
          title: st.title || "",
          description: st.description || "",
          estimatedHours: typeof st.estimatedHours === 'number' ? st.estimatedHours : 0
        })),
      };
      
      // Check for markdown or special characters that might need sanitization
      const markdownInProject = /[\*\_\`\[\]\(\)\<\>\|\\]/.test(dataToRefine.projectTitle) || 
                               /[\*\_\`\[\]\(\)\<\>\|\\]/.test(dataToRefine.projectDescription);
      
      const markdownInSubtasks = dataToRefine.existingSubtasks.some(st => 
        /[\*\_\`\[\]\(\)\<\>\|\\]/.test(st.title) || 
        /[\*\_\`\[\]\(\)\<\>\|\\]/.test(st.description)
      );
      
      // Check for very long content that might cause issues
      const isContentLong = dataToRefine.projectDescription.length > 2000 || 
                           dataToRefine.projectTitle.length > 100 ||
                           dataToRefine.existingSubtasks.some(st => st.description.length > 500);
      
      if (markdownInProject || markdownInSubtasks) {
        toast({ 
          title: "Markdown Detected", 
          description: "Your content contains markdown or special characters. We'll sanitize this for best results.", 
          variant: "default" 
        });
      }
      
      if (isContentLong) {
        toast({
          title: "Long Content Detected",
          description: "Your content is quite lengthy, which may impact AI refinement. If you encounter errors, try simplifying or shortening your content.",
          variant: "default"
        });
      }


      const response = await fetch('/api/refine-subtasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToRefine),
      });

      // Enhanced error handling for failed requests
      if (!response.ok) {
        let responseData;
        try {
          responseData = await response.json();
          console.error("Error response from AI subtask service:", responseData);
        } catch (parseError) {
          console.error("Could not parse subtask error response:", parseError);
          responseData = { 
            message: `Server returned status ${response.status} ${response.statusText}` 
          };
        }
        
        const errorMessage = responseData?.message || 'Failed to refine subtasks with AI.';
        toast({ 
          title: "AI Subtask Optimization Error", 
          description: errorMessage, 
          variant: "destructive" 
        });
        throw new Error(errorMessage);
      }

      // Handle successful response
      const responseData = await response.json();

      if (Array.isArray(responseData) && responseData.length > 0) {
        const validSubtasks = responseData.filter(st => 
          st && typeof st === 'object' && 
          'title' in st && 
          'description' in st
        );
        
        if (validSubtasks.length === 0) {
          console.error("API returned invalid subtask format:", responseData);
          toast({ title: "AI Optimization Issue", description: "AI returned invalid subtasks, using default subtasks", variant: "destructive" });
          setSubtasks([...initialSubtasks.map(st => ({...st}))]);
          return;
        }
        
        setSubtasks(validSubtasks.map((st, index) => ({
          ...initialSubtasks[0],
          title: st.title || "",
          description: st.description || "",
          estimatedHours: typeof st.estimatedHours === 'number' ? st.estimatedHours : 0,
          order: index + 1,
          resources: st.resources || [], 
          completionCriteria: st.completionCriteria || [], 
        })));
        toast({ title: "Subtasks Optimized", description: "Project subtasks have been optimized with AI!", variant: "default" });
      } else {
        toast({ title: "AI Optimization Issue", description: "AI optimization did not return valid subtasks", variant: "destructive" });
        setSubtasks([...initialSubtasks.map(st => ({...st}))]);
      }

    } catch (error: any) {
      console.error("Error refining subtasks with AI:", error);
      if (!error.message?.includes('AI subtask optimization failed')) {
        toast({ title: "AI Subtask Optimization Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsRefiningSubtasks(false);
    }
  };

  const handleRefineWithAI = async () => {
    setIsRefining(true);
    try {
      const totalEstimatedHours = subtasks.reduce((total, subtask) => {
        return total + (typeof subtask.estimatedHours === 'number' ? subtask.estimatedHours : 0);
      }, 0);

      // Create a clean copy of the data to prevent issues with special characters or markdown
      const projectDetailsToRefine = {
        title: formData.title || "",
        shortDescription: formData.shortDescription || "",
        description: formData.description || "",
        difficulty: formData.difficulty || "beginner",
        maxParticipants: formData.maxParticipants || "",
        deadline: formData.deadline || "",
        estimatedHours: totalEstimatedHours.toString(),
        tags: Array.isArray(formData.tags) ? [...formData.tags] : [],
        requirements: Array.isArray(formData.requirements) ? [...formData.requirements] : [],
        learningGoals: Array.isArray(formData.learningGoals) ? [...formData.learningGoals] : [],
      };

      // Basic validation
      if (!projectDetailsToRefine.title.trim() && !projectDetailsToRefine.description.trim()) {
        toast({ title: "Missing Information", description: "Please provide at least a project title or description for optimization", variant: "destructive" });
        setIsRefining(false);
        return;
      }

      // Check for markdown or special characters that might need sanitization
      const containsMarkdown = /[\*\_\`\[\]\(\)\<\>\|\\]/.test(projectDetailsToRefine.title) || 
                              /[\*\_\`\[\]\(\)\<\>\|\\]/.test(projectDetailsToRefine.description);
      
      // Check for very long content that might cause issues
      const isContentLong = projectDetailsToRefine.description.length > 2000 || 
                          projectDetailsToRefine.title.length > 100;
      
      if (containsMarkdown) {
        toast({ 
          title: "Markdown Detected", 
          description: "Your content contains markdown or special characters. We'll sanitize this for best results.", 
          variant: "default" 
        });
      }
      
      if (isContentLong) {
        toast({
          title: "Long Content Detected",
          description: "Your content is quite lengthy, which may impact AI refinement. If you encounter errors, try simplifying or shortening your content.",
          variant: "default"
        });
      }


      const response = await fetch('/api/refine-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectDetailsToRefine),
      });

      // Enhanced error handling for failed requests
      if (!response.ok) {
        let responseData;
        try {
          responseData = await response.json();
          console.error("Error response from AI service:", responseData);
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
          responseData = { 
            message: `Server returned status ${response.status} ${response.statusText}` 
          };
        }
        
        const errorMessage = responseData?.message || 'Failed to refine project details with AI.';
        toast({ 
          title: "AI Optimization Error", 
          description: errorMessage, 
          variant: "destructive" 
        });
        throw new Error(errorMessage);
      }

      // Handle successful response
      const responseData = await response.json();
      
      let formattedDeadline = formData.deadline;
      
      if (responseData.estimatedDays && typeof responseData.estimatedDays === 'number') {
        const deadlineDate = calculateDeadlineFromDays(responseData.estimatedDays);
        formattedDeadline = deadlineDate.toISOString().split('T')[0];
      } else if (responseData.deadline) {
        try {
          const deadlineDate = new Date(responseData.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            formattedDeadline = deadlineDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error("Error formatting deadline:", e);
          const estimatedDays = estimateDaysFromDifficulty(responseData.difficulty || formData.difficulty);
          const deadlineDate = calculateDeadlineFromDays(estimatedDays);
          formattedDeadline = deadlineDate.toISOString().split('T')[0];
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
      
      toast({ title: "Project Details Optimized", description: "Project details have been optimized with AI!", variant: "default" });

    } catch (error: any) {
      console.error("Error refining project with AI:", error);
      if (!error.message?.includes('AI project details optimization failed')) {
         toast({ title: "AI Optimization Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsRefining(false);
    }
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!session?.user?.id || !session?.user?.name || !project) {
      toast({ title: "Authentication Error", description: "User information is incomplete or project not loaded, please log in again", variant: "destructive" });
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      toast({ title: "Validation Error", description: "Please fill in the project title", variant: "destructive" });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({ title: "Validation Error", description: "Please fill in the project description", variant: "destructive" });
      return;
    }

    if (status === 'published' && !formData.deadline) {
      toast({ title: "Validation Error", description: "Please set a deadline for the project", variant: "destructive" });
      return;
    }

    const validSubtasks = subtasks.filter(s => s.title.trim() && s.description.trim());
    if (validSubtasks.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one valid subtask", variant: "destructive" });
      return;
    }

    try {
      // Generate subtask IDs for new subtasks, preserve existing IDs
      const userDefinedSubtasksWithIds: Subtask[] = validSubtasks.map((subtask, index) => {
        // Try to find existing subtask with same title and description
        const existingSubtask = project.subtasks?.find(st => 
          st.title === subtask.title && st.description === subtask.description && st.id !== GITHUB_SUBMISSION_SUBTASK_ID
        );
        
        return {
          ...subtask,
          id: existingSubtask?.id || `subtask_${Date.now()}_${index}`,
          order: index + 1
        };
      });

      // Find existing GitHub submission task or create new one
      const existingGithubTask = project.subtasks?.find(st => st.id === GITHUB_SUBMISSION_SUBTASK_ID);
      const githubSubtask: Subtask = existingGithubTask || {
        id: GITHUB_SUBMISSION_SUBTASK_ID,
        ...GITHUB_SUBMISSION_SUBTASK_PROPS,
        order: 0,
      };

      // Combine GitHub task with user tasks
      const allSubtasksWithGithubFirst: Subtask[] = [githubSubtask, ...userDefinedSubtasksWithIds].map((st, index) => ({
        ...st,
        order: index,
      })); 

      // Convert deadline string to Timestamp
      let deadlineTimestamp;
      if (formData.deadline) {
        const deadlineDate = new Date(formData.deadline);
        deadlineDate.setHours(23, 59, 59);
        deadlineTimestamp = Timestamp.fromDate(deadlineDate);
      } else {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        deadlineTimestamp = Timestamp.fromDate(futureDate);
      }

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim() || formData.description.substring(0, 150) + "...",
        status,
        difficulty: formData.difficulty,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        deadline: deadlineTimestamp,
        tags: formData.tags,
        requirements: formData.requirements,
        learningGoals: formData.learningGoals,
        subtasks: allSubtasksWithGithubFirst
      };

      await updateProject(project.id, updateData);
      
      toast({ title: "Project Updated", description: "Project information has been successfully updated", variant: "default" });
      router.push(`/ngo/projects/${project.id}`);
    } catch (error) {
      console.error("Error updating project:", error);
      toast({ title: "Project Update Failed", description: "Failed to update project, please try again", variant: "destructive" });
    }
  };

  // Loading state
  if (isLoadingProject) {
    return (
      <MainLayout>
        <LoadingState text="Loading project data..." />
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">Please check if the project ID is correct</p>
          <Link href="/ngo/projects">
            <Button>Back to Project List</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

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
          title="Edit Project"
          description="Refine structure, clarity, and learner readiness without losing momentum. This workspace is tuned for fast iteration before you publish updates."
          actions={
            <>
              <Link href={`/ngo/projects/${project.id}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Project Details
                </Button>
              </Link>
              <Button
                onClick={() => handleSubmit('published')}
                disabled={isLoading || isRefining || isRefiningSubtasks}
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                Update & Publish
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
            hint="Structured subtasks students can immediately act on."
          />
          <StatTile
            label="Estimated Hours"
            value={totalEstimatedHours}
            icon={Calendar}
            tone="blue"
            hint="Approximate total effort implied by your current subtasks."
          />
          <StatTile
            label="Learning Goals"
            value={formData.learningGoals.length}
            icon={BookOpen}
            tone="purple"
            hint="The capabilities students should walk away with."
          />
          <StatTile
            label="Publish Readiness"
            value={publishingSignals ? 'Ready' : 'Review'}
            icon={Users}
            tone="amber"
            hint="Whether the current edit feels complete enough to ship."
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
                  <Tag className="w-5 h-5 text-rose-600" />
                  <span>Project Tags</span>
                </CardTitle>
                <CardDescription>
                  Add relevant tags to help students discover your project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-rose-100 text-rose-800">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-rose-600 hover:text-rose-800"
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
          <div className="space-y-6 self-start lg:sticky lg:top-24">
            <ProjectQualityAssistant
              formData={formData}
              subtasks={subtasks}
              mode="edit"
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
                  <p className="text-sm font-semibold text-slate-900">Apply changes with confidence</p>
                  <p className="text-xs leading-5 text-slate-500">
                    Publish the refreshed version when it feels coherent, or keep iterating safely as a draft.
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
                  Update & Publish
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
                  Reset Form
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
            <AlertDialogTitle>Reset Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all form fields? This will restore to original project data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearForm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reset Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
} 
