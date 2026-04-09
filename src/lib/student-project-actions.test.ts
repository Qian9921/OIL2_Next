import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  buildStudentProjectActionState,
  groupStudentProjectActionItems,
} from "./student-project-actions";
import { Certificate, Participation, Project, Submission, Subtask } from "./types";

function timestamp(ms: number) {
  return Timestamp.fromMillis(ms);
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    title: "Community Garden",
    description: "Build a neighborhood garden.",
    ngoId: "ngo-1",
    ngoName: "Green NGO",
    status: "published",
    createdAt: timestamp(100),
    updatedAt: timestamp(100),
    currentParticipants: 12,
    difficulty: "beginner",
    deadline: timestamp(10_000),
    subtasks: [
      { id: "task-1", title: "Research", description: "Research need", order: 1 },
      { id: "task-2", title: "Plan", description: "Plan work", order: 2 },
    ],
    ...overrides,
  };
}

function createParticipation(overrides: Partial<Participation> = {}): Participation {
  return {
    id: "participation-1",
    projectId: "project-1",
    studentId: "student-1",
    studentName: "Student One",
    createdAt: timestamp(100),
    updatedAt: timestamp(100),
    joinedAt: timestamp(100),
    status: "active",
    progress: 50,
    completedSubtasks: ["task-1"],
    ...overrides,
  };
}

function createSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "submission-1",
    participationId: "participation-1",
    projectId: "project-1",
    studentId: "student-1",
    studentName: "Student One",
    content: "submission summary",
    status: "pending",
    submittedAt: timestamp(200),
    ...overrides,
  };
}

function createCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: "certificate-1",
    studentId: "student-1",
    studentName: "Student One",
    projectId: "project-1",
    projectTitle: "Community Garden",
    ngoId: "ngo-1",
    ngoName: "Green NGO",
    ngoSignature: "signature",
    participationId: "participation-1",
    issuedAt: timestamp(300),
    certificateNumber: "CERT-1",
    completionDate: timestamp(250),
    ...overrides,
  };
}

function createNextSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: "task-2",
    title: "Plan",
    description: "Plan work",
    order: 2,
    ...overrides,
  };
}

test("buildStudentProjectActionState derives continue_next_task for active work", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation(),
    project: createProject(),
    nextSubtask: createNextSubtask(),
    isExpired: false,
    totalTaskCount: 2,
    completedTaskCount: 1,
  });

  assert.equal(action.state, "continue_next_task");
  assert.equal(action.section, "continue_learning");
  assert.equal(action.primaryActionLabel, "Continue Next Task");
  assert.equal(action.primaryActionKind, "continue");
  assert.equal(action.primaryActionTarget, "/projects/project-1/task/task-2");
  assert.match(action.supportingText, /Next up: Plan/);
});

test("buildStudentProjectActionState derives ready_to_submit when all tasks are complete without a submission", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation({
      progress: 100,
      completedSubtasks: ["task-1", "task-2"],
    }),
    project: createProject(),
    nextSubtask: undefined,
    isExpired: false,
    totalTaskCount: 2,
    completedTaskCount: 2,
  });

  assert.equal(action.state, "ready_to_submit");
  assert.equal(action.section, "needs_attention");
  assert.equal(action.primaryActionLabel, "Submit for Review");
  assert.equal(action.primaryActionKind, "submit");
});

test("buildStudentProjectActionState derives needs_revision from NGO feedback", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation({
      status: "completed",
      progress: 100,
      completedSubtasks: ["task-1", "task-2"],
    }),
    project: createProject(),
    submission: createSubmission({
      status: "needs_revision",
      reviewComment: "Please explain the final impact more clearly.",
    }),
    nextSubtask: undefined,
    isExpired: false,
    totalTaskCount: 2,
    completedTaskCount: 2,
  });

  assert.equal(action.state, "needs_revision");
  assert.equal(action.section, "needs_attention");
  assert.equal(action.primaryActionLabel, "Revise and Resubmit");
  assert.equal(action.primaryActionKind, "resubmit");
  assert.equal(action.showFeedbackSnippet, true);
});

test("buildStudentProjectActionState derives rejected_exit when a submission is rejected", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation({ status: "completed", progress: 100 }),
    project: createProject(),
    submission: createSubmission({
      status: "rejected",
      reviewComment: "The project scope is not complete enough for approval.",
    }),
    nextSubtask: undefined,
    isExpired: false,
    totalTaskCount: 2,
    completedTaskCount: 2,
  });

  assert.equal(action.state, "rejected_exit");
  assert.equal(action.section, "needs_attention");
  assert.equal(action.primaryActionLabel, "Accept and Leave");
  assert.equal(action.primaryActionKind, "accept_exit");
  assert.equal(action.showFeedbackSnippet, true);
});

test("buildStudentProjectActionState derives under_review for pending submissions", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation({ status: "completed", progress: 100 }),
    project: createProject(),
    submission: createSubmission({ status: "pending" }),
    nextSubtask: undefined,
    isExpired: false,
    totalTaskCount: 2,
    completedTaskCount: 2,
  });

  assert.equal(action.state, "under_review");
  assert.equal(action.section, "waiting_review");
  assert.equal(action.primaryActionLabel, "Browse More Projects");
  assert.equal(action.primaryActionKind, "browse_more");
});

test("buildStudentProjectActionState derives completed_with_certificate when approval and certificate both exist", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation({ status: "completed", progress: 100 }),
    project: createProject({ status: "completed" }),
    submission: createSubmission({ status: "approved" }),
    certificate: createCertificate(),
    nextSubtask: undefined,
    isExpired: false,
    totalTaskCount: 2,
    completedTaskCount: 2,
  });

  assert.equal(action.state, "completed_with_certificate");
  assert.equal(action.section, "completed");
  assert.equal(action.primaryActionLabel, "View Certificate");
  assert.equal(action.primaryActionKind, "view_certificate");
});

test("buildStudentProjectActionState derives completed_awaiting_certificate after approval without certificate", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation({ status: "completed", progress: 100 }),
    project: createProject({ status: "completed" }),
    submission: createSubmission({ status: "approved" }),
    nextSubtask: undefined,
    isExpired: false,
    totalTaskCount: 2,
    completedTaskCount: 2,
  });

  assert.equal(action.state, "completed_awaiting_certificate");
  assert.equal(action.section, "completed");
  assert.equal(action.primaryActionLabel, "Browse More Projects");
  assert.equal(action.primaryActionKind, "browse_more");
});

test("buildStudentProjectActionState derives expired_incomplete after the deadline passes without approval", () => {
  const action = buildStudentProjectActionState({
    participation: createParticipation({
      progress: 100,
      completedSubtasks: ["task-1", "task-2"],
    }),
    project: createProject(),
    nextSubtask: undefined,
    isExpired: true,
    totalTaskCount: 2,
    completedTaskCount: 2,
  });

  assert.equal(action.state, "expired_incomplete");
  assert.equal(action.section, "continue_learning");
  assert.equal(action.primaryActionLabel, "Browse More Projects");
  assert.equal(action.primaryActionKind, "browse_more");
});

test("groupStudentProjectActionItems keeps section order and prioritizes focused items within a section", () => {
  const sections = groupStudentProjectActionItems([
    {
      id: "project-under-review",
      isFocused: false,
      joinedAt: timestamp(100),
      actionState: {
        ...buildStudentProjectActionState({
          participation: createParticipation({ status: "completed", progress: 100, projectId: "project-under-review" }),
          project: createProject({ id: "project-under-review" }),
          submission: createSubmission({ projectId: "project-under-review", participationId: "project-under-review", status: "pending" }),
          isExpired: false,
          totalTaskCount: 2,
          completedTaskCount: 2,
        }),
      },
    },
    {
      id: "project-continue",
      isFocused: true,
      joinedAt: timestamp(90),
      actionState: {
        ...buildStudentProjectActionState({
          participation: createParticipation({ projectId: "project-continue" }),
          project: createProject({ id: "project-continue" }),
          nextSubtask: createNextSubtask(),
          isExpired: false,
          totalTaskCount: 2,
          completedTaskCount: 1,
        }),
      },
    },
    {
      id: "project-submit",
      isFocused: false,
      joinedAt: timestamp(95),
      actionState: {
        ...buildStudentProjectActionState({
          participation: createParticipation({
            projectId: "project-submit",
            progress: 100,
            completedSubtasks: ["task-1", "task-2"],
          }),
          project: createProject({ id: "project-submit" }),
          isExpired: false,
          totalTaskCount: 2,
          completedTaskCount: 2,
        }),
      },
    },
  ]);

  assert.deepEqual(sections.map((section) => section.key), [
    "needs_attention",
    "continue_learning",
    "waiting_review",
    "completed",
  ]);
  assert.deepEqual(sections[0].items.map((item) => item.id), ["project-submit"]);
  assert.deepEqual(sections[1].items.map((item) => item.id), ["project-continue"]);
  assert.deepEqual(sections[2].items.map((item) => item.id), ["project-under-review"]);
});
