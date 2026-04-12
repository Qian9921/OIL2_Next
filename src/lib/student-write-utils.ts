import type { ChatMessage, Project, User } from "./types";

type StudentProfileInput = {
  name: string;
  bio: string;
  school: string;
  grade: string;
  interests: string[];
};

type JoinBlockReason =
  | "already_joined"
  | "project_full"
  | "not_joinable"
  | "expired";

export function getProjectJoinBlockReason(input: {
  project: Project;
  existingParticipationId: string | null;
  now?: Date;
}): JoinBlockReason | null {
  if (input.existingParticipationId) {
    return "already_joined";
  }

  if (input.project.status !== "published") {
    return "not_joinable";
  }

  if (
    typeof input.project.maxParticipants === "number" &&
    input.project.currentParticipants >= input.project.maxParticipants
  ) {
    return "project_full";
  }

  const now = input.now ?? new Date();
  if (input.project.deadline.toDate() < now) {
    return "expired";
  }

  return null;
}

export function buildStudentProfileUpdate(user: User, input: StudentProfileInput) {
  return {
    name: input.name,
    profile: {
      ...(user.profile ?? {}),
      bio: input.bio,
      school: input.school,
      grade: input.grade,
      interests: input.interests,
    },
  } satisfies Partial<User>;
}

export function buildNgoProfileUpdate(
  user: User,
  input: {
    name: string;
    bio: string;
    website: string;
    location: string;
    focusAreas: string[];
    signature: string;
  },
) {
  return {
    name: input.name,
    profile: {
      ...(user.profile ?? {}),
      bio: input.bio,
      website: input.website,
      location: input.location,
      focusAreas: input.focusAreas,
      signature: input.signature,
    },
  } satisfies Partial<User>;
}

export function mergeParticipationHistoryEntry<T>(
  currentHistory: Record<string, T[]> | undefined,
  subtaskId: string,
  entry: T,
) {
  const newHistory = [...(currentHistory?.[subtaskId] ?? []), entry];

  return {
    newHistory,
    historyUpdate: {
      ...(currentHistory ?? {}),
      [subtaskId]: newHistory,
    } as Record<string, T[]>,
  };
}

export function buildCompletedSubtaskUpdate(input: {
  completedSubtasks?: string[];
  subtaskId: string;
  totalSubtasks: number;
}) {
  const completedSubtasks = input.completedSubtasks?.includes(input.subtaskId)
    ? [...(input.completedSubtasks ?? [])]
    : [...(input.completedSubtasks ?? []), input.subtaskId];

  return {
    completedSubtasks,
    progress: Math.round((completedSubtasks.length / input.totalSubtasks) * 100),
  };
}

export function buildClearedChatHistory(
  chatHistory: Record<string, ChatMessage[]> | undefined,
  subtaskId: string,
) {
  const nextHistory = { ...(chatHistory ?? {}) };
  delete nextHistory[subtaskId];
  return nextHistory;
}
