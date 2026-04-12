import { App, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  assertCloudRunFirebaseAdminRuntimeConfig,
  resolveFirebaseAdminRuntimeConfig,
} from "@/lib/runtime-config";

assertCloudRunFirebaseAdminRuntimeConfig(process.env);

function createFirebaseAdminApp() {
  const config = resolveFirebaseAdminRuntimeConfig(process.env);

  return initializeApp({
    projectId: config.projectId,
    ...(config.serviceAccountId ? { serviceAccountId: config.serviceAccountId } : {}),
  });
}

const adminApp: App = getApps().length > 0 ? getApp() : createFirebaseAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const firebaseAdminProjectId = resolveFirebaseAdminRuntimeConfig(process.env).projectId;
