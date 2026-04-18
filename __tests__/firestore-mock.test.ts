/**
 * Tests for the E2E Firestore mock. We test the mock (not the real Firestore
 * layer) because it's pure in-memory and has the same public shape.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { RecipeInput } from "@/lib/types";
import * as store from "@/lib/__e2e__/firestore";

function base(overrides: Partial<RecipeInput> = {}): RecipeInput {
  return {
    title: "Test",
    ingredients: [{ name: "flour", amount: "1 cup" }],
    instructions: ["mix"],
    tags: ["test"],
    ...overrides,
  };
}

describe("firestore mock", () => {
  // Module-level store state persists between tests in the same file;
  // beforeEach drains what each test added so cases stay independent.
  beforeEach(async () => {
    const all = await store.getRecipes("u1");
    for (const r of all) await store.deleteRecipe(r.id);
    const all2 = await store.getRecipes("u2");
    for (const r of all2) await store.deleteRecipe(r.id);
  });

  it("creates and fetches a recipe by id", async () => {
    const id = await store.createRecipe("u1", base({ title: "Pizza" }));
    const got = await store.getRecipe(id);
    expect(got?.title).toBe("Pizza");
    expect(got?.userId).toBe("u1");
    expect(got?.notes).toEqual([]);
  });

  it("isolates recipes by userId", async () => {
    await store.createRecipe("u1", base({ title: "A" }));
    await store.createRecipe("u2", base({ title: "B" }));
    const u1 = await store.getRecipes("u1");
    expect(u1).toHaveLength(1);
    expect(u1[0].title).toBe("A");
  });

  it("updates fields", async () => {
    const id = await store.createRecipe("u1", base({ title: "old" }));
    await store.updateRecipe(id, { title: "new" });
    const got = await store.getRecipe(id);
    expect(got?.title).toBe("new");
  });

  it("deletes a recipe", async () => {
    const id = await store.createRecipe("u1", base());
    await store.deleteRecipe(id);
    expect(await store.getRecipe(id)).toBeNull();
  });

  it("adds and deletes notes", async () => {
    const id = await store.createRecipe("u1", base());
    const note = await store.addRecipeNote(id, "hello");
    expect(note.content).toBe("hello");
    const after = await store.getRecipe(id);
    expect(after?.notes).toHaveLength(1);
    await store.deleteRecipeNote(id, note.id);
    const after2 = await store.getRecipe(id);
    expect(after2?.notes).toHaveLength(0);
  });

  it("throws when adding a note to a missing recipe", async () => {
    await expect(store.addRecipeNote("nonexistent", "x")).rejects.toThrow(
      /not found/,
    );
  });
});
