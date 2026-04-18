/**
 * Domain types for Recipes.
 *
 * Every user-scoped Firestore document carries `userId` so security rules
 * can enforce per-user isolation.
 */
import { Timestamp } from "firebase/firestore";

export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeNote {
  id: string;
  content: string;
  createdAt: Timestamp;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  imageUrl?: string;
  sourceUrl?: string;
  notes: RecipeNote[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Input shape for createRecipe — omits server-generated fields. */
export type RecipeInput = Omit<
  Recipe,
  "id" | "userId" | "notes" | "createdAt" | "updatedAt"
>;

/** Input shape for updateRecipe — all editable fields are optional. */
export type RecipeUpdate = Partial<RecipeInput>;
