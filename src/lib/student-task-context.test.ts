import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import { buildStudentTaskContext } from "./student-task-context";
import { Participation, Project } from "./types";

function createProject(): Project {
  const now = Timestamp.now();

  return {
    id: "project-1",
    title: "Project",
    description: "Description",
    ngoId: "ngo-1",
    ngoName: "NGO",
    status: "published",
    createdAt: now,
    updatedAt: now,
    currentParticipants: 1,
    difficulty: "beginner",
    deadline: now,
    subtasks: [
      { id: "task-1", title: "Task 1", description: "One", order: 1 },
      { id: "task-2", title: "Task 2", description: "Two", order: 2 },
    ],
  };
}

function createParticipation(overrides: Partial<Participation>): Participation {
  const now = Timestamp.now();

  return {
    id: "participation-1",
    projectId: "project-1",
    studentId: "student-1",
    createdAt: now,
    updatedAt: now,
    joinedAt: now,
    status: "active",
    progress: 0,
    completedSubtasks: [],
    ...overrides,
  };
}

test("buildStudentTaskContext resolves subtask state and sequential availability", () => {
  const context = buildStudentTaskContext({
    project: createProject(),
    participation: createParticipation({
      completedSubtasks: ["task-1"],
      chatHistory: {
        "task-2": [
          {
            role: "user",
            content: "hello",
          },
        ],
      },
    }),
    subtaskId: "task-2",
  });

  assert.equal(context.subtask.id, "task-2");
  assert.equal(context.isCurrentSequentially, true);
  assert.equal(context.isSubtaskCompletedByStudent, false);
  assert.equal(context.chatMessages?.length, 1);
});

test("buildStudentTaskContext marks future tasks locked when previous subtasks are incomplete", () => {
  const context = buildStudentTaskContext({
    project: createProject(),
    participation: createParticipation({
      completedSubtasks: [],
    }),
    subtaskId: "task-2",
  });

  assert.equal(context.isCurrentSequentially, false);
});
