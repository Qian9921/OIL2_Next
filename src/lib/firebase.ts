import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { resolveFirebaseClientRuntimeConfig } from "./runtime-config";

const firebaseRuntimeConfig = resolveFirebaseClientRuntimeConfig(process.env);

const firebaseConfig = {
  apiKey: firebaseRuntimeConfig.apiKey,
  authDomain: firebaseRuntimeConfig.authDomain,
  projectId: firebaseRuntimeConfig.projectId,
  storageBucket: firebaseRuntimeConfig.storageBucket,
  messagingSenderId: firebaseRuntimeConfig.messagingSenderId,
  appId: firebaseRuntimeConfig.appId,
  measurementId: firebaseRuntimeConfig.measurementId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const firebaseClientProjectId = firebaseRuntimeConfig.projectId;

export default app; 
