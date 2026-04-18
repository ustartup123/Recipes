import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import logger from "./logger";

let app: App;

function getAdminApp(): App {
  if (!app) {
    if (getApps().length === 0) {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error("[AquaTrack] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
      }

      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(serviceAccountKey);
        } catch (e) {
          logger.error({ err: e }, "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON");
          throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY — must be valid JSON");
        }
        app = initializeApp({ credential: cert(serviceAccount), projectId });
        logger.info({ projectId, credential: "service-account" }, "Firebase Admin initialized");
      } else {
        app = initializeApp({ projectId });
        logger.info({ projectId, credential: "adc" }, "Firebase Admin initialized");
      }
    } else {
      app = getApps()[0];
    }
  }
  return app;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return getStorage(getAdminApp()).bucket(bucket);
}

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded token (with uid) or throws.
 */
export async function verifyAuthToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Auth failed: missing or invalid Authorization header");
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.slice(7);
  return getAdminAuth().verifyIdToken(token);
}
