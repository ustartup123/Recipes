/** E2E mock — replaces @/lib/firebase-admin */

export function getAdminAuth() {
  return {
    verifyIdToken: async () => ({
      uid: "test-uid-e2e",
      email: "test@example.dev",
    }),
  };
}

export function getAdminDb() {
  return {};
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verifyAuthToken(_authHeader: string | null) {
  return { uid: "test-uid-e2e", email: "test@example.dev" };
}
