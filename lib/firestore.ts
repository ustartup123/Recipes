import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";
import type { Aquarium, AlertThresholds, AquariumEvent, Analysis } from "./types";

function db() {
  return getFirestoreDb();
}

// ─── Aquariums ────────────────────────────────────────────────────────────────

export async function getAquariums(userId: string): Promise<Aquarium[]> {
  // NOTE: We intentionally omit orderBy("createdAt") here to avoid requiring a
  // composite Firestore index (userId + createdAt) that can take time to build
  // and silently causes the query to return no results while the index builds.
  // We sort client-side instead, which is safe given the typical small number
  // of tanks per user.
  const q = query(
    collection(db(), "aquariums"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const aquariums = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Aquarium));
  // Sort by createdAt ascending (oldest first), falling back to id for stability
  return aquariums.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return aTime - bTime;
  });
}

export async function createAquarium(
  userId: string,
  data: Omit<Aquarium, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db(), "aquariums"), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAquarium(
  id: string,
  data: Partial<Omit<Aquarium, "id" | "userId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db(), "aquariums", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAquarium(id: string): Promise<void> {
  await deleteDoc(doc(db(), "aquariums", id));
}

export async function updateAlertThresholds(
  aquariumId: string,
  thresholds: AlertThresholds
): Promise<void> {
  await updateDoc(doc(db(), "aquariums", aquariumId), {
    alertThresholds: thresholds,
    updatedAt: serverTimestamp(),
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function getEvents(
  aquariumId: string,
  limitCount = 100
): Promise<AquariumEvent[]> {
  const q = query(
    collection(db(), "events"),
    where("aquariumId", "==", aquariumId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AquariumEvent));
}

export async function getRecentEvents(
  aquariumId: string,
  count = 3
): Promise<AquariumEvent[]> {
  return getEvents(aquariumId, count);
}

export async function getLatestParameterEvent(
  aquariumId: string
): Promise<AquariumEvent | null> {
  const q = query(
    collection(db(), "events"),
    where("aquariumId", "==", aquariumId),
    where("type", "==", "parameter_reading"),
    orderBy("timestamp", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as AquariumEvent;
}

export async function addEvent(
  aquariumId: string,
  userId: string,
  data: Omit<AquariumEvent, "id" | "aquariumId" | "userId" | "timestamp">,
  customTimestamp?: Date
): Promise<string> {
  const ref = await addDoc(collection(db(), "events"), {
    ...data,
    aquariumId,
    userId,
    timestamp: customTimestamp ? Timestamp.fromDate(customTimestamp) : serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<AquariumEvent, "id" | "aquariumId" | "userId" | "timestamp">>
): Promise<void> {
  await updateDoc(doc(db(), "events", id), data);
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db(), "events", id));
}

// ─── Analyses ────────────────────────────────────────────────────────────────

export async function getAnalyses(
  aquariumId: string,
  userId: string,
  limitCount = 10
): Promise<Analysis[]> {
  const q = query(
    collection(db(), "analyses"),
    where("aquariumId", "==", aquariumId),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Analysis));
}

export async function getLatestAnalysis(
  aquariumId: string,
  userId: string
): Promise<Analysis | null> {
  const analyses = await getAnalyses(aquariumId, userId, 1);
  return analyses[0] || null;
}

// ─── AI Context ──────────────────────────────────────────────────────────────

export async function getAIContext(userId: string): Promise<string> {
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db(), "users", userId));
  return snap.exists() ? (snap.data().aiContext || "") : "";
}

export async function saveAIContext(userId: string, aiContext: string): Promise<void> {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(doc(db(), "users", userId), { aiContext }, { merge: true });
}

// ─── User Preferences ──────────────────────────────────────────────────────

export async function getUserPreferences(userId: string): Promise<import("./types").UserPreferences> {
  const { getDoc } = await import("firebase/firestore");
  const { DEFAULT_PREFERENCES } = await import("./types");
  const snap = await getDoc(doc(db(), "users", userId));
  if (!snap.exists()) return DEFAULT_PREFERENCES;
  const data = snap.data();
  return {
    tempUnit: data.tempUnit || DEFAULT_PREFERENCES.tempUnit,
    volumeUnit: data.volumeUnit || DEFAULT_PREFERENCES.volumeUnit,
  };
}

export async function saveUserPreferences(
  userId: string,
  prefs: Partial<import("./types").UserPreferences>
): Promise<void> {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(doc(db(), "users", userId), prefs, { merge: true });
}

// ─── Batch delete (chunked to stay under 450 ops per batch) ──────────────────

async function deleteCollectionDocs(
  database: ReturnType<typeof db>,
  collectionName: string,
  aquariumId: string
): Promise<void> {
  const q = query(
    collection(database, collectionName),
    where("aquariumId", "==", aquariumId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs;

  const CHUNK_SIZE = 450;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(database);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function deleteAquariumAndData(aquariumId: string): Promise<void> {
  const database = db();

  await Promise.all([
    deleteCollectionDocs(database, "events", aquariumId),
    deleteCollectionDocs(database, "analyses", aquariumId),
  ]);

  await deleteDoc(doc(database, "aquariums", aquariumId));
}
