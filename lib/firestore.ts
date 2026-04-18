/**
 * Firestore data access layer for Recipes.
 *
 * Every document carries `userId` so rules can enforce per-user isolation.
 * Sorting is done client-side to avoid requiring composite indexes.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";
import type { Recipe, RecipeInput, RecipeUpdate, RecipeNote } from "./types";

function db() {
  return getFirestoreDb();
}

const COL = "recipes";

// ─── Recipe CRUD ─────────────────────────────────────────────────────────────

export async function getRecipes(userId: string): Promise<Recipe[]> {
  const q = query(collection(db(), COL), where("userId", "==", userId));
  const snap = await getDocs(q);
  const recipes = snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<Recipe, "id">) } as Recipe),
  );
  return recipes.sort((a, b) => {
    const at = a.createdAt?.toMillis?.() ?? 0;
    const bt = b.createdAt?.toMillis?.() ?? 0;
    return bt - at; // newest first
  });
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const snap = await getDoc(doc(db(), COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Recipe, "id">) } as Recipe;
}

export async function createRecipe(
  userId: string,
  data: RecipeInput,
): Promise<string> {
  const ref = await addDoc(collection(db(), COL), {
    ...data,
    userId,
    notes: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRecipe(
  id: string,
  data: RecipeUpdate,
): Promise<void> {
  await updateDoc(doc(db(), COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  await deleteDoc(doc(db(), COL, id));
}

// ─── Recipe notes (embedded array) ───────────────────────────────────────────

export async function addRecipeNote(
  recipeId: string,
  content: string,
): Promise<RecipeNote> {
  const existing = await getRecipe(recipeId);
  if (!existing) throw new Error("Recipe not found");
  const note: RecipeNote = {
    id: crypto.randomUUID(),
    content,
    createdAt: Timestamp.now(),
  };
  await updateDoc(doc(db(), COL, recipeId), {
    notes: [...existing.notes, note],
    updatedAt: serverTimestamp(),
  });
  return note;
}

export async function deleteRecipeNote(
  recipeId: string,
  noteId: string,
): Promise<void> {
  const existing = await getRecipe(recipeId);
  if (!existing) throw new Error("Recipe not found");
  await updateDoc(doc(db(), COL, recipeId), {
    notes: existing.notes.filter((n) => n.id !== noteId),
    updatedAt: serverTimestamp(),
  });
}
