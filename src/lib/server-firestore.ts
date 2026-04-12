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
import { buildUserRoleAnalytics } from "@/lib/role-analytics";
import {
  buildSubmissionUpdateData,
  selectLatestApprovedSubmission,
} from "@/lib/submission-review-utils";
import {
  Certificate,
  NGODashboard,
  Participation,
  Project,
  Submission,
  User,
  UserRole,
} from "@/lib/types";

type FirestoreDoc<T> = T & { id: string };
type PromptEvaluationRecord = NonNullable<Participation["promptEvaluations"]>[string][number];

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
