/**
 * Firestore data access layer.
 *
 * Pattern: every document carries a `userId` field so Firestore security
 * rules can enforce per-user isolation. Helpers below are a worked example
 * for an `items` collection — replace them with your own entity helpers.
 *
 * Conventions:
 * - Functions return plain typed objects, not query snapshots
 * - Server timestamps for createdAt/updatedAt
 * - Sort client-side when possible to avoid composite-index requirements
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";
import type { Item } from "./types";

function db() {
  return getFirestoreDb();
}

// ─── Worked example: items collection ────────────────────────────────────────

export async function getItems(userId: string): Promise<Item[]> {
  // NOTE: omitting orderBy keeps this from requiring a composite index on
  // (userId + createdAt). Sort client-side instead — fine for small N.
  const q = query(collection(db(), "items"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
  return items.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return aTime - bTime;
  });
}

export async function createItem(
  userId: string,
  data: Omit<Item, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db(), "items"), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateItem(
  id: string,
  data: Partial<Omit<Item, "id" | "userId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db(), "items", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(id: string): Promise<void> {
  await deleteDoc(doc(db(), "items", id));
}
