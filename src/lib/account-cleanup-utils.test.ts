import assert from "node:assert/strict";
import test from "node:test";

import { buildUserAccountCleanupOperations } from "./account-cleanup-utils";

test("buildUserAccountCleanupOperations removes student participations, submissions, certificates, and decrements project counts", () => {
  const now = { marker: "cleanup-now" };

  const operations = buildUserAccountCleanupOperations({
    user: {
      id: "student-1",
      role: "student",
    },
    now,
    participations: [
      { id: "participation-1", projectId: "project-1" },
      { id: "participation-2", projectId: "project-2" },
    ],
    submissionsByParticipation: {
      "participation-1": [{ id: "submission-1" }],
      "participation-2": [{ id: "submission-2" }, { id: "submission-3" }],
    },
    certificates: [{ id: "certificate-1" }],
  });

  assert.deepEqual(operations, [
    {
      type: "updateProjectParticipantCount",
      projectId: "project-1",
      delta: -1,
      updatedAt: now,
    },
    { type: "deleteParticipation", id: "participation-1" },
    { type: "deleteSubmission", id: "submission-1" },
    {
      type: "updateProjectParticipantCount",
      projectId: "project-2",
      delta: -1,
      updatedAt: now,
    },
    { type: "deleteParticipation", id: "participation-2" },
    { type: "deleteSubmission", id: "submission-2" },
    { type: "deleteSubmission", id: "submission-3" },
    { type: "deleteCertificate", id: "certificate-1" },
    { type: "deleteUser", id: "student-1" },
  ]);
});

test("buildUserAccountCleanupOperations archives active legacy teacher projects, deletes empty ones, and clears reviewed submissions", () => {
  const now = { marker: "cleanup-now" };

  const operations = buildUserAccountCleanupOperations({
    user: {
      id: "teacher-1",
      role: "teacher",
    },
    now,
    projects: [
      { id: "project-active", currentParticipants: 2 },
      { id: "project-empty", currentParticipants: 0 },
    ],
    submissions: [
      { id: "submission-1", reviewedBy: "teacher-1" },
      { id: "submission-2", reviewedBy: "teacher-2" },
      { id: "submission-3", reviewedBy: "teacher-1" },
    ],
  });

  assert.deepEqual(operations, [
    {
      type: "archiveProject",
      projectId: "project-active",
      updatedAt: now,
    },
    { type: "deleteProject", id: "project-empty" },
    {
      type: "clearSubmissionReviewer",
      submissionId: "submission-1",
      updatedAt: now,
    },
    {
      type: "clearSubmissionReviewer",
      submissionId: "submission-3",
      updatedAt: now,
    },
    { type: "deleteUser", id: "teacher-1" },
  ]);
});
