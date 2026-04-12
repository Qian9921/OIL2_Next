import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCloudRunFirebaseAdminRuntimeConfig,
  assertCloudRunVertexRuntimeConfig,
  buildPublicHealthSnapshot,
  collectRuntimeConfigWarnings,
  isCloudRunRuntime,
  resolveFirebaseAdminRuntimeConfig,
  resolveFirebaseClientRuntimeConfig,
  resolveVertexRuntimeConfig,
} from "./runtime-config";

test("runtime config helpers expose fallback state when env is incomplete", () => {
  const firebaseClient = resolveFirebaseClientRuntimeConfig({});
  const firebaseAdmin = resolveFirebaseAdminRuntimeConfig({});
  const vertex = resolveVertexRuntimeConfig({});
  const warnings = collectRuntimeConfigWarnings({});

  assert.equal(firebaseClient.projectId, "openimpactlab-v2");
  assert.equal(firebaseClient.usesFallback, true);
  assert.equal(firebaseAdmin.projectId, "openimpactlab-v2");
  assert.equal(firebaseAdmin.usesProjectFallback, true);
  assert.equal(vertex.projectId, "openimpactlab-v2");
  assert.equal(vertex.location, "asia-east1");
  assert.equal(vertex.usesLocationFallback, true);
  assert.equal(warnings.length > 0, true);
});

test("runtime config helpers preserve explicit runtime configuration", () => {
  const env = {
    NEXT_PUBLIC_FIREBASE_API_KEY: "key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "custom.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "custom-project",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "custom.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
    NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
    FIREBASE_PROJECT_ID: "admin-project",
    FIREBASE_AUTH_SERVICE_ACCOUNT_ID: "svc@admin-project.iam.gserviceaccount.com",
    GOOGLE_CLOUD_PROJECT: "vertex-project",
    GOOGLE_CLOUD_LOCATION: "us-central1",
    VERTEX_FAST_MODEL: "gemini-3-pro-preview",
    VERTEX_COMPLEX_MODEL: "complex-model",
    MONITOR_ADMIN_USERNAME: "admin",
    MONITOR_ADMIN_PASSWORD: "password",
    NEXTAUTH_SECRET: "secret",
  };

  const firebaseClient = resolveFirebaseClientRuntimeConfig(env);
  const firebaseAdmin = resolveFirebaseAdminRuntimeConfig(env);
  const vertex = resolveVertexRuntimeConfig(env);
  const warnings = collectRuntimeConfigWarnings(env);

  assert.equal(firebaseClient.projectId, "custom-project");
  assert.equal(firebaseClient.usesFallback, false);
  assert.equal(firebaseAdmin.projectId, "admin-project");
  assert.equal(firebaseAdmin.hasExplicitServiceAccountId, true);
  assert.equal(vertex.projectId, "vertex-project");
  assert.equal(vertex.location, "us-central1");
  assert.equal(vertex.fastModel, "gemini-3.1-pro-preview");
  assert.equal(warnings.includes("Firebase client config is partially relying on code defaults."), false);
});

test("cloud run runtime validation requires explicit server-side project config", () => {
  assert.equal(isCloudRunRuntime({ K_SERVICE: "oil2-next" }), true);

  assert.throws(
    () => assertCloudRunFirebaseAdminRuntimeConfig({ K_SERVICE: "oil2-next" }),
    /Firebase Admin requires an explicit project id in Cloud Run/,
  );

  assert.throws(
    () => assertCloudRunVertexRuntimeConfig({ K_SERVICE: "oil2-next" }),
    /Vertex AI requires GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT in Cloud Run/,
  );
});

test("cloud run runtime validation accepts explicit Firebase Admin and Vertex config", () => {
  const env = {
    K_SERVICE: "oil2-next",
    GOOGLE_CLOUD_PROJECT: "open-impact-lab-zob4aq",
    GOOGLE_CLOUD_LOCATION: "global",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "openimpactlab-v2",
  };

  assert.doesNotThrow(() => assertCloudRunFirebaseAdminRuntimeConfig(env));
  assert.doesNotThrow(() => assertCloudRunVertexRuntimeConfig(env));
});

test("runtime warnings flag known placeholder NextAuth secrets", () => {
  const warnings = collectRuntimeConfigWarnings({
    NEXTAUTH_SECRET: "openimpactlab-super-secret-key-2024-please-change-in-production",
  });

  assert.equal(
    warnings.includes("NEXTAUTH_SECRET is using a known placeholder value."),
    true,
  );
});

test("public health snapshot exposes only summarized runtime health signals", () => {
  const snapshot = buildPublicHealthSnapshot({
    NEXTAUTH_SECRET: "openimpactlab-super-secret-key-2024-please-change-in-production",
  });

  assert.equal(snapshot.status, "degraded");
  assert.equal(snapshot.warningCount > 0, true);
  assert.equal(snapshot.checks.firebaseClientConfigured, false);
  assert.equal(snapshot.checks.firebaseAdminConfigured, false);
  assert.equal(snapshot.checks.vertexConfigured, false);
  assert.equal(snapshot.checks.nextAuthSecretConfigured, true);
  assert.equal(snapshot.checks.nextAuthSecretPlaceholder, true);
  assert.equal("runtime" in snapshot, false);
  assert.equal("projectId" in snapshot.checks, false);
});

test("public health snapshot reports ok when runtime config is explicit", () => {
  const snapshot = buildPublicHealthSnapshot({
    NEXTAUTH_SECRET: "real-secret",
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

  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.warningCount, 0);
  assert.equal(snapshot.checks.firebaseClientConfigured, true);
  assert.equal(snapshot.checks.firebaseAdminConfigured, true);
  assert.equal(snapshot.checks.vertexConfigured, true);
  assert.equal(snapshot.checks.monitorConfigured, true);
  assert.equal(snapshot.checks.nextAuthSecretPlaceholder, false);
});
