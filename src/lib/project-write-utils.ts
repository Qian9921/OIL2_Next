import type { Project } from "./types";

type TimestampLike = {
  toDate(): Date;
};

function hasDeadline(deadline: TimestampLike | Date | null | undefined) {
  return Boolean(deadline);
}

const NGO_PROJECT_MUTABLE_FIELDS = [
  "title",
  "description",
  "shortDescription",
  "status",
  "difficulty",
  "maxParticipants",
  "deadline",
  "tags",
  "requirements",
  "learningGoals",
  "subtasks",
  "image",
] as const;

export function pickNgoProjectMutableFields(
  input: Record<string, unknown>,
) {
  const output: Record<string, unknown> = {};

  for (const key of NGO_PROJECT_MUTABLE_FIELDS) {
    if (key in input) {
      output[key] = input[key];
    }
  }

  return output as Partial<
    Omit<Project, "id" | "createdAt" | "updatedAt" | "currentParticipants" | "ngoId" | "ngoName">
  >;
}

export function assertProjectStatusTransition(input: {
  oldStatus: Project["status"];
  newStatus: Project["status"];
  deadline?: TimestampLike | Date | null;
  subtaskCount: number;
}) {
  const { oldStatus, newStatus, deadline, subtaskCount } = input;

  if (newStatus === oldStatus) {
    return;
  }

  if (oldStatus === "published" && newStatus === "draft") {
    throw new Error("Published projects cannot be moved back to draft status");
  }

  if (newStatus === "completed") {
    throw new Error(
      "Projects are automatically marked as completed when their deadline is reached. Manual completion is not allowed.",
    );
  }

  if (newStatus === "archived" && oldStatus !== "completed") {
    throw new Error("Only completed projects can be archived");
  }

  if (oldStatus === "archived") {
    throw new Error("Archived projects cannot be changed to any other status");
  }

  if (oldStatus === "draft" && newStatus === "published") {
    if (!hasDeadline(deadline)) {
      throw new Error("Project must have a deadline before it can be published");
    }

    if (subtaskCount === 0) {
      throw new Error("Project must have at least one subtask before it can be published");
    }
  }
}
