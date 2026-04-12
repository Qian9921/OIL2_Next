import { Timestamp } from "firebase/firestore";
import { storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  User,
  Project,
  Participation,
  Submission,
  Subtask,
  NGODashboard,
  StudentDashboard,
  Certificate,
  ChatMessage,
} from "./types";
import { deserializeFirestoreJson, serializeFirestoreJson } from "./firestore-json";
import { fromIsoTimestamp } from "./timestamp-serialization";
import { assertProjectStatusTransition } from "./project-write-utils";

async function fetchInternalJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

type SerializedUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedProject = Omit<Project, "createdAt" | "updatedAt" | "deadline"> & {
  createdAt: string;
  updatedAt: string;
  deadline: string | null;
};

type SerializedCertificate = Omit<Certificate, "issuedAt" | "completionDate"> & {
  issuedAt: string;
  completionDate: string;
};

export type StudentProjectParticipationSummary = Pick<
  Participation,
  "id" | "projectId" | "status" | "progress"
>;

export interface ProjectViewerData {
  project: Project;
  myParticipation: Participation | null;
  myCertificate: Certificate | null;
}

export interface StudentTaskViewData {
  project: Project;
  participation: Participation;
  subtask: Subtask;
  isCurrentSequentially: boolean;
  isSubtaskCompletedByStudent: boolean;
  chatMessages?: ChatMessage[];
}

type PromptHistoryEntry = NonNullable<Participation["promptHistory"]>[string][number];
type EvaluationHistoryEntry = NonNullable<Participation["evaluationHistory"]>[string][number];

async function postStudentParticipationAction<T>(
  participationId: string,
  body: Record<string, unknown>,
): Promise<T> {
  const data = await fetchInternalJson<unknown>(
    `/api/student/participations/${participationId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return deserializeFirestoreJson<T>(data);
}

// Project operations
export async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'currentParticipants'>) {
  const response = await fetchInternalJson<{ projectId: string }>("/api/ngo/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(serializeFirestoreJson(projectData)),
  });

  return response.projectId;
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const data = await fetchInternalJson<unknown>(`/api/ngo/projects/${projectId}`);
    return deserializeFirestoreJson<Project>(data);
  } catch {
    return null;
  }
}

export async function getProjectViewerData(projectId: string): Promise<ProjectViewerData | null> {
  const data = await fetchInternalJson<ProjectViewerData | { error: string }>(
    `/api/projects/${projectId}/viewer`,
  );

  if (!data || ("error" in data && typeof data.error === "string")) {
    return null;
  }

  return deserializeFirestoreJson<ProjectViewerData>(data);
}

export async function getStudentTaskViewData(
  projectId: string,
  subtaskId: string,
): Promise<StudentTaskViewData> {
  const data = await fetchInternalJson<unknown>(
    `/api/student/projects/${projectId}/task/${subtaskId}`,
  );

  return deserializeFirestoreJson<StudentTaskViewData>(data);
}

export async function getProjects(filters?: {
  ngoId?: string;
  status?: string;
  limit?: number;
}): Promise<Project[]> {
  const searchParams = new URLSearchParams();

  if (filters?.status) {
    searchParams.set("status", filters.status);
  }

  if (filters?.limit) {
    searchParams.set("limit", String(filters.limit));
  }

  const querySuffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const data = await fetchInternalJson<unknown[]>(`/api/ngo/projects${querySuffix}`);
  return deserializeFirestoreJson<Project[]>(data);
}

export async function updateProject(projectId: string, projectData: Partial<Project>) {
  await fetchInternalJson<{ success: boolean }>(`/api/ngo/projects/${projectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(serializeFirestoreJson(projectData)),
  });
}

export async function deleteProject(projectId: string) {
  await fetchInternalJson<{ success: boolean }>(`/api/ngo/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function deleteParticipation(participationId: string) {
  await postStudentParticipationAction<{ success: true }>(participationId, {
    action: "leave-project",
  });
}

export async function handleRejectedProject(participationId: string) {
  await postStudentParticipationAction<{ success: true }>(participationId, {
    action: "accept-rejected-exit",
  });
}

// Dashboard data functions
export async function getNGODashboard(_ngoId: string): Promise<NGODashboard> {
  void _ngoId;
  return fetchInternalJson<NGODashboard>("/api/ngo/dashboard");
}

export async function getStudentDashboard(studentId: string): Promise<StudentDashboard> {
  void studentId;
  const data = await fetchInternalJson<{
    activeProjects: number;
    completedProjects: number;
    totalHours: number;
    certificates: number;
    recentActivity: Array<StudentDashboard["recentActivity"][number] & { timestamp: string }>;
    upcomingDeadlines: Array<StudentDashboard["upcomingDeadlines"][number] & { dueDate: string }>;
    promptQualityMetrics?: Omit<
      NonNullable<StudentDashboard["promptQualityMetrics"]>,
      "recentPrompts"
    > & {
      recentPrompts: Array<
        Omit<NonNullable<StudentDashboard["promptQualityMetrics"]>["recentPrompts"][number], "timestamp"> & {
          timestamp: string;
        }
      >;
    };
  }>("/api/student/dashboard");

  return {
    ...data,
    recentActivity: data.recentActivity.map((activity) => ({
      ...activity,
      timestamp: fromIsoTimestamp(activity.timestamp)!,
    })),
    upcomingDeadlines: data.upcomingDeadlines.map((deadline) => ({
      ...deadline,
      dueDate: fromIsoTimestamp(deadline.dueDate)!,
    })),
    promptQualityMetrics: data.promptQualityMetrics
      ? {
          ...data.promptQualityMetrics,
          recentPrompts: data.promptQualityMetrics.recentPrompts.map((prompt) => ({
            ...prompt,
            timestamp: new Date(prompt.timestamp),
          })),
        }
      : undefined,
  };
}

export async function getStudentProjectsCatalog(): Promise<{
  projects: Project[];
  participations: StudentProjectParticipationSummary[];
  userParticipationProjectIds: string[];
}> {
  const data = await fetchInternalJson<{
    projects: SerializedProject[];
    participations: StudentProjectParticipationSummary[];
    userParticipationProjectIds: string[];
  }>("/api/student/projects");

  return {
    ...data,
    projects: data.projects.map((project) => ({
      ...project,
      createdAt: fromIsoTimestamp(project.createdAt)!,
      updatedAt: fromIsoTimestamp(project.updatedAt)!,
      deadline: fromIsoTimestamp(project.deadline ?? project.updatedAt)!,
    })),
  };
}

export async function getStudentCertificatesData(): Promise<Certificate[]> {
  const data = await fetchInternalJson<{
    certificates: SerializedCertificate[];
  }>("/api/student/certificates");

  return data.certificates.map((certificate) => ({
    ...certificate,
    issuedAt: fromIsoTimestamp(certificate.issuedAt)!,
    completionDate: fromIsoTimestamp(certificate.completionDate)!,
  }));
}

export async function getStudentProfileData(): Promise<{
  user: User | null;
  dashboard: StudentDashboard;
}> {
  const data = await fetchInternalJson<{
    user: SerializedUser | null;
    dashboard: {
      activeProjects: number;
      completedProjects: number;
      totalHours: number;
      certificates: number;
      recentActivity: Array<StudentDashboard["recentActivity"][number] & { timestamp: string }>;
      upcomingDeadlines: Array<StudentDashboard["upcomingDeadlines"][number] & { dueDate: string }>;
      promptQualityMetrics?: Omit<
        NonNullable<StudentDashboard["promptQualityMetrics"]>,
        "recentPrompts"
      > & {
        recentPrompts: Array<
          Omit<NonNullable<StudentDashboard["promptQualityMetrics"]>["recentPrompts"][number], "timestamp"> & {
            timestamp: string;
          }
        >;
      };
    };
  }>("/api/student/profile");

  return {
    user: data.user
      ? {
          ...data.user,
          createdAt: fromIsoTimestamp(data.user.createdAt)!,
          updatedAt: fromIsoTimestamp(data.user.updatedAt)!,
        }
      : null,
    dashboard: {
      ...data.dashboard,
      recentActivity: data.dashboard.recentActivity.map((activity) => ({
        ...activity,
        timestamp: fromIsoTimestamp(activity.timestamp)!,
      })),
      upcomingDeadlines: data.dashboard.upcomingDeadlines.map((deadline) => ({
        ...deadline,
        dueDate: fromIsoTimestamp(deadline.dueDate)!,
      })),
      promptQualityMetrics: data.dashboard.promptQualityMetrics
        ? {
            ...data.dashboard.promptQualityMetrics,
            recentPrompts: data.dashboard.promptQualityMetrics.recentPrompts.map((prompt) => ({
              ...prompt,
              timestamp: new Date(prompt.timestamp),
            })),
          }
        : undefined,
    },
  };
}

export async function updateStudentProfile(input: {
  name: string;
  bio: string;
  school: string;
  grade: string;
  interests: string[];
}): Promise<User | null> {
  const data = await fetchInternalJson<{ user: SerializedUser | null }>("/api/student/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return data.user
    ? {
        ...data.user,
        createdAt: fromIsoTimestamp(data.user.createdAt)!,
        updatedAt: fromIsoTimestamp(data.user.updatedAt)!,
      }
    : null;
}

export async function getNgoProfileData(): Promise<{
  user: User | null;
  dashboard: NGODashboard;
}> {
  const data = await fetchInternalJson<{
    user: SerializedUser | null;
    dashboard: NGODashboard;
  }>("/api/ngo/profile");

  return {
    user: data.user
      ? {
          ...data.user,
          createdAt: fromIsoTimestamp(data.user.createdAt)!,
          updatedAt: fromIsoTimestamp(data.user.updatedAt)!,
        }
      : null,
    dashboard: data.dashboard,
  };
}

export async function updateNgoProfile(input: {
  name: string;
  bio: string;
  website: string;
  location: string;
  focusAreas: string[];
  signature: string;
}): Promise<User | null> {
  const data = await fetchInternalJson<{ user: SerializedUser | null }>("/api/ngo/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return data.user
    ? {
        ...data.user,
        createdAt: fromIsoTimestamp(data.user.createdAt)!,
        updatedAt: fromIsoTimestamp(data.user.updatedAt)!,
      }
    : null;
}

export async function joinProjectAsStudent(projectId: string): Promise<string> {
  const data = await fetchInternalJson<{ participationId: string }>(
    `/api/student/projects/${projectId}/join`,
    {
      method: "POST",
    },
  );

  return data.participationId;
}

export async function saveStudentTaskChatHistory(
  participationId: string,
  subtaskId: string,
  messages: ChatMessage[],
): Promise<Record<string, ChatMessage[]>> {
  const data = await postStudentParticipationAction<{ chatHistory: Record<string, ChatMessage[]> }>(
    participationId,
    {
      action: "save-chat-history",
      subtaskId,
      messages,
    },
  );

  return data.chatHistory;
}

export async function clearStudentTaskChatHistory(
  participationId: string,
  subtaskId: string,
): Promise<Record<string, ChatMessage[]>> {
  const data = await postStudentParticipationAction<{ chatHistory: Record<string, ChatMessage[]> }>(
    participationId,
    {
      action: "clear-chat-history",
      subtaskId,
    },
  );

  return data.chatHistory;
}

export async function saveStudentGitHubRepo(
  participationId: string,
  subtaskId: string,
  repoUrl: string,
): Promise<{
  completedSubtasks: string[];
  progress: number;
  studentGitHubRepo: string;
}> {
  return postStudentParticipationAction(participationId, {
    action: "save-github-repo",
    subtaskId,
    repoUrl,
  });
}

export async function saveStudentPromptHistoryEntry(
  participationId: string,
  subtaskId: string,
  promptContent: string,
  qualityData: {
    qualityScore: number;
    goalScore?: number;
    contextScore?: number;
    expectationsScore?: number;
    sourceScore?: number;
    isGoodPrompt?: boolean;
  },
  feedback?: {
    feedback?: string;
  } | null,
): Promise<{
  entry: PromptHistoryEntry;
  newHistory: PromptHistoryEntry[];
  historyUpdate: NonNullable<Participation["promptHistory"]>;
}> {
  return postStudentParticipationAction(participationId, {
    action: "save-prompt-history",
    subtaskId,
    promptContent,
    qualityData,
    feedback: feedback ?? null,
  });
}

export async function saveStudentEvaluationHistoryEntry(
  participationId: string,
  subtaskId: string,
  result: Omit<EvaluationHistoryEntry, "timestamp">,
): Promise<{
  entry: EvaluationHistoryEntry;
  newHistory: EvaluationHistoryEntry[];
  historyUpdate: NonNullable<Participation["evaluationHistory"]>;
}> {
  return postStudentParticipationAction(participationId, {
    action: "save-evaluation-history",
    subtaskId,
    result,
  });
}

export async function completeStudentSubtaskWithEvaluation(
  participationId: string,
  subtaskId: string,
  result: Omit<EvaluationHistoryEntry, "timestamp">,
): Promise<{
  completedSubtasks: string[];
  progress: number;
  newHistory: EvaluationHistoryEntry[];
  historyUpdate: NonNullable<Participation["evaluationHistory"]>;
}> {
  return postStudentParticipationAction(participationId, {
    action: "complete-subtask",
    subtaskId,
    result,
  });
}

export async function submitStudentProject(
  participationId: string,
  content: string,
): Promise<{
  submissionId: string;
  completedAt: Timestamp;
  status: "completed";
}> {
  return postStudentParticipationAction(participationId, {
    action: "submit-project",
    content,
  });
}

// Certificate operations
export async function createCertificate(certificateData: Omit<Certificate, 'id' | 'issuedAt' | 'certificateNumber'>) {
  return fetchInternalJson<{ id: string; certificateNumber: string }>("/api/ngo/certificates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(serializeFirestoreJson(certificateData)),
  });
}

export async function getCompletedProjectsForNGO(_ngoId: string) {
  void _ngoId;
  const records = await fetchInternalJson<
    Array<{
      participation: Participation & { completedAt?: string | null };
      project: Project;
      student: { id: string; name: string };
      submission: Submission & { submittedAt: string; reviewedAt?: string | null };
      hasCertificate: boolean;
      certificate: (Certificate & {
        issuedAt?: string | null;
        completionDate?: string | null;
      }) | null;
    }>
  >("/api/ngo/certificates/completed-projects");

  return records.map((record) => ({
    ...record,
    participation: {
      ...record.participation,
      ...(record.participation.completedAt
        ? { completedAt: fromIsoTimestamp(record.participation.completedAt) }
        : {}),
    },
    submission: {
      ...record.submission,
      submittedAt: fromIsoTimestamp(record.submission.submittedAt)!,
      reviewedAt: fromIsoTimestamp(record.submission.reviewedAt),
    },
    certificate: record.certificate
      ? {
          ...record.certificate,
          issuedAt: fromIsoTimestamp(record.certificate.issuedAt),
          completionDate: fromIsoTimestamp(record.certificate.completionDate),
        }
      : null,
  }));
}

// Add a new function to delete a user account and handle associated data
export async function deleteUserAccount(userId: string) {
  await fetchInternalJson<{ success: true }>("/api/account/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });
}

// Add a function to upload a profile picture and update user avatar
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  // Create a storage reference
  const storageRef = ref(storage, `profile_pictures/${userId}`);
  
  // Upload file to Firebase Storage
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  // Wait for upload to complete
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress tracking if needed
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Handle errors
        reject(error);
      },
      async () => {
        // Upload completed successfully, get the download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const persisted = await fetchInternalJson<{ avatar: string }>("/api/profile/avatar", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              avatar: downloadURL,
            }),
          });
          
          resolve(persisted.avatar);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Modify handleStatusChange to enforce logical project lifecycle rules
export async function handleStatusChange(projectId: string, newStatus: Project['status'], oldStatus: Project['status']) {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  assertProjectStatusTransition({
    oldStatus,
    newStatus,
    deadline: project.deadline,
    subtaskCount: project.subtasks?.length ?? 0,
  });

  await updateProject(projectId, { status: newStatus });
  
  return { success: true, status: newStatus };
}

export async function getSubmissionsForNgo(_ngoId: string): Promise<Submission[]> {
  void _ngoId;
  const submissions = await fetchInternalJson<
    Array<Submission & {
      projectTitle?: string;
      participationProgress?: number;
      githubRepo?: string;
      submittedAt: string;
      reviewedAt?: string | null;
    }>
  >("/api/ngo/submissions");

  return submissions.map((submission) => ({
    ...submission,
    submittedAt: fromIsoTimestamp(submission.submittedAt)!,
    reviewedAt: fromIsoTimestamp(submission.reviewedAt),
  }));
}

export async function reviewSubmissionForNgo(
  submissionId: string,
  input: {
    status: "approved" | "rejected" | "needs_revision";
    reviewComment?: string;
    rating?: number;
  },
) {
  return fetchInternalJson<{ success: boolean }>(
    `/api/ngo/submissions/${submissionId}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}
