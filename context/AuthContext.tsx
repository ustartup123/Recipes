"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/*  Dev-only auth bypass                                               */
/*  Activate: NODE_ENV=development + ?dev-login=true in the URL        */
/*  The mock user mirrors the shape used by the E2E test harness.      */
/* ------------------------------------------------------------------ */
const IS_DEV = process.env.NODE_ENV === "development";
const DEV_LOGIN_PARAM = "dev-login";

const devMockUser = {
  uid: "dev-test-uid",
  email: "dev@aquatrack.local",
  displayName: "Dev Test User",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: "",
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => "mock-id-token-dev",
  getIdTokenResult: async () => ({}) as never,
  reload: async () => {},
  toJSON: () => ({}),
  providerId: "google.com",
} as unknown as User;

/** Check whether the dev bypass query-param is present (client-side only). */
function hasDevLoginParam(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(DEV_LOGIN_PARAM);
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isDevBypass: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDev: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevBypass, setIsDevBypass] = useState(false);

  useEffect(() => {
    // Dev bypass: if NODE_ENV is development and ?dev-login is present,
    // skip Firebase entirely and inject a mock user.
    if (IS_DEV && hasDevLoginParam()) {
      console.info("[AquaTrack] Dev auth bypass active — signed in as Dev Test User");
      setUser(devMockUser);
      setIsDevBypass(true);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  /** Standard Google sign-in via Firebase popup. */
  async function signInWithGoogle() {
    try {
      await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error("[AquaTrack] Google sign-in failed:", error.code, error.message);
      throw err;
    }
  }

  /** Dev-only: instantly sign in as the mock user (no Firebase). */
  function signInAsDev() {
    if (!IS_DEV) return;
    setUser(devMockUser);
    setIsDevBypass(true);
  }

  async function signOut() {
    if (isDevBypass) {
      setUser(null);
      setIsDevBypass(false);
      return;
    }
    await firebaseSignOut(getFirebaseAuth());
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isDevBypass, signInWithGoogle, signInAsDev, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
