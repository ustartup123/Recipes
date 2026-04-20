/* eslint-disable */
/**
 * E2E mock — replaces @/lib/firestore via Playwright route interception.
 *
 * Returns in-memory data so the app renders without a real Firestore.
 * Mirror the exports of ../firestore.ts here as you add them.
 */

import type { Recipe, RecipeInput, RecipeUpdate, RecipeNote } from "../types";

// ─── Timestamp helper ────────────────────────────────────────────────────────

function ts(daysAgo = 0): any {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    toDate: () => d,
    toMillis: () => d.getTime(),
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
  };
}

let nextId = 100;
function genId() {
  return `mock-${++nextId}`;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const mockStore = {
  recipes: [] as Recipe[],
};

// ─── Recipe CRUD ─────────────────────────────────────────────────────────────

// Real Firestore's getDoc returns a fresh object every read, so the caller
// can mutate / replace fields without ever touching the backing store. Mirror
// that here — return shallow copies with cloned array fields so a page that
// keeps the returned recipe in React state doesn't accidentally observe a
// later mock-side mutation (and re-append the same note twice).
function cloneRecipe(r: Recipe): Recipe {
  return { ...r, notes: [...r.notes], ingredients: [...r.ingredients], instructions: [...r.instructions], tags: [...(r.tags ?? [])] };
}

export async function getRecipes(userId: string): Promise<Recipe[]> {
  return mockStore.recipes
    .filter((r) => r.userId === userId)
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
    )
    .map(cloneRecipe);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const r = mockStore.recipes.find((r) => r.id === id);
  return r ? cloneRecipe(r) : null;
}

export async function createRecipe(
  userId: string,
  data: RecipeInput,
): Promise<string> {
  const id = genId();
  mockStore.recipes.push({
    ...data,
    id,
    userId,
    notes: [],
    createdAt: ts(0),
    updatedAt: ts(0),
  } as Recipe);
  return id;
}

export async function updateRecipe(
  id: string,
  data: RecipeUpdate,
): Promise<void> {
  const idx = mockStore.recipes.findIndex((r) => r.id === id);
  if (idx >= 0) {
    mockStore.recipes[idx] = {
      ...mockStore.recipes[idx],
      ...data,
      updatedAt: ts(0),
    };
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  mockStore.recipes = mockStore.recipes.filter((r) => r.id !== id);
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function addRecipeNote(
  recipeId: string,
  content: string,
): Promise<RecipeNote> {
  const recipe = mockStore.recipes.find((r) => r.id === recipeId);
  if (!recipe) throw new Error("Recipe not found");
  const note: RecipeNote = {
    id: genId(),
    content,
    createdAt: ts(0),
  };
  recipe.notes = [...recipe.notes, note];
  return note;
}

export async function deleteRecipeNote(
  recipeId: string,
  noteId: string,
): Promise<void> {
  const recipe = mockStore.recipes.find((r) => r.id === recipeId);
  if (!recipe) throw new Error("Recipe not found");
  recipe.notes = recipe.notes.filter((n) => n.id !== noteId);
}
