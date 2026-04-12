import { MONITOR_SESSION_COOKIE_NAME } from "@/lib/monitor-auth";
import {
  collectRuntimeConfigWarnings,
  resolveFirebaseAdminRuntimeConfig,
  resolveFirebaseClientRuntimeConfig,
  resolveVertexRuntimeConfig,
} from "@/lib/runtime-config";

export interface RuntimeAdminSettingsSnapshot {
  generatedAt: string;
  general: {
    systemName: string;
    defaultLanguage: string;
    timezone: string;
    appUrlConfigured: boolean;
    deploymentProjectId: string | null;
  };
  monitoring: {
    monitorAccessConfigured: boolean;
    sessionTimeoutSeconds: number;
    cookieName: string;
  };
  notifications: {
    ngoEmailMode: "sender_credentials";
    platformEmailConfigured: boolean;
    adminEmailConfigured: boolean;
  };
  security: {
    nextAuthSecretConfigured: boolean;
    monitorSessionSecretConfigured: boolean;
    firebaseAuthBridgeEnabled: boolean;
  };
  integrations: {
    firebaseClient: {
      effectiveProjectId: string;
      authDomain: string;
      storageBucket: string;
      envConfigured: boolean;
      usesFallback: boolean;
    };
    firebaseAdmin: {
      effectiveProjectId: string;
      serviceAccountIdConfigured: boolean;
      usesFallback: boolean;
    };
    vertexAI: {
      effectiveProjectId: string;
      location: string;
      regionalLocation: string;
      fastModel: string;
      complexModel: string;
      usesProjectFallback: boolean;
      usesLocationFallback: boolean;
    };
  };
  notes: string[];
}

export function buildRuntimeAdminSettingsSnapshot(
  env: Record<string, string | undefined>,
): RuntimeAdminSettingsSnapshot {
  const monitorSessionSecret =
    env.MONITOR_ADMIN_SESSION_SECRET ?? env.NEXTAUTH_SECRET ?? "";
  const monitorAccessConfigured = Boolean(
    env.MONITOR_ADMIN_USERNAME && env.MONITOR_ADMIN_PASSWORD && monitorSessionSecret,
  );

  const firebaseClient = resolveFirebaseClientRuntimeConfig(env);
  const firebaseAdmin = resolveFirebaseAdminRuntimeConfig(env);
  const vertex = resolveVertexRuntimeConfig(env);
  const notes = collectRuntimeConfigWarnings(env);

  return {
    generatedAt: new Date().toISOString(),
    general: {
      systemName: "OIL2 Learning Platform",
      defaultLanguage: "zh-CN",
      timezone: "Asia/Shanghai",
      appUrlConfigured: Boolean(env.NEXTAUTH_URL),
      deploymentProjectId: env.GOOGLE_CLOUD_PROJECT ?? env.GCLOUD_PROJECT ?? null,
    },
    monitoring: {
      monitorAccessConfigured,
      sessionTimeoutSeconds: 60 * 60 * 8,
      cookieName: MONITOR_SESSION_COOKIE_NAME,
    },
    notifications: {
      ngoEmailMode: "sender_credentials",
      platformEmailConfigured: false,
      adminEmailConfigured: Boolean(env.MONITOR_ADMIN_USERNAME),
    },
    security: {
      nextAuthSecretConfigured: Boolean(env.NEXTAUTH_SECRET),
      monitorSessionSecretConfigured: Boolean(env.MONITOR_ADMIN_SESSION_SECRET),
      firebaseAuthBridgeEnabled: Boolean(firebaseAdmin.serviceAccountId || firebaseAdmin.projectId),
    },
    integrations: {
      firebaseClient: {
        effectiveProjectId: firebaseClient.projectId,
        authDomain: firebaseClient.authDomain,
        storageBucket: firebaseClient.storageBucket,
        envConfigured: firebaseClient.envConfigured,
        usesFallback: firebaseClient.usesFallback,
      },
      firebaseAdmin: {
        effectiveProjectId: firebaseAdmin.projectId,
        serviceAccountIdConfigured: firebaseAdmin.hasExplicitServiceAccountId,
        usesFallback: firebaseAdmin.usesProjectFallback,
      },
      vertexAI: {
        effectiveProjectId: vertex.projectId,
        location: vertex.location,
        regionalLocation: vertex.regionalLocation,
        fastModel: vertex.fastModel,
        complexModel: vertex.complexModel,
        usesProjectFallback: vertex.usesProjectFallback,
        usesLocationFallback: vertex.usesLocationFallback,
      },
    },
    notes,
  };
}
