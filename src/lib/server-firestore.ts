import {
  FieldValue as AdminFieldValue,
  Timestamp as AdminTimestamp,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { buildUserAccountCleanupOperations } from "@/lib/account-cleanup-utils";
import {
  buildNGODashboardData,
  sortSubmissionsNewestFirst,
} from "@/lib/ngo-review-utils";
import { buildParticipationWriteData } from "@/lib/participation-payload";
import { buildUserRoleAnalytics } from "@/lib/role-analytics";
import { buildStudentProjectCatalogData } from "@/lib/student-project-catalog";
import { buildStudentTaskContext } from "@/lib/student-task-context";
import {
  buildClearedChatHistory,
  buildCompletedSubtaskUpdate,
  buildStudentProfileUpdate,
  getProjectJoinBlockReason,
  mergeParticipationHistoryEntry,
} from "@/lib/student-write-utils";
import {
  buildSubmissionUpdateData,
  selectLatestApprovedSubmission,
} from "@/lib/submission-review-utils";
import {
  ChatMessage,
  Certificate,
  NGODashboard,
  Participation,
  Project,
  StudentDashboard,
  Submission,
  User,
  UserRole,
} from "@/lib/types";

type FirestoreDoc<T> = T & { id: string };
type PromptEvaluationRecord = NonNullable<Participation["promptEvaluations"]>[string][number];
type PromptHistoryRecord = NonNullable<Participation["promptHistory"]>[string][number];
type EvaluationHistoryRecord = NonNullable<Participation["evaluationHistory"]>[string][number];

function toDoc<T>(id: string, data: FirebaseFirestore.DocumentData) {
  return { id, ...data } as FirestoreDoc<T>;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createUserAdmin(
  userData: Omit<User, "id" | "createdAt" | "updatedAt">,
) {
  const now = AdminTimestamp.now();
  const docRef = await adminDb.collection("users").add({
    ...userData,
    email: normalizeEmail(userData.email),
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function getUserAdmin(userId: string): Promise<User | null> {
  const snapshot = await adminDb.collection("users").doc(userId).get();

  if (!snapshot.exists) {
    return null;
  }

  return toDoc<User>(snapshot.id, snapshot.data()!);
}

export async function getUserByEmailAdmin(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await adminDb
    .collection("users")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return toDoc<User>(doc.id, doc.data());
}

export async function getUsersByRoleAdmin(role: UserRole): Promise<User[]> {
  const snapshot = await adminDb.collection("users").where("role", "==", role).get();
  return snapshot.docs.map((doc) => toDoc<User>(doc.id, doc.data()));
}

export async function getUsersAdmin(): Promise<User[]> {
  const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => toDoc<User>(doc.id, doc.data()));
}

export async function getProjectAdmin(projectId: string): Promise<Project | null> {
  const snapshot = await adminDb.collection("projects").doc(projectId).get();

  if (!snapshot.exists) {
    return null;
  }

  return toDoc<Project>(snapshot.id, snapshot.data()!);
}

export async function getProjectsAdmin(filters?: {
  ngoId?: string;
  status?: string;
  limit?: number;
}): Promise<Project[]> {
  let query = adminDb.collection("projects").orderBy("createdAt", "desc");

  if (filters?.ngoId) {
    query = query.where("ngoId", "==", filters.ngoId);
  }

  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => toDoc<Project>(doc.id, doc.data()));
}

export async function getParticipationAdmin(
  participationId: string,
): Promise<Participation | null> {
  const snapshot = await adminDb.collection("participations").doc(participationId).get();

  if (!snapshot.exists) {
    return null;
  }

  return toDoc<Participation>(snapshot.id, snapshot.data()!);
}

export async function getParticipationsAdmin(filters?: {
  studentId?: string;
  projectId?: string;
  status?: string;
}): Promise<Participation[]> {
  let query = adminDb.collection("participations").orderBy("joinedAt", "desc");

  if (filters?.studentId) {
    query = query.where("studentId", "==", filters.studentId);
  }

  if (filters?.projectId) {
    query = query.where("projectId", "==", filters.projectId);
  }

  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => toDoc<Participation>(doc.id, doc.data()));
}

export async function getParticipationByProjectAndStudentAdmin(
  projectId: string,
  studentId: string,
): Promise<Participation | null> {
  const snapshot = await adminDb
    .collection("participations")
    .where("projectId", "==", projectId)
    .where("studentId", "==", studentId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return toDoc<Participation>(doc.id, doc.data());
}

async function getOwnedStudentParticipationContext(
  studentId: string,
  participationId: string,
) {
  const participation = await getParticipationAdmin(participationId);
  if (!participation) {
    throw new Error("Participation not found");
  }

  if (participation.studentId !== studentId) {
    throw new Error("Forbidden");
  }

  const project = await getProjectAdmin(participation.projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  return { participation, project };
}

function assertProjectHasSubtask(project: Project, subtaskId: string) {
  const hasSubtask = project.subtasks.some((subtask) => subtask.id === subtaskId);
  if (!hasSubtask) {
    throw new Error("Subtask not found");
  }
}

export async function joinProjectAsStudentAdmin(studentId: string, projectId: string) {
  const projectRef = adminDb.collection("projects").doc(projectId);
  const studentRef = adminDb.collection("users").doc(studentId);
  const participationRef = adminDb.collection("participations").doc();

  return adminDb.runTransaction(async (transaction) => {
    const [projectSnapshot, studentSnapshot, existingParticipationSnapshot] = await Promise.all([
      transaction.get(projectRef),
      transaction.get(studentRef),
      transaction.get(
        adminDb
          .collection("participations")
          .where("projectId", "==", projectId)
          .where("studentId", "==", studentId)
          .limit(1),
      ),
    ]);

    if (!projectSnapshot.exists) {
      throw new Error("Project not found");
    }

    if (!studentSnapshot.exists) {
      throw new Error("User not found");
    }

    const project = toDoc<Project>(projectSnapshot.id, projectSnapshot.data()!);
    const student = toDoc<User>(studentSnapshot.id, studentSnapshot.data()!);
    const blockReason = getProjectJoinBlockReason({
      project,
      existingParticipationId: existingParticipationSnapshot.empty
        ? null
        : existingParticipationSnapshot.docs[0]?.id ?? null,
    });

    if (blockReason === "already_joined") {
      throw new Error("Project already joined");
    }

    if (blockReason === "project_full") {
      throw new Error("Project is full");
    }

    if (blockReason === "expired") {
      throw new Error("Project has expired");
    }

    if (blockReason === "not_joinable") {
      throw new Error("Project is not joinable");
    }

    const now = AdminTimestamp.now();
    transaction.set(
      participationRef,
      buildParticipationWriteData(
        {
          projectId: project.id,
          studentId,
          studentName: student.name,
          status: "active",
          progress: 0,
          completedSubtasks: [],
        },
        {
          classId: student.classId,
          now,
        },
      ),
    );
    transaction.update(projectRef, {
      currentParticipants: AdminFieldValue.increment(1),
      updatedAt: now,
    });

    return participationRef.id;
  });
}

export async function updateStudentProfileAdmin(
  studentId: string,
  input: {
    name: string;
    bio: string;
    school: string;
    grade: string;
    interests: string[];
  },
) {
  const user = await getUserAdmin(studentId);
  if (!user) {
    throw new Error("User not found");
  }

  const updateData = buildStudentProfileUpdate(user, input);
  await adminDb.collection("users").doc(studentId).update({
    ...updateData,
    updatedAt: AdminTimestamp.now(),
  });

  return getUserAdmin(studentId);
}

export async function getSubmissionsAdmin(filters?: {
  participationId?: string;
  projectId?: string;
  studentId?: string;
  status?: string;
}): Promise<Submission[]> {
  let query = adminDb.collection("submissions").orderBy("submittedAt", "desc");

  if (filters?.participationId) {
    query = query.where("participationId", "==", filters.participationId);
  }

  if (filters?.projectId) {
    query = query.where("projectId", "==", filters.projectId);
  }

  if (filters?.studentId) {
    query = query.where("studentId", "==", filters.studentId);
  }

  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => toDoc<Submission>(doc.id, doc.data()));
}

export async function getCertificateAdmin(
  certificateId: string,
): Promise<Certificate | null> {
  const snapshot = await adminDb.collection("certificates").doc(certificateId).get();

  if (!snapshot.exists) {
    return null;
  }

  return toDoc<Certificate>(snapshot.id, snapshot.data()!);
}

export async function getCertificatesAdmin(filters?: {
  studentId?: string;
  ngoId?: string;
  projectId?: string;
  participationId?: string;
}): Promise<Certificate[]> {
  let query = adminDb.collection("certificates").orderBy("issuedAt", "desc");

  if (filters?.studentId) {
    query = query.where("studentId", "==", filters.studentId);
  }

  if (filters?.ngoId) {
    query = query.where("ngoId", "==", filters.ngoId);
  }

  if (filters?.projectId) {
    query = query.where("projectId", "==", filters.projectId);
  }

  if (filters?.participationId) {
    query = query.where("participationId", "==", filters.participationId);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => toDoc<Certificate>(doc.id, doc.data()));
}

export async function savePromptEvaluationAdmin(
  participationId: string,
  subtaskId: string,
  evaluation: {
    goalScore: number;
    contextScore: number;
    expectationsScore: number;
    sourceScore: number;
    overallScore: number;
    prompt: string;
  },
  feedback?: {
    feedback?: string;
  },
) {
  const participationRef = adminDb.collection("participations").doc(participationId);

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(participationRef);
    if (!snapshot.exists) {
      throw new Error("Participation document not found");
    }

    const participation = snapshot.data() as Participation;
    const promptEvaluations = participation.promptEvaluations || {};
    const subtaskEvaluations = promptEvaluations[subtaskId] || [];
    const isGoodPrompt = evaluation.overallScore >= 70;

    let currentStreak = 0;
    let bestStreak = 0;

    if (subtaskEvaluations.length > 0) {
      const previous = subtaskEvaluations[subtaskEvaluations.length - 1];
      currentStreak = previous.streak || 0;
      bestStreak = previous.bestStreak || 0;

      if (isGoodPrompt) {
        currentStreak += 1;
        bestStreak = Math.max(currentStreak, bestStreak);
      } else {
        currentStreak = 0;
      }
    } else if (isGoodPrompt) {
      currentStreak = 1;
      bestStreak = 1;
    }

    const newEvaluation = {
      ...evaluation,
      timestamp: AdminTimestamp.now() as unknown as PromptEvaluationRecord["timestamp"],
      streak: currentStreak,
      bestStreak,
      feedback: feedback || null,
    } as PromptEvaluationRecord;

    promptEvaluations[subtaskId] = [...subtaskEvaluations, newEvaluation];

    transaction.update(participationRef, { promptEvaluations });

    return {
      currentStreak,
      bestStreak,
      isGoodPrompt,
    };
  });
}

export async function getAnalyticsSnapshotAdmin() {
  const [users, projects, participations, certificates, submissions] = await Promise.all([
    getUsersAdmin(),
    getProjectsAdmin(),
    getParticipationsAdmin(),
    getCertificatesAdmin(),
    getSubmissionsAdmin(),
  ]);

  const roleAnalytics = buildUserRoleAnalytics(users);

  return {
    totalUsers: users.length,
    totalProjects: projects.length,
    totalParticipations: participations.length,
    totalCertificates: certificates.length,
    totalSubmissions: submissions.length,
    activeUsersByRole: roleAnalytics.activeUsersByRole,
    legacyUsersByRole: roleAnalytics.legacyUsersByRole,
  };
}

export async function getNGODashboardAdmin(ngoId: string): Promise<NGODashboard> {
  const projects = await getProjectsAdmin({ ngoId });
  const projectParticipations = await Promise.all(
    projects.map((project) => getParticipationsAdmin({ projectId: project.id })),
  );
  const ownSubmissions = await getSubmissionsForNgoAdmin(ngoId);

  return buildNGODashboardData({
    projects,
    participations: projectParticipations.flat(),
    submissions: ownSubmissions.map((submission) => ({
      projectId: submission.projectId,
      status: submission.status,
    })),
  });
}

export async function getStudentDashboardAdmin(
  studentId: string,
): Promise<StudentDashboard> {
  const participations = await getParticipationsAdmin({ studentId });
  const activeProjects = participations.filter((participation) => participation.status === "active").length;
  const completedProjects = participations.filter(
    (participation) => participation.status === "completed",
  ).length;

  let totalHours = 0;

  for (const participation of participations) {
    const project = await getProjectAdmin(participation.projectId);
    if (!project?.subtasks) {
      continue;
    }

    const completedSubtasks = participation.completedSubtasks || [];
    for (const subtask of project.subtasks) {
      if (completedSubtasks.includes(subtask.id) && subtask.estimatedHours) {
        totalHours += subtask.estimatedHours;
      }
    }
  }

  const studentCertificates = await getCertificatesAdmin({ studentId });
  const certificates = studentCertificates.length;

  const recentActivity: StudentDashboard["recentActivity"] = [];

  for (const participation of participations.slice(0, 5)) {
    const project = await getProjectAdmin(participation.projectId);
    if (!project) {
      continue;
    }

    recentActivity.push({
      id: `join-${participation.id}`,
      type: "project_joined",
      title: `Joined ${project.title}`,
      description: `You joined a project by ${project.ngoName}`,
      timestamp: participation.joinedAt,
    });
  }

  for (const participation of participations) {
    const project = await getProjectAdmin(participation.projectId);
    if (!project?.subtasks) {
      continue;
    }

    const completedSubtasks = participation.completedSubtasks || [];
    if (participation.evaluationHistory) {
      for (const [subtaskId, evaluations] of Object.entries(participation.evaluationHistory)) {
        if (!evaluations?.length) {
          continue;
        }

        const sortedEvaluations = [...evaluations].sort(
          (left, right) => right.timestamp.toMillis() - left.timestamp.toMillis(),
        );
        const latestSuccessful = sortedEvaluations.find((evaluation) => evaluation.score >= 80);
        if (!latestSuccessful || !completedSubtasks.includes(subtaskId)) {
          continue;
        }

        const subtask = project.subtasks.find((item) => item.id === subtaskId);
        if (!subtask) {
          continue;
        }

        recentActivity.push({
          id: `complete-${participation.id}-${subtaskId}`,
          type: "subtask_completed",
          title: `Completed "${subtask.title}"`,
          description: `You completed a task in ${project.title} with a score of ${latestSuccessful.score}%`,
          timestamp: latestSuccessful.timestamp,
        });
      }
    }
  }

  const studentSubmissions = await getSubmissionsAdmin({ studentId });
  for (const submission of studentSubmissions.slice(0, 5)) {
    const project = await getProjectAdmin(submission.projectId);
    if (!project) {
      continue;
    }

    recentActivity.push({
      id: `submission-${submission.id}`,
      type: "submission_made",
      title: `Submitted work for ${project.title}`,
      description:
        submission.status === "pending"
          ? "Your submission is awaiting review"
          : `Your submission was ${submission.status}`,
      timestamp: submission.submittedAt,
    });
  }

  for (const certificate of studentCertificates.slice(0, 3)) {
    recentActivity.push({
      id: `certificate-${certificate.id}`,
      type: "certificate_earned",
      title: `Earned Certificate for ${certificate.projectTitle}`,
      description: "You received a certificate for completing the project",
      timestamp: certificate.issuedAt,
    });
  }

  recentActivity.sort((left, right) => right.timestamp.toMillis() - left.timestamp.toMillis());
  const finalRecentActivity = recentActivity.slice(0, 5);

  let totalPrompts = 0;
  let totalQualityScore = 0;
  let goodPromptsCount = 0;
  let bestStreak = 0;
  let totalGoalScore = 0;
  let totalContextScore = 0;
  let totalExpectationsScore = 0;
  let totalSourceScore = 0;
  let promptsWithGoalScore = 0;
  let promptsWithContextScore = 0;
  let promptsWithExpectationsScore = 0;
  let promptsWithSourceScore = 0;

  const recentPrompts: NonNullable<StudentDashboard["promptQualityMetrics"]>["recentPrompts"] = [];

  for (const participation of participations) {
    const project = await getProjectAdmin(participation.projectId);
    if (!project) {
      continue;
    }

    if (participation.promptHistory) {
      for (const [subtaskId, prompts] of Object.entries(participation.promptHistory)) {
        if (!prompts?.length) {
          continue;
        }

        const subtask = project.subtasks.find((item) => item.id === subtaskId);
        if (!subtask) {
          continue;
        }

        totalPrompts += prompts.length;

        for (const prompt of prompts) {
          totalQualityScore += prompt.qualityScore || 0;
          if (prompt.isGoodPrompt) {
            goodPromptsCount += 1;
          }
          if (prompt.goalScore) {
            totalGoalScore += prompt.goalScore;
            promptsWithGoalScore += 1;
          }
          if (prompt.contextScore) {
            totalContextScore += prompt.contextScore;
            promptsWithContextScore += 1;
          }
          if (prompt.expectationsScore) {
            totalExpectationsScore += prompt.expectationsScore;
            promptsWithExpectationsScore += 1;
          }
          if (prompt.sourceScore) {
            totalSourceScore += prompt.sourceScore;
            promptsWithSourceScore += 1;
          }

          if (recentPrompts.length < 20) {
            let feedbackForDisplay: { feedback?: string } | null = null;
            if (prompt.feedback) {
              if (
                "feedback" in prompt.feedback &&
                typeof prompt.feedback.feedback === "string"
              ) {
                feedbackForDisplay = { feedback: prompt.feedback.feedback };
              } else if ("strengths" in prompt.feedback || "tips" in prompt.feedback) {
                const strengths =
                  "strengths" in prompt.feedback && Array.isArray(prompt.feedback.strengths)
                    ? prompt.feedback.strengths.join(" ")
                    : "";
                const tips =
                  "tips" in prompt.feedback && Array.isArray(prompt.feedback.tips)
                    ? prompt.feedback.tips.join(" ")
                    : "";
                feedbackForDisplay = {
                  feedback: `${strengths} ${tips}`.trim(),
                };
              } else {
                feedbackForDisplay = {
                  feedback: "Feedback available but in an unsupported format.",
                };
              }
            }

            recentPrompts.push({
              id: `${participation.id}-${subtaskId}-${prompt.timestamp.toMillis()}`,
              projectId: participation.projectId,
              projectTitle: project.title,
              subtaskId,
              taskTitle: subtask.title,
              content: prompt.content,
              qualityScore: prompt.qualityScore || 0,
              timestamp: prompt.timestamp.toDate(),
              feedback: feedbackForDisplay,
            });
          }
        }
      }
    }

    if (participation.promptEvaluations) {
      for (const evaluations of Object.values(participation.promptEvaluations)) {
        for (const evaluation of evaluations) {
          if (evaluation.bestStreak && evaluation.bestStreak > bestStreak) {
            bestStreak = evaluation.bestStreak;
          }
        }
      }
    }
  }

  recentPrompts.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  const finalRecentPrompts = recentPrompts.slice(0, 5);

  const averageQualityScore = totalPrompts > 0 ? totalQualityScore / totalPrompts : 0;
  const goodPromptsPercentage =
    totalPrompts > 0 ? Math.round((goodPromptsCount / totalPrompts) * 100) : 0;
  const averageGoalScore =
    promptsWithGoalScore > 0 ? totalGoalScore / promptsWithGoalScore : 0;
  const averageContextScore =
    promptsWithContextScore > 0 ? totalContextScore / promptsWithContextScore : 0;
  const averageExpectationsScore =
    promptsWithExpectationsScore > 0
      ? totalExpectationsScore / promptsWithExpectationsScore
      : 0;
  const averageSourceScore =
    promptsWithSourceScore > 0 ? totalSourceScore / promptsWithSourceScore : 0;

  const upcomingDeadlines: StudentDashboard["upcomingDeadlines"] = [];

  for (const participation of participations.filter((item) => item.status === "active")) {
    const project = await getProjectAdmin(participation.projectId);
    if (!project) {
      continue;
    }

    let dueDate: Date;
    let priority: "high" | "medium" | "low";

    if (project.deadline) {
      dueDate = project.deadline.toDate();
      const today = new Date();
      const daysUntilDeadline = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilDeadline <= 7) {
        priority = "high";
      } else if (daysUntilDeadline <= 14) {
        priority = "medium";
      } else {
        priority = "low";
      }
    } else {
      const remainingProgress = 100 - participation.progress;
      const subtaskCount = project.subtasks?.length || 1;
      const difficultyFactor =
        project.difficulty === "advanced" ? 5 : project.difficulty === "intermediate" ? 3 : 2;
      const estimatedDaysToComplete = Math.ceil(
        (remainingProgress / 100) * subtaskCount * difficultyFactor,
      );
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + estimatedDaysToComplete);
      priority =
        participation.progress < 50 ? "high" : participation.progress < 80 ? "medium" : "low";
    }

    upcomingDeadlines.push({
      id: participation.id,
      title: `Complete ${project.title}`,
      projectTitle: project.title,
      dueDate: AdminTimestamp.fromDate(dueDate) as StudentDashboard["upcomingDeadlines"][number]["dueDate"],
      priority,
    });
  }

  return {
    activeProjects,
    completedProjects,
    totalHours,
    certificates,
    recentActivity: finalRecentActivity,
    upcomingDeadlines,
    promptQualityMetrics: {
      totalPrompts,
      averageScore: averageQualityScore,
      goodPromptsPercentage,
      bestStreak,
      averageGoalScore,
      averageContextScore,
      averageExpectationsScore,
      averageSourceScore,
      recentPrompts: finalRecentPrompts,
    },
  };
}

export async function getStudentMyProjectsAdmin(studentId: string) {
  const participations = await getParticipationsAdmin({ studentId });
  const certificates = await getCertificatesAdmin({ studentId });

  const projects = await Promise.all(
    participations.map(async (participation) => {
      const [project, submissions] = await Promise.all([
        getProjectAdmin(participation.projectId),
        getSubmissionsAdmin({
          participationId: participation.id,
          studentId,
        }),
      ]);

      if (!project) {
        return null;
      }

      const sortedSubtasks = [...project.subtasks].sort((left, right) => left.order - right.order);
      const nextSubtask =
        participation.status === "active"
          ? sortedSubtasks.find(
              (subtask) => !participation.completedSubtasks?.includes(subtask.id),
            )
          : undefined;

      return {
        ...participation,
        project,
        submission: submissions[0] ?? null,
        nextSubtask,
      };
    }),
  );

  return {
    projects: projects.filter((item) => item !== null),
    certificates,
  };
}

export async function getStudentProjectsCatalogAdmin(studentId: string) {
  const [publishedProjects, completedProjects, participations] = await Promise.all([
    getProjectsAdmin({ status: "published" }),
    getProjectsAdmin({ status: "completed" }),
    getParticipationsAdmin({ studentId }),
  ]);

  return buildStudentProjectCatalogData({
    publishedProjects,
    completedProjects,
    participations,
  });
}

export async function getStudentProfileAdmin(studentId: string) {
  const [user, dashboard] = await Promise.all([
    getUserAdmin(studentId),
    getStudentDashboardAdmin(studentId),
  ]);

  return {
    user,
    dashboard,
  };
}

export async function getProjectViewerAdmin(input: {
  projectId: string;
  studentId?: string;
}) {
  const project = await getProjectAdmin(input.projectId);

  if (!project) {
    return null;
  }

  if (!input.studentId) {
    return {
      project,
      myParticipation: null,
      myCertificate: null,
    };
  }

  const myParticipation = await getParticipationByProjectAndStudentAdmin(
    input.projectId,
    input.studentId,
  );

  if (!myParticipation) {
    return {
      project,
      myParticipation: null,
      myCertificate: null,
    };
  }

  const certificates = await getCertificatesAdmin({
    studentId: input.studentId,
    projectId: input.projectId,
  });

  return {
    project,
    myParticipation:
      myParticipation.status === "active" || myParticipation.status === "completed"
        ? myParticipation
        : null,
    myCertificate: certificates[0] ?? null,
  };
}

export async function getStudentTaskViewAdmin(input: {
  projectId: string;
  subtaskId: string;
  studentId: string;
}) {
  const project = await getProjectAdmin(input.projectId);
  if (!project) {
    return null;
  }

  const participation = await getParticipationByProjectAndStudentAdmin(
    input.projectId,
    input.studentId,
  );
  if (!participation) {
    return null;
  }

  const context = buildStudentTaskContext({
    project,
    participation,
    subtaskId: input.subtaskId,
  });

  return {
    project,
    participation,
    ...context,
  };
}

export async function saveStudentTaskChatHistoryAdmin(input: {
  studentId: string;
  participationId: string;
  subtaskId: string;
  messages: ChatMessage[];
}) {
  const { participation, project } = await getOwnedStudentParticipationContext(
    input.studentId,
    input.participationId,
  );
  assertProjectHasSubtask(project, input.subtaskId);

  const chatHistory = {
    ...(participation.chatHistory ?? {}),
    [input.subtaskId]: input.messages,
  };

  await adminDb.collection("participations").doc(participation.id).update({
    chatHistory,
    updatedAt: AdminTimestamp.now(),
  });

  return chatHistory;
}

export async function clearStudentTaskChatHistoryAdmin(input: {
  studentId: string;
  participationId: string;
  subtaskId: string;
}) {
  const { participation, project } = await getOwnedStudentParticipationContext(
    input.studentId,
    input.participationId,
  );
  assertProjectHasSubtask(project, input.subtaskId);

  const chatHistory = buildClearedChatHistory(participation.chatHistory, input.subtaskId);
  await adminDb.collection("participations").doc(participation.id).update({
    chatHistory,
    updatedAt: AdminTimestamp.now(),
  });

  return chatHistory;
}

export async function saveStudentGitHubRepoAdmin(input: {
  studentId: string;
  participationId: string;
  subtaskId: string;
  repoUrl: string;
}) {
  const { participation, project } = await getOwnedStudentParticipationContext(
    input.studentId,
    input.participationId,
  );
  assertProjectHasSubtask(project, input.subtaskId);

  const nextState = buildCompletedSubtaskUpdate({
    completedSubtasks: participation.completedSubtasks,
    subtaskId: input.subtaskId,
    totalSubtasks: project.subtasks.length,
  });

  await adminDb.collection("participations").doc(participation.id).update({
    studentGitHubRepo: input.repoUrl,
    completedSubtasks: nextState.completedSubtasks,
    progress: nextState.progress,
    updatedAt: AdminTimestamp.now(),
  });

  return {
    ...nextState,
    studentGitHubRepo: input.repoUrl,
  };
}

export async function saveStudentPromptHistoryAdmin(input: {
  studentId: string;
  participationId: string;
  subtaskId: string;
  promptContent: string;
  qualityData: {
    qualityScore: number;
    goalScore?: number;
    contextScore?: number;
    expectationsScore?: number;
    sourceScore?: number;
    isGoodPrompt?: boolean;
  };
  feedback?: {
    feedback?: string;
  } | null;
}) {
  const { participation, project } = await getOwnedStudentParticipationContext(
    input.studentId,
    input.participationId,
  );
  assertProjectHasSubtask(project, input.subtaskId);

  const promptEntry = {
    timestamp: AdminTimestamp.now(),
    content: input.promptContent,
    qualityScore: input.qualityData.qualityScore,
    goalScore: input.qualityData.goalScore,
    contextScore: input.qualityData.contextScore,
    expectationsScore: input.qualityData.expectationsScore,
    sourceScore: input.qualityData.sourceScore,
    isGoodPrompt: input.qualityData.isGoodPrompt,
    feedback: input.feedback ?? null,
  } as unknown as PromptHistoryRecord;

  const { newHistory, historyUpdate } = mergeParticipationHistoryEntry(
    participation.promptHistory,
    input.subtaskId,
    promptEntry,
  );

  await adminDb.collection("participations").doc(participation.id).update({
    promptHistory: historyUpdate,
    updatedAt: AdminTimestamp.now(),
  });

  return {
    entry: promptEntry,
    newHistory,
    historyUpdate,
  };
}

export async function saveStudentEvaluationHistoryAdmin(input: {
  studentId: string;
  participationId: string;
  subtaskId: string;
  result: Omit<
    NonNullable<Participation["evaluationHistory"]>[string][number],
    "timestamp"
  >;
}) {
  const { participation, project } = await getOwnedStudentParticipationContext(
    input.studentId,
    input.participationId,
  );
  assertProjectHasSubtask(project, input.subtaskId);

  const evaluationEntry = {
    ...input.result,
    timestamp: AdminTimestamp.now(),
  } as unknown as EvaluationHistoryRecord;

  const { newHistory, historyUpdate } = mergeParticipationHistoryEntry(
    participation.evaluationHistory,
    input.subtaskId,
    evaluationEntry,
  );

  await adminDb.collection("participations").doc(participation.id).update({
    evaluationHistory: historyUpdate,
    updatedAt: AdminTimestamp.now(),
  });

  return {
    entry: evaluationEntry,
    newHistory,
    historyUpdate,
  };
}

export async function completeStudentSubtaskAdmin(input: {
  studentId: string;
  participationId: string;
  subtaskId: string;
  result: Omit<
    NonNullable<Participation["evaluationHistory"]>[string][number],
    "timestamp"
  >;
}) {
  const { participation, project } = await getOwnedStudentParticipationContext(
    input.studentId,
    input.participationId,
  );
  assertProjectHasSubtask(project, input.subtaskId);

  if (typeof input.result.score !== "number" || input.result.score < 80) {
    throw new Error("Task evaluation score is below the completion threshold");
  }

  const evaluationEntry = {
    ...input.result,
    timestamp: AdminTimestamp.now(),
  } as unknown as EvaluationHistoryRecord;
  const { newHistory, historyUpdate } = mergeParticipationHistoryEntry(
    participation.evaluationHistory,
    input.subtaskId,
    evaluationEntry,
  );
  const nextState = buildCompletedSubtaskUpdate({
    completedSubtasks: participation.completedSubtasks,
    subtaskId: input.subtaskId,
    totalSubtasks: project.subtasks.length,
  });

  await adminDb.collection("participations").doc(participation.id).update({
    completedSubtasks: nextState.completedSubtasks,
    progress: nextState.progress,
    evaluationHistory: historyUpdate,
    updatedAt: AdminTimestamp.now(),
  });

  return {
    ...nextState,
    newHistory,
    historyUpdate,
  };
}

export async function submitStudentProjectForReviewAdmin(input: {
  studentId: string;
  participationId: string;
  content: string;
}) {
  const { participation, project } = await getOwnedStudentParticipationContext(
    input.studentId,
    input.participationId,
  );
  const user = await getUserAdmin(input.studentId);
  if (!user) {
    throw new Error("User not found");
  }

  const submissionRef = adminDb.collection("submissions").doc();
  const participationRef = adminDb.collection("participations").doc(participation.id);
  const now = AdminTimestamp.now();

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(submissionRef, {
      participationId: participation.id,
      projectId: project.id,
      studentId: participation.studentId,
      studentName: participation.studentName ?? user.name,
      content: input.content,
      status: "pending",
      submittedAt: now,
    });

    transaction.update(participationRef, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
  });

  return {
    submissionId: submissionRef.id,
    completedAt: now,
    status: "completed" as const,
  };
}

export interface NgoSubmissionRecord extends Submission {
  projectTitle?: string;
  participationProgress?: number;
  githubRepo?: string;
}

export async function getSubmissionsForNgoAdmin(
  ngoId: string,
): Promise<NgoSubmissionRecord[]> {
  const projects = await getProjectsAdmin({ ngoId });
  if (projects.length === 0) {
    return [];
  }

  const submissions = await Promise.all(
    projects.map(async (project) => {
      const projectSubmissions = await getSubmissionsAdmin({ projectId: project.id });

      const enhanced = await Promise.all(
        projectSubmissions.map(async (submission) => {
          const participation = await getParticipationAdmin(submission.participationId);

          return {
            ...submission,
            projectTitle: project.title,
            participationProgress: participation?.progress ?? 0,
            githubRepo: participation?.studentGitHubRepo,
          } satisfies NgoSubmissionRecord;
        }),
      );

      return enhanced;
    }),
  );

  return sortSubmissionsNewestFirst(submissions.flat()) as NgoSubmissionRecord[];
}

export async function reviewNgoSubmissionAdmin(input: {
  ngoId: string;
  submissionId: string;
  status: "approved" | "rejected" | "needs_revision";
  reviewComment?: string;
  rating?: number;
  reviewedBy: string;
}) {
  const submissionRef = adminDb.collection("submissions").doc(input.submissionId);
  const now = AdminTimestamp.now();

  await adminDb.runTransaction(async (transaction) => {
    const submissionSnapshot = await transaction.get(submissionRef);
    if (!submissionSnapshot.exists) {
      throw new Error("Submission not found");
    }

    const submission = toDoc<Submission>(submissionSnapshot.id, submissionSnapshot.data()!);
    const projectSnapshot = await transaction.get(
      adminDb.collection("projects").doc(submission.projectId),
    );
    if (!projectSnapshot.exists) {
      throw new Error("Project not found");
    }

    const project = toDoc<Project>(projectSnapshot.id, projectSnapshot.data()!);
    if (project.ngoId !== input.ngoId) {
      throw new Error("Forbidden");
    }

    const updateData = buildSubmissionUpdateData(
      {
        status: input.status,
        reviewComment: input.reviewComment,
        reviewedBy: input.reviewedBy,
        ...(input.status === "approved" && typeof input.rating === "number"
          ? { rating: input.rating }
          : {}),
      },
      now,
    );

    transaction.update(submissionRef, updateData);

    if (input.status === "approved") {
      transaction.update(
        adminDb.collection("participations").doc(submission.participationId),
        {
          status: "completed",
          completedAt: now,
        },
      );
    }
  });
}

export interface CompletedNgoProjectRecord {
  participation: Participation;
  project: Project;
  student: {
    id: string;
    name: string;
  };
  submission: Submission;
  hasCertificate: boolean;
  certificate: Certificate | null;
}

export async function getCompletedProjectsForNgoAdmin(
  ngoId: string,
): Promise<CompletedNgoProjectRecord[]> {
  const projects = await getProjectsAdmin({ ngoId });
  const records: CompletedNgoProjectRecord[] = [];

  for (const project of projects) {
    const participations = await getParticipationsAdmin({
      projectId: project.id,
      status: "completed",
    });

    for (const participation of participations) {
      const [submissions, certificates, student] = await Promise.all([
        getSubmissionsAdmin({ participationId: participation.id, status: "approved" }),
        getCertificatesAdmin({ participationId: participation.id }),
        participation.studentName
          ? Promise.resolve({
              id: participation.studentId,
              name: participation.studentName,
            })
          : getUserAdmin(participation.studentId).then((user) =>
              user
                ? {
                    id: user.id,
                    name: user.name,
                  }
                : null,
            ),
      ]);

      const approvedSubmission = selectLatestApprovedSubmission(submissions);
      if (!approvedSubmission || !student) {
        continue;
      }

      records.push({
        participation,
        project,
        student,
        submission: approvedSubmission,
        hasCertificate: certificates.length > 0,
        certificate: certificates[0] ?? null,
      });
    }
  }

  return records;
}

export async function getProjectParticipationSummariesAdmin(projectId: string) {
  const participations = await getParticipationsAdmin({ projectId });

  return participations.map((participation) => ({
    id: participation.id,
    studentId: participation.studentId,
    studentName: participation.studentName ?? "Student",
    progress: participation.progress,
    status: participation.status,
  }));
}

export async function getPublicProjectParticipantSummariesAdmin(projectId: string) {
  const project = await getProjectAdmin(projectId);
  if (!project || project.status === "draft") {
    return null;
  }

  const participants = await getProjectParticipationSummariesAdmin(projectId);

  return participants
    .slice(0, 5)
    .map((participant) => ({
      id: participant.id,
      studentId: participant.studentId,
      studentName: participant.studentName,
      progress: participant.progress,
    }));
}

export async function updateProjectStatusesAdmin() {
  const now = AdminTimestamp.now();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTimestamp = AdminTimestamp.fromDate(thirtyDaysAgo);

  const statusChanges = {
    completed: 0,
    archived: 0,
    errors: 0,
  };

  const batch = adminDb.batch();
  const publishedProjects = await adminDb
    .collection("projects")
    .where("status", "==", "published")
    .get();

  for (const snapshot of publishedProjects.docs) {
    const project = toDoc<Project>(snapshot.id, snapshot.data());
    if (project.deadline && project.deadline.toMillis() < now.toMillis()) {
      batch.update(snapshot.ref, {
        status: "completed",
        updatedAt: now,
      });
      statusChanges.completed += 1;
    }
  }

  const completedProjects = await adminDb
    .collection("projects")
    .where("status", "==", "completed")
    .get();

  for (const snapshot of completedProjects.docs) {
    const project = toDoc<Project>(snapshot.id, snapshot.data());
    if (project.updatedAt && project.updatedAt.toMillis() < thirtyDaysAgoTimestamp.toMillis()) {
      batch.update(snapshot.ref, {
        status: "archived",
        updatedAt: now,
      });
      statusChanges.archived += 1;
    }
  }

  const orphanCandidates = await adminDb
    .collection("projects")
    .where("status", "==", "published")
    .get();

  for (const snapshot of orphanCandidates.docs) {
    const project = toDoc<Project>(snapshot.id, snapshot.data());
    const ngo = await getUserAdmin(project.ngoId);
    if (!ngo && project.deadline && project.deadline.toMillis() < now.toMillis()) {
      batch.update(snapshot.ref, {
        status: "completed",
        updatedAt: now,
      });
      statusChanges.completed += 1;
    }
  }

  if (statusChanges.completed > 0 || statusChanges.archived > 0) {
    await batch.commit();
  }

  return {
    success: true,
    updatedAt: now.toDate(),
    changes: statusChanges,
  };
}

export async function deleteUserAccountAdmin(userId: string) {
  const user = await getUserAdmin(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const now = AdminTimestamp.now();
  const isStudent = user.role === "student";
  const needsNgoCleanup = user.role === "ngo" || user.role === "teacher";
  const needsTeacherReviewCleanup = user.role === "teacher";

  const studentParticipations = isStudent ? await getParticipationsAdmin({ studentId: userId }) : [];
  const submissionsByParticipation = isStudent
    ? Object.fromEntries(
        await Promise.all(
          studentParticipations.map(async (participation) => [
            participation.id,
            await getSubmissionsAdmin({
              participationId: participation.id,
              studentId: userId,
            }),
          ]),
        ),
      )
    : {};
  const studentCertificates = isStudent ? await getCertificatesAdmin({ studentId: userId }) : [];
  const ngoProjects = needsNgoCleanup ? await getProjectsAdmin({ ngoId: userId }) : [];
  const allSubmissions = needsTeacherReviewCleanup ? await getSubmissionsAdmin({}) : [];

  const operations = buildUserAccountCleanupOperations({
    user,
    now,
    participations: studentParticipations,
    submissionsByParticipation,
    certificates: studentCertificates,
    projects: ngoProjects,
    submissions: allSubmissions,
  });

  const batch = adminDb.batch();

  for (const operation of operations) {
    switch (operation.type) {
      case "updateProjectParticipantCount":
        batch.update(adminDb.collection("projects").doc(operation.projectId), {
          currentParticipants: AdminFieldValue.increment(operation.delta),
          updatedAt: operation.updatedAt,
        });
        break;
      case "archiveProject":
        batch.update(adminDb.collection("projects").doc(operation.projectId), {
          status: "archived",
          updatedAt: operation.updatedAt,
        });
        break;
      case "clearSubmissionReviewer":
        batch.update(adminDb.collection("submissions").doc(operation.submissionId), {
          reviewedBy: null,
          updatedAt: operation.updatedAt,
        });
        break;
      case "deleteProject":
        batch.delete(adminDb.collection("projects").doc(operation.id));
        break;
      case "deleteParticipation":
        batch.delete(adminDb.collection("participations").doc(operation.id));
        break;
      case "deleteSubmission":
        batch.delete(adminDb.collection("submissions").doc(operation.id));
        break;
      case "deleteCertificate":
        batch.delete(adminDb.collection("certificates").doc(operation.id));
        break;
      case "deleteUser":
        batch.delete(adminDb.collection("users").doc(operation.id));
        break;
    }
  }

  await batch.commit();
}
