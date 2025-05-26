import { Timestamp } from "firebase/firestore";

export type UserRole = 'student' | 'teacher' | 'ngo';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  profile?: {
    bio?: string;
    school?: string;
    grade?: string;
    interests?: string[];
    website?: string;
    location?: string;
    focusAreas?: string[];
    institution?: string;
    subject?: string;
    experience?: number;
  };
}

export interface Project {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  ngoId: string;
  ngoName: string;
  status: 'draft' | 'published' | 'completed' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  maxParticipants?: number;
  currentParticipants: number;
  tags?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  deadline: Timestamp;
  subtasks: Subtask[];
  requirements?: string[];
  learningGoals?: string[];
  image?: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedHours?: number;
  resources?: string[];
  completionCriteria?: string[];
}

export interface Participation {
  id: string;
  projectId: string;
  studentId: string;
  studentName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  joinedAt: Timestamp;
  startTime?: Timestamp;
  endTime?: Timestamp;
  completedAt?: Timestamp;
  status: 'active' | 'completed' | 'dropped';
  progress: number;
  currentSubtaskId?: string;
  completedSubtasks?: string[];
  chatHistory?: { [subtaskId: string]: ChatMessage[] };
  studentGitHubRepo?: string;
  promptEvaluations?: {
    [subtaskId: string]: Array<{
      goalScore: number;
      contextScore: number;
      expectationsScore: number;
      sourceScore: number;
      overallScore: number;
      prompt: string;
      timestamp: Timestamp;
      streak: number;
      bestStreak: number;
    }>;
  };
  evaluationHistory?: {
    [subtaskId: string]: Array<{
      timestamp: Timestamp;
      score: number;
      feedback: string;
      success?: boolean;
      message?: string;
      evaluationId?: string;
      status?: string;
      result?: {
        rawContent?: {
          summary?: string;
          assessment?: number;
          checkpoints?: Array<{
            status: string;
            details: string;
            requirement: string;
          }>;
          improvements?: string[];
        }
      }
    }>;
  };
  promptHistory?: {
    [subtaskId: string]: Array<{
      timestamp: Timestamp;
      content: string;
      qualityScore: number;
      goalScore?: number;
      contextScore?: number;
      expectationsScore?: number;
      sourceScore?: number;
      isGoodPrompt?: boolean;
      feedback?: {
        tips: string[];
        strengths: string[];
        componentFeedback: {
          goal?: string;
          context?: string;
          expectations?: string;
          source?: string;
        }
      } | null;
    }>;
  };
}

export interface ChatMessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // For frontend, this can be base64 with prefix. API expects raw base64.
  };
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  id?: string;
  userId?: string;
  userName?: string;
  createdAt?: string;
  imageData?: string;
}

export interface Submission {
  id: string;
  participationId: string;
  projectId: string;
  studentId: string;
  studentName?: string;
  teacherId?: string;
  content: string;
  attachments?: string[];
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  teacherFeedback?: string;
  reviewComment?: string;
  grade?: number;
  rating?: number;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  projectId: string;
  projectTitle: string;
  ngoId: string;
  ngoName: string;
  participationId: string;
  issuedAt: Timestamp;
  certificateNumber: string;
  completionDate: Timestamp;
  rating?: number;
}

// Dashboard data types
export interface StudentDashboard {
  activeProjects: number;
  completedProjects: number;
  totalHours: number;
  certificates: number;
  recentActivity: Activity[];
  upcomingDeadlines: Deadline[];
  promptQualityMetrics?: {
    totalPrompts: number;
    averageScore: number;
    goodPromptsPercentage: number;
    bestStreak: number;
    averageGoalScore: number;
    averageContextScore: number;
    averageExpectationsScore: number;
    averageSourceScore: number;
    recentPrompts: Array<{
      id: string;
      projectId: string;
      projectTitle: string;
      subtaskId: string;
      taskTitle: string;
      content: string;
      qualityScore: number;
      timestamp: Date;
      feedback?: {
        tips: string[];
        strengths: string[];
        componentFeedback?: {
          goal?: string;
          context?: string;
          expectations?: string;
          source?: string;
        };
      };
    }>;
  };
}

export interface NGODashboard {
  publishedProjects: number;
  totalParticipants: number;
  completedProjects: number;
  pendingReviews: number;
  projectStats: ProjectStats[];
}

export interface TeacherDashboard {
  studentsSupervised: number;
  projectsSupervised: number;
  pendingReviews: number;
  recentSubmissions: Submission[];
}

export interface ProjectStats {
  projectId: string;
  projectTitle: string;
  participants: number;
  completionRate: number;
  averageProgress: number;
}

export interface Activity {
  id: string;
  type: 'project_joined' | 'subtask_completed' | 'submission_made' | 'certificate_earned';
  title: string;
  description: string;
  timestamp: Timestamp;
}

export interface Deadline {
  id: string;
  title: string;
  projectTitle: string;
  dueDate: Timestamp;
  priority: 'low' | 'medium' | 'high';
} 