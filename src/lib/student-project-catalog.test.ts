import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import { buildStudentProjectCatalogData } from "./student-project-catalog";
import { Participation, Project } from "./types";

function createProject(overrides: Partial<Project>): Project {
  const now = Timestamp.now();

  return {
    id: "project-1",
    title: "Default Project",
    description: "Description",
    ngoId: "ngo-1",
    ngoName: "NGO",
    status: "published",
    createdAt: now,
    updatedAt: now,
    currentParticipants: 0,
    difficulty: "beginner",
    deadline: now,
    subtasks: [],
    ...overrides,
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

test("buildStudentProjectCatalogData merges project sources, deduplicates by id, and keeps participation state", () => {
  const publishedProject = createProject({
    id: "shared-project",
    title: "Published Version",
    status: "published",
  });
  const completedProject = createProject({
    id: "shared-project",
    title: "Completed Version",
    status: "completed",
  });
  const archivedProject = createProject({
    id: "project-2",
    title: "Another Project",
    status: "completed",
  });

  const participation = createParticipation({
    id: "participation-2",
    projectId: "shared-project",
    progress: 60,
  });

  const result = buildStudentProjectCatalogData({
    publishedProjects: [publishedProject],
    completedProjects: [completedProject, archivedProject],
    participations: [participation],
  });

  assert.equal(result.projects.length, 2);
  assert.deepEqual(
    result.projects.map((project) => project.id),
    ["shared-project", "project-2"],
  );
  assert.equal(result.projects[0].title, "Published Version");
  assert.deepEqual(result.userParticipationProjectIds, ["shared-project"]);
  assert.deepEqual(result.participations, [participation]);
});
