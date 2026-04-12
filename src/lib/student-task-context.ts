import { ChatMessage, Participation, Project, Subtask } from "@/lib/types";

export function buildStudentTaskContext(input: {
  project: Project;
  participation: Participation;
  subtaskId: string;
}): {
  subtask: Subtask;
  isCurrentSequentially: boolean;
  isSubtaskCompletedByStudent: boolean;
  chatMessages?: ChatMessage[];
} {
  const subtask = input.project.subtasks.find((item) => item.id === input.subtaskId);

  if (!subtask) {
    throw new Error("Subtask not found");
  }

  const sortedSubtasks = [...input.project.subtasks].sort((left, right) => left.order - right.order);
  const currentTaskIndex = sortedSubtasks.findIndex((item) => item.id === input.subtaskId);
  const completedSubtasks = input.participation.completedSubtasks || [];

  const isCurrentSequentially =
    currentTaskIndex === 0 ||
    sortedSubtasks
      .slice(0, currentTaskIndex)
      .every((item) => completedSubtasks.includes(item.id));

  return {
    subtask,
    isCurrentSequentially,
    isSubtaskCompletedByStudent: completedSubtasks.includes(input.subtaskId),
    chatMessages: input.participation.chatHistory?.[input.subtaskId],
  };
}
