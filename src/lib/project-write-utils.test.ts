import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  assertProjectStatusTransition,
  pickNgoProjectMutableFields,
} from "./project-write-utils";

test("assertProjectStatusTransition allows a valid draft to published transition", () => {
  assert.doesNotThrow(() =>
    assertProjectStatusTransition({
      oldStatus: "draft",
      newStatus: "published",
      deadline: Timestamp.fromDate(new Date("2026-12-31T00:00:00.000Z")),
      subtaskCount: 2,
    }),
  );
});

test("assertProjectStatusTransition blocks invalid lifecycle transitions", () => {
  assert.throws(
    () =>
      assertProjectStatusTransition({
        oldStatus: "published",
        newStatus: "draft",
        deadline: Timestamp.now(),
        subtaskCount: 1,
      }),
    /Published projects cannot be moved back to draft status/,
  );

  assert.throws(
    () =>
      assertProjectStatusTransition({
        oldStatus: "published",
        newStatus: "completed",
        deadline: Timestamp.now(),
        subtaskCount: 1,
      }),
    /Manual completion is not allowed/,
  );

  assert.throws(
    () =>
      assertProjectStatusTransition({
        oldStatus: "published",
        newStatus: "archived",
        deadline: Timestamp.now(),
        subtaskCount: 1,
      }),
    /Only completed projects can be archived/,
  );

  assert.throws(
    () =>
      assertProjectStatusTransition({
        oldStatus: "archived",
        newStatus: "published",
        deadline: Timestamp.now(),
        subtaskCount: 1,
      }),
    /Archived projects cannot be changed to any other status/,
  );
});

test("assertProjectStatusTransition requires deadline and subtasks before publishing", () => {
  assert.throws(
    () =>
      assertProjectStatusTransition({
        oldStatus: "draft",
        newStatus: "published",
        deadline: null,
        subtaskCount: 1,
      }),
    /must have a deadline/,
  );

  assert.throws(
    () =>
      assertProjectStatusTransition({
        oldStatus: "draft",
        newStatus: "published",
        deadline: Timestamp.now(),
        subtaskCount: 0,
      }),
    /must have at least one subtask/,
  );
});

test("pickNgoProjectMutableFields strips ownership and counter fields", () => {
  const fields = pickNgoProjectMutableFields({
    title: "Updated title",
    ngoId: "other-ngo",
    ngoName: "Other NGO",
    currentParticipants: 999,
    status: "published",
    subtasks: [{ id: "task-1", title: "Task", description: "Desc", order: 0 }],
  });

  assert.equal(fields.title, "Updated title");
  assert.equal(fields.status, "published");
  assert.deepEqual(fields.subtasks, [
    { id: "task-1", title: "Task", description: "Desc", order: 0 },
  ]);
  assert.equal("ngoId" in fields, false);
  assert.equal("ngoName" in fields, false);
  assert.equal("currentParticipants" in fields, false);
});
