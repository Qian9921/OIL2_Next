import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvaluationProxyPayload,
  createEvaluationAccessToken,
  parseEvaluationProxyRequest,
  verifyEvaluationAccessToken,
} from "./evaluation-proxy-utils";
import { Participation, Project, Subtask } from "./types";
import { Timestamp } from "firebase/firestore";

function timestamp(ms: number) {
  return Timestamp.fromMillis(ms);
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    title: "Community Garden",
    description: "Build a digital hub for the garden.",
    ngoId: "ngo-1",
    ngoName: "Green NGO",
    status: "published",
    createdAt: timestamp(100),
    updatedAt: timestamp(100),
    currentParticipants: 1,
    difficulty: "beginner",
    deadline: timestamp(10_000),
    subtasks: [
      { id: "task-1", title: "Research", description: "Research local needs", order: 1 },
      { id: "task-2", title: "Prototype", description: "Build the first prototype", order: 2 },
    ],
    ...overrides,
  };
}

function createParticipation(overrides: Partial<Participation> = {}): Participation {
  return {
    id: "participation-1",
    projectId: "project-1",
    studentId: "student-1",
    createdAt: timestamp(100),
    updatedAt: timestamp(100),
    joinedAt: timestamp(100),
    status: "active",
    progress: 50,
    studentGitHubRepo: "https://github.com/student-1/project-1",
    ...overrides,
  };
}

function createSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: "task-2",
    title: "Prototype",
    description: "Build the first prototype",
    order: 2,
    ...overrides,
  };
}

test("parseEvaluationProxyRequest normalizes valid identifiers and polling options", () => {
  const parsed = parseEvaluationProxyRequest({
    projectId: "  project-1  ",
    participationId: " participation-1 ",
    subtaskId: " task-2 ",
    waitForResult: false,
    timeoutMs: 12_345,
    pollIntervalMs: 4_321,
  });

  assert.deepEqual(parsed, {
    projectId: "project-1",
    participationId: "participation-1",
    subtaskId: "task-2",
    waitForResult: false,
    timeoutMs: 12_345,
    pollIntervalMs: 4_321,
  });
});

test("parseEvaluationProxyRequest rejects requests without owned task identifiers", () => {
  assert.equal(parseEvaluationProxyRequest({ projectId: "project-1" }), null);
  assert.equal(parseEvaluationProxyRequest({ participationId: "participation-1" }), null);
  assert.equal(parseEvaluationProxyRequest({ subtaskId: "task-1" }), null);
});

test("buildEvaluationProxyPayload derives the upstream request from trusted project state", () => {
  const payload = buildEvaluationProxyPayload({
    project: createProject(),
    participation: createParticipation(),
    subtask: createSubtask(),
  });

  assert.deepEqual(payload, {
    projectDetail: "Community Garden",
    tasks: ["Research", "Prototype"],
    currentTask: "Prototype",
    githubRepoUrl: "https://github.com/student-1/project-1",
    evidence: "Build the first prototype",
    youtubeLink: null,
  });
});

test("evaluation access token round-trips and verifies integrity", () => {
  const secret = "test-secret";
  const token = createEvaluationAccessToken(
    {
      evaluationId: "eval-1",
      userId: "student-1",
      participationId: "participation-1",
      subtaskId: "task-2",
    },
    secret,
  );

  assert.deepEqual(verifyEvaluationAccessToken(token, secret), {
    evaluationId: "eval-1",
    userId: "student-1",
    participationId: "participation-1",
    subtaskId: "task-2",
  });
});

test("evaluation access token verification fails for tampered tokens", () => {
  const secret = "test-secret";
  const token = createEvaluationAccessToken(
    {
      evaluationId: "eval-1",
      userId: "student-1",
      participationId: "participation-1",
      subtaskId: "task-2",
    },
    secret,
  );

  const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

  assert.equal(verifyEvaluationAccessToken(tamperedToken, secret), null);
  assert.equal(verifyEvaluationAccessToken(token, "wrong-secret"), null);
});
