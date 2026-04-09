import { Certificate, Participation, Project, Submission, User } from "./types";
import { getEffectiveUserRole } from "./role-routing";

type CleanupUser = Pick<User, "id" | "role">;
type CleanupParticipation = Pick<Participation, "id" | "projectId">;
type CleanupProject = Pick<Project, "id" | "currentParticipants">;
type CleanupSubmission = Pick<Submission, "id" | "reviewedBy">;
type CleanupCertificate = Pick<Certificate, "id">;

export type UserCleanupOperation =
  | {
      type: "updateProjectParticipantCount";
      projectId: string;
      delta: -1;
      updatedAt: unknown;
    }
  | {
      type: "archiveProject";
      projectId: string;
      updatedAt: unknown;
    }
  | {
      type: "clearSubmissionReviewer";
      submissionId: string;
      updatedAt: unknown;
    }
  | {
      type: "deleteProject" | "deleteParticipation" | "deleteSubmission" | "deleteCertificate" | "deleteUser";
      id: string;
    };

export function buildUserAccountCleanupOperations(input: {
  user: CleanupUser;
  now: unknown;
  participations?: CleanupParticipation[];
  submissionsByParticipation?: Record<string, Array<Pick<Submission, "id">>>;
  certificates?: CleanupCertificate[];
  projects?: CleanupProject[];
  submissions?: CleanupSubmission[];
}): UserCleanupOperation[] {
  const operations: UserCleanupOperation[] = [];
  const effectiveRole = getEffectiveUserRole(input.user.role);

  if (input.user.role === "student") {
    for (const participation of input.participations ?? []) {
      operations.push({
        type: "updateProjectParticipantCount",
        projectId: participation.projectId,
        delta: -1,
        updatedAt: input.now,
      });
      operations.push({
        type: "deleteParticipation",
        id: participation.id,
      });

      for (const submission of input.submissionsByParticipation?.[participation.id] ?? []) {
        operations.push({
          type: "deleteSubmission",
          id: submission.id,
        });
      }
    }

    for (const certificate of input.certificates ?? []) {
      operations.push({
        type: "deleteCertificate",
        id: certificate.id,
      });
    }
  } else if (effectiveRole === "ngo") {
    for (const project of input.projects ?? []) {
      if (project.currentParticipants > 0) {
        operations.push({
          type: "archiveProject",
          projectId: project.id,
          updatedAt: input.now,
        });
      } else {
        operations.push({
          type: "deleteProject",
          id: project.id,
        });
      }
    }
  }

  if (input.user.role === "teacher") {
    for (const submission of input.submissions ?? []) {
      if (submission.reviewedBy !== input.user.id) {
        continue;
      }

      operations.push({
        type: "clearSubmissionReviewer",
        submissionId: submission.id,
        updatedAt: input.now,
      });
    }
  }

  operations.push({
    type: "deleteUser",
    id: input.user.id,
  });

  return operations;
}
