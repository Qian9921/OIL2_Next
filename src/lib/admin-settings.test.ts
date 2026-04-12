import assert from "node:assert/strict";
import test from "node:test";

import { buildRuntimeAdminSettingsSnapshot } from "./admin-settings";

test("buildRuntimeAdminSettingsSnapshot marks fallback usage when env is incomplete", () => {
  const snapshot = buildRuntimeAdminSettingsSnapshot({});

  assert.equal(snapshot.monitoring.monitorAccessConfigured, false);
  assert.equal(snapshot.integrations.firebaseClient.effectiveProjectId, "openimpactlab-v2");
  assert.equal(snapshot.integrations.firebaseClient.usesFallback, true);
  assert.equal(snapshot.integrations.firebaseAdmin.usesFallback, true);
  assert.equal(snapshot.integrations.vertexAI.usesProjectFallback, true);
  assert.equal(snapshot.notes.length > 0, true);
});

test("buildRuntimeAdminSettingsSnapshot reflects configured runtime values", () => {
  const snapshot = buildRuntimeAdminSettingsSnapshot({
    NEXTAUTH_SECRET: "secret",
    MONITOR_ADMIN_USERNAME: "admin",
    MONITOR_ADMIN_PASSWORD: "password",
    MONITOR_ADMIN_SESSION_SECRET: "monitor-secret",
    NEXT_PUBLIC_FIREBASE_API_KEY: "key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "custom.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "custom-project",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "custom.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
    NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
    GOOGLE_CLOUD_PROJECT: "prod-project",
    GOOGLE_CLOUD_LOCATION: "us-central1",
    VERTEX_FAST_MODEL: "fast-model",
    VERTEX_COMPLEX_MODEL: "complex-model",
  });

  assert.equal(snapshot.monitoring.monitorAccessConfigured, true);
  assert.equal(snapshot.integrations.firebaseClient.usesFallback, false);
  assert.equal(snapshot.integrations.firebaseClient.effectiveProjectId, "custom-project");
  assert.equal(snapshot.integrations.firebaseAdmin.effectiveProjectId, "custom-project");
  assert.equal(snapshot.integrations.vertexAI.effectiveProjectId, "prod-project");
  assert.equal(snapshot.integrations.vertexAI.location, "us-central1");
  assert.equal(snapshot.integrations.vertexAI.fastModel, "fast-model");
  assert.equal(snapshot.notes.includes("Firebase client config is partially relying on code defaults."), false);
});
