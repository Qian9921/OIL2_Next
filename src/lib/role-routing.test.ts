import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultRouteForRole,
  getEffectiveUserRole,
  getProjectWorkspaceRoute,
  isStudentWorkspaceRole,
} from "./role-routing";

test("teacher is treated as ngo at runtime", () => {
  assert.equal(getEffectiveUserRole("teacher"), "ngo");
  assert.equal(getDefaultRouteForRole("teacher"), "/ngo");
  assert.equal(getProjectWorkspaceRoute("teacher"), "/ngo/projects");
  assert.equal(isStudentWorkspaceRole("teacher"), false);
});

test("student role keeps student workspace routing", () => {
  assert.equal(getEffectiveUserRole("student"), "student");
  assert.equal(getDefaultRouteForRole("student"), "/student");
  assert.equal(getProjectWorkspaceRoute("student"), "/student/projects");
  assert.equal(isStudentWorkspaceRole("student"), true);
});

test("unknown roles remain unassigned", () => {
  assert.equal(getEffectiveUserRole(undefined), null);
  assert.equal(getDefaultRouteForRole(undefined), "/");
});
