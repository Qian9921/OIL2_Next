import assert from "node:assert/strict";
import test from "node:test";

import { buildUserRoleAnalytics } from "./role-analytics";

test("buildUserRoleAnalytics folds legacy teacher users into ngo active counts", () => {
  const analytics = buildUserRoleAnalytics([
    { role: "student" },
    { role: "ngo" },
    { role: "teacher" },
    { role: "teacher" },
  ]);

  assert.deepEqual(analytics.activeUsersByRole, {
    student: 1,
    ngo: 3,
  });
  assert.deepEqual(analytics.legacyUsersByRole, {
    teacher: 2,
  });
});
