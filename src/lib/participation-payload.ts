type ParticipationCreateInput = {
  projectId: string;
  studentId: string;
  studentName?: string;
  status: "active" | "completed" | "dropped";
  progress: number;
  completedSubtasks?: string[];
  currentSubtaskId?: string;
  studentGitHubRepo?: string;
};

type BuildParticipationWriteDataOptions = {
  classId?: string;
  now: unknown;
};

export function buildParticipationWriteData(
  participationData: ParticipationCreateInput,
  options: BuildParticipationWriteDataOptions,
) {
  const payload = {
    ...participationData,
    joinedAt: options.now,
    chatHistory: [],
    submissions: [],
    createdAt: options.now,
    updatedAt: options.now,
  };

  if (!options.classId) {
    return payload;
  }

  return {
    ...payload,
    classId: options.classId,
  };
}
