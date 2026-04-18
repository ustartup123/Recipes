"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * E2E mock — replaces @/context/AuthContext.
 * Provides a hardcoded test user so all authenticated pages render immediately.
 */

const mockUser = {
  uid: "test-uid-e2e",
  email: "test@aquatrack.dev",
  displayName: "E2E Test User",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: "",
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => "mock-id-token-e2e",
  getIdTokenResult: async () => ({} as never),
  reload: async () => {},
  toJSON: () => ({}),
  providerId: "google.com",
};

interface AuthContextValue {
  user: typeof mockUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: mockUser,
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: mockUser,
        loading: false,
        signInWithGoogle: async () => {},
        signOut: async () => {},
      }}
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
