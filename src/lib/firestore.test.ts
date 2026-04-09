import assert from "node:assert/strict";
import test from "node:test";

import { buildParticipationWriteData } from "./participation-payload";

const baseParticipation = {
  projectId: "project-1",
  studentId: "student-1",
  studentName: "Student One",
  status: "active" as const,
  completedSubtasks: [],
  progress: 0,
};

test("buildParticipationWriteData omits classId when it is undefined", () => {
  const now = { marker: "now" };
  const payload = buildParticipationWriteData(baseParticipation, { now });

  assert.equal("classId" in payload, false);
  assert.equal(payload.joinedAt, now);
  assert.deepEqual(payload.chatHistory, []);
  assert.deepEqual(payload.submissions, []);
});

test("buildParticipationWriteData preserves classId when it exists", () => {
  const now = { marker: "now" };
  const payload = buildParticipationWriteData(baseParticipation, {
    classId: "class-1",
    now,
  });

  assert.equal("classId" in payload, true);
  if (!("classId" in payload)) {
    throw new Error("classId should exist on payload");
  }

  assert.equal(payload.classId, "class-1");
  assert.equal(payload.createdAt, now);
});
