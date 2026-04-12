import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import type { ChatMessage, Project, User } from "./types";
import {
  buildClearedChatHistory,
  buildCompletedSubtaskUpdate,
  buildStudentProfileUpdate,
  getProjectJoinBlockReason,
  mergeParticipationHistoryEntry,
} from "./student-write-utils";

function createProject(overrides: Partial<Project> = {}): Project {
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
    deadline: Timestamp.fromDate(new Date("2026-12-31T00:00:00.000Z")),
    subtasks: [
      { id: "task-1", title: "Task 1", description: "First", order: 1 },
      { id: "task-2", title: "Task 2", description: "Second", order: 2 },
    ],
    ...overrides,
  };
}

function createUser(overrides: Partial<User> = {}): User {
  const now = Timestamp.now();

  return {
    id: "student-1",
    email: "student@example.com",
    name: "Student",
    role: "student",
    createdAt: now,
    updatedAt: now,
    profile: {
      website: "https://example.com",
      location: "Taipei",
      bio: "Old bio",
      school: "Old school",
      grade: "10",
      interests: ["Robotics"],
    },
    ...overrides,
  };
}

test("getProjectJoinBlockReason returns null when a student can join", () => {
  const result = getProjectJoinBlockReason({
    project: createProject(),
    existingParticipationId: null,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(result, null);
});

test("getProjectJoinBlockReason blocks duplicate, full, unpublished, and expired joins", () => {
  assert.equal(
    getProjectJoinBlockReason({
      project: createProject(),
      existingParticipationId: "participation-1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    }),
    "already_joined",
  );

  assert.equal(
    getProjectJoinBlockReason({
      project: createProject({ maxParticipants: 1, currentParticipants: 1 }),
      existingParticipationId: null,
      now: new Date("2026-01-01T00:00:00.000Z"),
    }),
    "project_full",
  );

  assert.equal(
    getProjectJoinBlockReason({
      project: createProject({ status: "draft" }),
      existingParticipationId: null,
      now: new Date("2026-01-01T00:00:00.000Z"),
    }),
    "not_joinable",
  );

  assert.equal(
    getProjectJoinBlockReason({
      project: createProject({
        deadline: Timestamp.fromDate(new Date("2025-01-01T00:00:00.000Z")),
      }),
      existingParticipationId: null,
      now: new Date("2026-01-01T00:00:00.000Z"),
    }),
    "expired",
  );
});

test("buildStudentProfileUpdate merges editable fields without dropping other profile data", () => {
  const user = createUser();

  const update = buildStudentProfileUpdate(user, {
    name: "Updated Student",
    bio: "New bio",
    school: "New school",
    grade: "11",
    interests: ["AI", "Design"],
  });

  assert.equal(update.name, "Updated Student");
  assert.equal(update.profile?.bio, "New bio");
  assert.equal(update.profile?.school, "New school");
  assert.equal(update.profile?.grade, "11");
  assert.deepEqual(update.profile?.interests, ["AI", "Design"]);
  assert.equal(update.profile?.website, "https://example.com");
  assert.equal(update.profile?.location, "Taipei");
});

test("mergeParticipationHistoryEntry appends a subtask-scoped entry and preserves other keys", () => {
  const timestamp = Timestamp.now();
  const currentHistory = {
    "task-1": [{ content: "existing", timestamp }],
  };

  const result = mergeParticipationHistoryEntry(currentHistory, "task-2", {
    content: "new",
    timestamp,
  });

  assert.equal(result.newHistory.length, 1);
  assert.equal(result.newHistory[0]?.content, "new");
  assert.equal(result.historyUpdate["task-1"]?.length, 1);
  assert.equal(result.historyUpdate["task-2"]?.length, 1);
});

test("buildCompletedSubtaskUpdate deduplicates the current subtask and derives progress", () => {
  const result = buildCompletedSubtaskUpdate({
    completedSubtasks: ["task-1"],
    subtaskId: "task-2",
    totalSubtasks: 2,
  });

  assert.deepEqual(result.completedSubtasks, ["task-1", "task-2"]);
  assert.equal(result.progress, 100);

  const duplicateResult = buildCompletedSubtaskUpdate({
    completedSubtasks: ["task-1", "task-2"],
    subtaskId: "task-2",
    totalSubtasks: 2,
  });

  assert.deepEqual(duplicateResult.completedSubtasks, ["task-1", "task-2"]);
  assert.equal(duplicateResult.progress, 100);
});

test("buildClearedChatHistory removes only the selected subtask history", () => {
  const chatMessage: ChatMessage = {
    role: "user",
    content: "hello",
  };

  const result = buildClearedChatHistory(
    {
      "task-1": [chatMessage],
      "task-2": [chatMessage],
    },
    "task-1",
  );

  assert.equal(result["task-1"], undefined);
  assert.deepEqual(result["task-2"], [chatMessage]);
});
