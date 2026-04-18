/**
 * Regression: getFirestoreDb() must configure ignoreUndefinedProperties so
 * saving a recipe with an undefined optional field (e.g. no imageUrl after
 * URL import without og:image) does not throw "Unsupported field value:
 * undefined" — which previously left the UI stuck on "שומר...".
 */
import { describe, it, expect, beforeAll } from "vitest";
import { collection, addDoc } from "firebase/firestore";

describe("getFirestoreDb", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "fake";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "fake.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "fake-init-test";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "fake.appspot.com";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "0";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "0";
  });

  it("does not throw on writes containing undefined fields", async () => {
    const { getFirestoreDb } = await import("@/lib/firebase");
    const db = getFirestoreDb();
    // Validation runs synchronously inside addDoc. If undefined values
    // were rejected we'd throw here. We never await the returned Promise
    // because there is no real backend.
    expect(() =>
      addDoc(collection(db, "recipes"), {
        title: "t",
        userId: "u",
        imageUrl: undefined,
        sourceUrl: undefined,
      }),
    ).not.toThrow();
  });
});
