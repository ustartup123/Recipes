/** E2E mock — replaces @/lib/firebase so no real Firebase SDK is loaded */

export const isFirebaseConfigured = true;

export function getFirebaseAuth(): unknown {
  return {};
}

export function getFirestoreDb(): unknown {
  return {};
}

export function getFirebaseStorage(): unknown {
  return {};
}

export function getGoogleProvider(): unknown {
  return {};
}

export { getFirebaseAuth as auth, getFirestoreDb as db };
export default function getFirebaseApp() {
  return {};
}
