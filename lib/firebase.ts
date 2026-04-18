import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const isFirebaseConfigured =
  !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
  !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
  !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy initialization — only initialize Firebase in the browser
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let googleProvider: GoogleAuthProvider;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

// Runtime client-side env check (fires on first use in browser)
function assertClientEnv() {
  if (typeof window === "undefined") return; // SSR — skip
  const missing = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ].filter((k) => !process.env[k]);

  if (missing.length > 0) {
    console.error(
      `[firebase] Missing Firebase env vars:\n${missing.map((k) => `  • ${k}`).join("\n")}\nCopy .env.example → .env and fill in your Firebase credentials.`
    );
  }
}

export function getFirebaseAuth(): Auth {
  assertClientEnv();
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    const app = getFirebaseApp();
    // `ignoreUndefinedProperties` lets us pass optional fields (imageUrl,
    // sourceUrl) as undefined without Firestore throwing "Unsupported field
    // value". initializeFirestore must run before getFirestore for a given
    // app, so fall back if something else beat us to it.
    // `persistentLocalCache` keeps Firestore data in IndexedDB so reloads
    // render instantly from cache and refresh in the background.
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache:
          typeof window !== "undefined"
            ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
            : undefined,
      });
    } catch {
      db = getFirestore(app);
    }
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) storage = getStorage(getFirebaseApp());
  return storage;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope("email");
    googleProvider.addScope("profile");
  }
  return googleProvider;
}

// Convenience exports for direct use in client components
export { getFirebaseAuth as auth, getFirestoreDb as db };
export default getFirebaseApp;
