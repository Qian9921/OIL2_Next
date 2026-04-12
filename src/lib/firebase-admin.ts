import { App, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    "openimpactlab-v2"
  );
}

function getFirebaseAuthServiceAccountId(projectId: string) {
  if (process.env.FIREBASE_AUTH_SERVICE_ACCOUNT_ID) {
    return process.env.FIREBASE_AUTH_SERVICE_ACCOUNT_ID;
  }

  if (projectId === "openimpactlab-v2") {
    return "firebase-adminsdk-fbsvc@openimpactlab-v2.iam.gserviceaccount.com";
  }

  return undefined;
}

function createFirebaseAdminApp() {
  const projectId = getFirebaseProjectId();
  const serviceAccountId = getFirebaseAuthServiceAccountId(projectId);

  return initializeApp({
    projectId,
    ...(serviceAccountId ? { serviceAccountId } : {}),
  });
}

const adminApp: App = getApps().length > 0 ? getApp() : createFirebaseAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const firebaseAdminProjectId = getFirebaseProjectId();
