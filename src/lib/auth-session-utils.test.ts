import assert from "node:assert/strict";
import test from "node:test";

import {
  hydrateSessionUserFromToken,
  withPendingRoleSelectionToken,
  withPersistedUserToken,
} from "./auth-session-utils";

test("withPersistedUserToken maps legacy teacher users to ngo in auth state", () => {
  const token = withPersistedUserToken(
    {
      email: "legacy@example.com",
      needsRoleSelection: true,
    },
    {
      id: "user-1",
      role: "teacher",
      name: "Legacy Teacher",
      avatar: "avatar.png",
    }
  );

  assert.deepEqual(token, {
    email: "legacy@example.com",
    userId: "user-1",
    role: "ngo",
    name: "Legacy Teacher",
    avatar: "avatar.png",
    needsRoleSelection: false,
  });
});

test("withPendingRoleSelectionToken keeps identity and marks role selection required", () => {
  const token = withPendingRoleSelectionToken(
    {
      avatar: "old-avatar.png",
    },
    {
      email: "new-user@example.com",
      name: "New User",
    }
  );

  assert.deepEqual(token, {
    avatar: "old-avatar.png",
    email: "new-user@example.com",
    name: "New User",
    needsRoleSelection: true,
  });
});

test("hydrateSessionUserFromToken copies auth state into session user without dropping profile fields", () => {
  const sessionUser = hydrateSessionUserFromToken(
    {
      id: "existing-id",
      name: "Existing Name",
      email: "existing@example.com",
      image: "profile.png",
    },
    {
      userId: "user-2",
      role: "ngo",
      avatar: "avatar.png",
      needsRoleSelection: false,
    }
  );

  assert.deepEqual(sessionUser, {
    id: "user-2",
    name: "Existing Name",
    email: "existing@example.com",
    image: "profile.png",
    role: "ngo",
    avatar: "avatar.png",
    needsRoleSelection: false,
  });
});
