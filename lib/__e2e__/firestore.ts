/**
 * E2E mock — replaces @/lib/firestore via Playwright route interception.
 *
 * Returns in-memory data so the app renders without a real Firestore.
 * Multi-step flows (create → list) work because mutations update the store.
 *
 * Mirror the exports of ../firestore.ts here as you add them.
 */

import type { Item } from "../types";

// ─── Timestamp helper ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── Seed data ───────────────────────────────────────────────────────────────

const mockStore = {
  items: [] as Item[],
};

// ─── Items ───────────────────────────────────────────────────────────────────

export async function getItems(userId: string): Promise<Item[]> {
  return mockStore.items
    .filter((i) => i.userId === userId)
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
}

export async function createItem(
  userId: string,
  data: Omit<Item, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = genId();
  mockStore.items.push({
    ...data,
    id,
    userId,
    createdAt: ts(0),
    updatedAt: ts(0),
  } as Item);
  return id;
}

export async function updateItem(
  id: string,
  data: Partial<Omit<Item, "id" | "userId" | "createdAt">>
): Promise<void> {
  const idx = mockStore.items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    mockStore.items[idx] = { ...mockStore.items[idx], ...data, updatedAt: ts(0) };
  }
}

export async function deleteItem(id: string): Promise<void> {
  mockStore.items = mockStore.items.filter((i) => i.id !== id);
}
