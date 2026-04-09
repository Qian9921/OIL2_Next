import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  buildNGODashboardData,
  buildTeacherDashboardData,
  sortSubmissionsNewestFirst,
} from "./ngo-review-utils";

function timestamp(ms: number) {
  return Timestamp.fromMillis(ms);
}

test("buildNGODashboardData aggregates project stats and ignores unrelated submissions", () => {
  const dashboard = buildNGODashboardData({
    projects: [
      { id: "project-1", title: "Water Quality", status: "published", currentParticipants: 3 },
      { id: "project-2", title: "Food Rescue", status: "completed", currentParticipants: 2 },
    ],
    participations: [
      { projectId: "project-1", studentId: "student-1", status: "active", progress: 50 },
      { projectId: "project-1", studentId: "student-2", status: "completed", progress: 100 },
      { projectId: "project-2", studentId: "student-2", status: "completed", progress: 100 },
      { projectId: "project-2", studentId: "student-3", status: "active", progress: 20 },
      { projectId: "project-x", studentId: "student-x", status: "completed", progress: 100 },
    ],
    submissions: [
      { projectId: "project-1", status: "pending" },
      { projectId: "project-1", status: "approved" },
      { projectId: "project-x", status: "pending" },
    ],
  });

  assert.equal(dashboard.publishedProjects, 1);
  assert.equal(dashboard.completedProjects, 1);
  assert.equal(dashboard.totalParticipants, 5);
  assert.equal(dashboard.pendingReviews, 1);
  assert.deepEqual(dashboard.projectStats, [
    {
      projectId: "project-1",
      projectTitle: "Water Quality",
      participants: 3,
      completionRate: 50,
      averageProgress: 75,
    },
    {
      projectId: "project-2",
      projectTitle: "Food Rescue",
      participants: 2,
      completionRate: 50,
      averageProgress: 60,
    },
  ]);
});

test("buildNGODashboardData returns zeroed stats for projects without participations", () => {
  const dashboard = buildNGODashboardData({
    projects: [
      { id: "project-1", title: "No Activity", status: "draft", currentParticipants: 0 },
    ],
    participations: [],
    submissions: [],
  });

  assert.deepEqual(dashboard.projectStats, [
    {
      projectId: "project-1",
      projectTitle: "No Activity",
      participants: 0,
      completionRate: 0,
      averageProgress: 0,
    },
  ]);
  assert.equal(dashboard.pendingReviews, 0);
});

test("buildTeacherDashboardData deduplicates students and limits recent submissions", () => {
  const submissions = sortSubmissionsNewestFirst(
    Array.from({ length: 12 }, (_, index) => ({
      id: `submission-${index}`,
      participationId: `participation-${index}`,
      projectId: index % 2 === 0 ? "project-1" : "project-2",
      studentId: `student-${index % 3}`,
      content: `content-${index}`,
      status: index % 3 === 0 ? ("pending" as const) : ("approved" as const),
      submittedAt: timestamp(1000 + index),
    }))
  );

  const dashboard = buildTeacherDashboardData({
    projects: [{ id: "project-1" }, { id: "project-2" }],
    participations: [
      { projectId: "project-1", studentId: "student-1" },
      { projectId: "project-2", studentId: "student-1" },
      { projectId: "project-2", studentId: "student-2" },
    ],
    submissions,
  });

  assert.equal(dashboard.studentsSupervised, 2);
  assert.equal(dashboard.projectsSupervised, 2);
  assert.equal(dashboard.pendingReviews, 4);
  assert.equal(dashboard.recentSubmissions.length, 10);
  assert.deepEqual(
    dashboard.recentSubmissions.map((submission) => submission.id),
    [
      "submission-11",
      "submission-10",
      "submission-9",
      "submission-8",
      "submission-7",
      "submission-6",
      "submission-5",
      "submission-4",
      "submission-3",
      "submission-2",
    ]
  );
});
