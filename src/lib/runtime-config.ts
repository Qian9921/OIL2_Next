const FIREBASE_CLIENT_DEFAULTS = {
  apiKey: "AIzaSyDWBFBB2_FUps2n-qLrVwlvXNivvv0XZns",
  authDomain: "openimpactlab-v2.firebaseapp.com",
  projectId: "openimpactlab-v2",
  storageBucket: "openimpactlab-v2.firebasestorage.app",
  messagingSenderId: "303699872643",
  appId: "1:303699872643:web:9f4f74ada233cef265c4b6",
  measurementId: "G-MD29990PGD",
} as const;

const MODEL_ALIASES: Record<string, string> = {
  "gemini-3-pro-preview": "gemini-3.1-pro-preview",
};

const VERTEX_DEFAULTS = {
  projectId: "openimpactlab-v2",
  fastModel: "gemini-3-flash-preview",
  complexModel: "gemini-3.1-pro-preview",
  fastFallbackModel: "gemini-2.5-flash",
  complexFallbackModel: "gemini-2.5-pro",
  regionalLocation: "asia-east1",
} as const;

type EnvMap = Record<string, string | undefined>;

const KNOWN_PLACEHOLDER_NEXTAUTH_SECRETS = new Set([
  "openimpactlab-super-secret-key-2024-please-change-in-production",
]);

export function isCloudRunRuntime(env: EnvMap) {
  return Boolean(env.K_SERVICE || env.K_REVISION || env.CLOUD_RUN_JOB);
}

export function assertCloudRunFirebaseAdminRuntimeConfig(env: EnvMap) {
  if (!isCloudRunRuntime(env)) {
    return;
  }

  const hasExplicitProjectId = Boolean(
    env.FIREBASE_PROJECT_ID ||
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      env.GOOGLE_CLOUD_PROJECT ||
      env.GCLOUD_PROJECT,
  );

  if (!hasExplicitProjectId) {
    throw new Error(
      "Firebase Admin requires an explicit project id in Cloud Run. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT.",
    );
  }
}

export function assertCloudRunVertexRuntimeConfig(env: EnvMap) {
  if (!isCloudRunRuntime(env)) {
    return;
  }

  const hasExplicitProjectId = Boolean(env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT);
  const hasExplicitLocation = Boolean(
    env.GOOGLE_CLOUD_LOCATION || env.VERTEX_REGIONAL_LOCATION,
  );

  if (!hasExplicitProjectId) {
    throw new Error(
      "Vertex AI requires GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT in Cloud Run.",
    );
  }

  if (!hasExplicitLocation) {
    throw new Error(
      "Vertex AI requires GOOGLE_CLOUD_LOCATION or VERTEX_REGIONAL_LOCATION in Cloud Run.",
    );
  }
}

function normalizeModelName(modelName: string | undefined, fallback: string) {
  const requestedModel = modelName?.trim() || fallback;
  return MODEL_ALIASES[requestedModel] || requestedModel;
}

export function resolveFirebaseClientRuntimeConfig(env: EnvMap) {
  const envConfigured = Boolean(
    env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
      env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
      env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );

  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? FIREBASE_CLIENT_DEFAULTS.apiKey,
    authDomain:
      env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? FIREBASE_CLIENT_DEFAULTS.authDomain,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? FIREBASE_CLIENT_DEFAULTS.projectId,
    storageBucket:
      env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? FIREBASE_CLIENT_DEFAULTS.storageBucket,
    messagingSenderId:
      env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
      FIREBASE_CLIENT_DEFAULTS.messagingSenderId,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? FIREBASE_CLIENT_DEFAULTS.appId,
    measurementId:
      env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? FIREBASE_CLIENT_DEFAULTS.measurementId,
    envConfigured,
    usesFallback: !envConfigured,
  };
}

export function resolveFirebaseAdminRuntimeConfig(env: EnvMap) {
  const projectId =
    env.FIREBASE_PROJECT_ID ??
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    env.GOOGLE_CLOUD_PROJECT ??
    env.GCLOUD_PROJECT ??
    FIREBASE_CLIENT_DEFAULTS.projectId;

  const explicitServiceAccountId = env.FIREBASE_AUTH_SERVICE_ACCOUNT_ID;
  const derivedServiceAccountId =
    projectId === FIREBASE_CLIENT_DEFAULTS.projectId
      ? "firebase-adminsdk-fbsvc@openimpactlab-v2.iam.gserviceaccount.com"
      : undefined;

  return {
    projectId,
    serviceAccountId: explicitServiceAccountId ?? derivedServiceAccountId,
    hasExplicitProjectId: Boolean(
      env.FIREBASE_PROJECT_ID ||
        env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        env.GOOGLE_CLOUD_PROJECT ||
        env.GCLOUD_PROJECT,
    ),
    hasExplicitServiceAccountId: Boolean(explicitServiceAccountId),
    usesProjectFallback: !(
      env.FIREBASE_PROJECT_ID ||
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      env.GOOGLE_CLOUD_PROJECT ||
      env.GCLOUD_PROJECT
    ),
    usesDerivedServiceAccountId: !explicitServiceAccountId && Boolean(derivedServiceAccountId),
  };
}

export function resolveVertexRuntimeConfig(env: EnvMap) {
  const projectId =
    env.GOOGLE_CLOUD_PROJECT ?? env.GCLOUD_PROJECT ?? VERTEX_DEFAULTS.projectId;
  const regionalLocation =
    env.VERTEX_REGIONAL_LOCATION ?? VERTEX_DEFAULTS.regionalLocation;
  const location = env.GOOGLE_CLOUD_LOCATION ?? regionalLocation;

  const genericModel = env.VERTEX_MODEL_NAME?.trim();
  const fastModel = genericModel
    ? normalizeModelName(genericModel, VERTEX_DEFAULTS.complexModel)
    : normalizeModelName(env.VERTEX_FAST_MODEL, VERTEX_DEFAULTS.fastModel);
  const complexModel = genericModel
    ? normalizeModelName(genericModel, VERTEX_DEFAULTS.complexModel)
    : normalizeModelName(env.VERTEX_COMPLEX_MODEL, VERTEX_DEFAULTS.complexModel);
  const fastFallbackModel = genericModel
    ? normalizeModelName(
        env.VERTEX_COMPLEX_FALLBACK_MODEL,
        VERTEX_DEFAULTS.complexFallbackModel,
      )
    : normalizeModelName(
        env.VERTEX_FAST_FALLBACK_MODEL,
        VERTEX_DEFAULTS.fastFallbackModel,
      );
  const complexFallbackModel = normalizeModelName(
    env.VERTEX_COMPLEX_FALLBACK_MODEL,
    VERTEX_DEFAULTS.complexFallbackModel,
  );

  return {
    projectId,
    location,
    regionalLocation,
    genericModel: genericModel ? normalizeModelName(genericModel, VERTEX_DEFAULTS.complexModel) : null,
    fastModel,
    complexModel,
    fastFallbackModel,
    complexFallbackModel,
    usesProjectFallback: !(env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT),
    usesLocationFallback: !env.GOOGLE_CLOUD_LOCATION && !env.VERTEX_REGIONAL_LOCATION,
    usesRegionalLocationFallback: !env.VERTEX_REGIONAL_LOCATION,
  };
}

export function collectRuntimeConfigWarnings(env: EnvMap) {
  const firebaseClient = resolveFirebaseClientRuntimeConfig(env);
  const firebaseAdmin = resolveFirebaseAdminRuntimeConfig(env);
  const vertex = resolveVertexRuntimeConfig(env);
  const warnings: string[] = [];

  if (firebaseClient.usesFallback) {
    warnings.push("Firebase client config is partially relying on code defaults.");
  }

  if (firebaseAdmin.usesProjectFallback) {
    warnings.push("Firebase Admin project selection is falling back to the default project id.");
  }

  if (firebaseAdmin.usesDerivedServiceAccountId) {
    warnings.push("Firebase Admin service account id is being derived from the default project.");
  }

  if (vertex.usesProjectFallback) {
    warnings.push("Vertex AI project selection is falling back to the default project id.");
  }

  if (vertex.usesLocationFallback) {
    warnings.push("Vertex AI location is falling back to the default regional location.");
  }

  if (!(env.MONITOR_ADMIN_USERNAME && env.MONITOR_ADMIN_PASSWORD)) {
    warnings.push("Monitor admin username/password are not fully configured.");
  }

  if (!(env.MONITOR_ADMIN_SESSION_SECRET || env.NEXTAUTH_SECRET)) {
    warnings.push("Monitor session secret is not configured.");
  }

  if (
    env.NEXTAUTH_SECRET &&
    KNOWN_PLACEHOLDER_NEXTAUTH_SECRETS.has(env.NEXTAUTH_SECRET)
  ) {
    warnings.push("NEXTAUTH_SECRET is using a known placeholder value.");
  }

  return warnings;
}

export interface PublicHealthSnapshot {
  status: "ok" | "degraded";
  timestamp: string;
  warningCount: number;
  checks: {
    firebaseClientConfigured: boolean;
    firebaseAdminConfigured: boolean;
    vertexConfigured: boolean;
    monitorConfigured: boolean;
    nextAuthSecretConfigured: boolean;
    nextAuthSecretPlaceholder: boolean;
  };
}

export function buildPublicHealthSnapshot(env: EnvMap): PublicHealthSnapshot {
  const firebaseClient = resolveFirebaseClientRuntimeConfig(env);
  const firebaseAdmin = resolveFirebaseAdminRuntimeConfig(env);
  const vertex = resolveVertexRuntimeConfig(env);
  const warnings = collectRuntimeConfigWarnings(env);
  const nextAuthSecretPlaceholder = Boolean(
    env.NEXTAUTH_SECRET &&
      KNOWN_PLACEHOLDER_NEXTAUTH_SECRETS.has(env.NEXTAUTH_SECRET),
  );
  const monitorConfigured = Boolean(
    env.MONITOR_ADMIN_USERNAME &&
      env.MONITOR_ADMIN_PASSWORD &&
      (env.MONITOR_ADMIN_SESSION_SECRET || env.NEXTAUTH_SECRET),
  );

  return {
    status: warnings.length === 0 ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    warningCount: warnings.length,
    checks: {
      firebaseClientConfigured: !firebaseClient.usesFallback,
      firebaseAdminConfigured: !firebaseAdmin.usesProjectFallback,
      vertexConfigured: !vertex.usesProjectFallback && !vertex.usesLocationFallback,
      monitorConfigured,
      nextAuthSecretConfigured: Boolean(env.NEXTAUTH_SECRET),
      nextAuthSecretPlaceholder,
    },
  };
}
