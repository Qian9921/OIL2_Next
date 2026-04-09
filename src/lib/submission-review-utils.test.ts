import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  buildCompletedProjectRecord,
  buildSubmissionUpdateData,
  selectLatestApprovedSubmission,
} from "./submission-review-utils";

function timestamp(ms: number) {
  return Timestamp.fromMillis(ms);
}

test("buildSubmissionUpdateData strips undefined values but preserves explicit nulls", () => {
  const now = { marker: "reviewed-now" };

  const updateData = buildSubmissionUpdateData(
    {
      status: "approved",
      reviewComment: undefined,
      reviewedBy: null,
      rating: 5,
    },
    now
  );

  assert.deepEqual(updateData, {
    status: "approved",
    reviewedBy: null,
    rating: 5,
    reviewedAt: now,
  });
});

test("selectLatestApprovedSubmission ignores non-approved submissions and picks the newest approved item", () => {
  const latestApprovedSubmission = selectLatestApprovedSubmission([
    {
      status: "pending" as const,
      submittedAt: timestamp(3000),
    },
    {
      status: "approved" as const,
      submittedAt: timestamp(1000),
    },
    {
      status: "approved" as const,
      submittedAt: timestamp(2000),
    },
  ]);

  assert.equal(latestApprovedSubmission?.submittedAt.toMillis(), 2000);
});

test("buildCompletedProjectRecord returns the newest approved submission and existing certificate metadata", () => {
  const record = buildCompletedProjectRecord({
    participation: {
      id: "participation-1",
      projectId: "project-1",
      studentId: "student-1",
      createdAt: timestamp(100),
      updatedAt: timestamp(100),
      joinedAt: timestamp(100),
      status: "completed",
      progress: 100,
    },
    project: {
      id: "project-1",
      title: "Community Garden",
      description: "desc",
      ngoId: "ngo-1",
      ngoName: "NGO",
      status: "completed",
      createdAt: timestamp(100),
      updatedAt: timestamp(100),
      currentParticipants: 1,
      difficulty: "beginner",
      deadline: timestamp(100),
      subtasks: [],
    },
    student: {
      id: "student-1",
      email: "student@example.com",
      name: "Student",
      role: "student",
      createdAt: timestamp(100),
      updatedAt: timestamp(100),
    },
    submissions: [
      {
        id: "submission-old",
        participationId: "participation-1",
        projectId: "project-1",
        studentId: "student-1",
        content: "old",
        status: "approved",
        submittedAt: timestamp(1000),
      },
      {
        id: "submission-new",
        participationId: "participation-1",
        projectId: "project-1",
        studentId: "student-1",
        content: "new",
        status: "approved",
        submittedAt: timestamp(2000),
      },
    ],
    certificates: [
      {
        id: "certificate-1",
        studentId: "student-1",
        studentName: "Student",
        projectId: "project-1",
        projectTitle: "Community Garden",
        ngoId: "ngo-1",
        ngoName: "NGO",
        ngoSignature: "signature",
        participationId: "participation-1",
        issuedAt: timestamp(3000),
        certificateNumber: "CERT-1",
        completionDate: timestamp(2000),
      },
    ],
  });

  assert.equal(record?.submission.id, "submission-new");
  assert.equal(record?.hasCertificate, true);
  assert.equal(record?.certificate?.id, "certificate-1");
});

test("buildCompletedProjectRecord returns null when no approved submission or student exists", () => {
  const noStudentRecord = buildCompletedProjectRecord({
    participation: {
      id: "participation-1",
      projectId: "project-1",
      studentId: "student-1",
      createdAt: timestamp(100),
      updatedAt: timestamp(100),
      joinedAt: timestamp(100),
      status: "completed",
      progress: 100,
    },
    project: {
      id: "project-1",
      title: "Community Garden",
      description: "desc",
      ngoId: "ngo-1",
      ngoName: "NGO",
      status: "completed",
      createdAt: timestamp(100),
      updatedAt: timestamp(100),
      currentParticipants: 1,
      difficulty: "beginner",
      deadline: timestamp(100),
      subtasks: [],
    },
    student: null,
    submissions: [],
    certificates: [],
  });

  assert.equal(noStudentRecord, null);
});
