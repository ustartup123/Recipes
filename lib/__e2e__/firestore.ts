/**
 * E2E mock — replaces @/lib/firestore.
 * Returns in-memory test data so the app renders without a real Firestore.
 * Data lives in `mockStore` and is mutated by create/update/delete functions,
 * so multi-step E2E flows (create tank → see it on dashboard) work correctly.
 */

import type {
  Aquarium,
  AquariumEvent,
  Analysis,
  AlertThresholds,
} from "../types";

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
  aquariums: [
    {
      id: "tank-1",
      userId: "test-uid-e2e",
      name: "Living Room Tank",
      volume: 200,
      volumeUnit: "liters" as const,
      type: "freshwater" as const,
      notes: "Community tank with tetras and corydoras",
      createdAt: ts(30),
      updatedAt: ts(1),
    },
    {
      id: "tank-2",
      userId: "test-uid-e2e",
      name: "Office Nano",
      volume: 40,
      volumeUnit: "liters" as const,
      type: "planted" as const,
      notes: "Shrimp tank",
      createdAt: ts(14),
      updatedAt: ts(0),
    },
  ] as Aquarium[],

  events: [
    {
      id: "evt-1",
      aquariumId: "tank-1",
      userId: "test-uid-e2e",
      timestamp: ts(0),
      type: "parameter_reading" as const,
      title: "Water Test",
      metadata: { ph: 7.2, ammonia: 0, nitrite: 0, nitrate: 15, temperature: 78, gh: 8, kh: 5 },
    },
    {
      id: "evt-2",
      aquariumId: "tank-1",
      userId: "test-uid-e2e",
      timestamp: ts(1),
      type: "water_change" as const,
      title: "25% Water Change",
      metadata: { waterChangePercent: 25, conditionerUsed: "Seachem Prime" },
    },
    {
      id: "evt-3",
      aquariumId: "tank-1",
      userId: "test-uid-e2e",
      timestamp: ts(2),
      type: "parameter_reading" as const,
      title: "Water Test",
      metadata: { ph: 7.0, ammonia: 0.25, nitrite: 0, nitrate: 20, temperature: 77, gh: 7, kh: 4 },
    },
    {
      id: "evt-4",
      aquariumId: "tank-1",
      userId: "test-uid-e2e",
      timestamp: ts(3),
      type: "fish_added" as const,
      title: "Added 6x Neon Tetra",
      metadata: { species: "Neon Tetra", count: 6, source: "Local Fish Store" },
    },
    {
      id: "evt-5",
      aquariumId: "tank-1",
      userId: "test-uid-e2e",
      timestamp: ts(5),
      type: "dosing" as const,
      title: "Seachem Flourish",
      metadata: { product: "Seachem Flourish", amount: "2ml" },
    },
    {
      id: "evt-6",
      aquariumId: "tank-2",
      userId: "test-uid-e2e",
      timestamp: ts(0),
      type: "parameter_reading" as const,
      title: "Water Test",
      metadata: { ph: 6.8, ammonia: 0, nitrite: 0, nitrate: 5, temperature: 76, gh: 6, kh: 3 },
    },
  ] as AquariumEvent[],

  analyses: [] as Analysis[],
};

// ─── Aquariums ───────────────────────────────────────────────────────────────

export async function getAquariums(userId: string): Promise<Aquarium[]> {
  return mockStore.aquariums
    .filter((a) => a.userId === userId)
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
}

export async function createAquarium(
  userId: string,
  data: Omit<Aquarium, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = genId();
  mockStore.aquariums.push({
    ...data,
    id,
    userId,
    createdAt: ts(0),
    updatedAt: ts(0),
  } as Aquarium);
  return id;
}

export async function updateAquarium(
  id: string,
  data: Partial<Omit<Aquarium, "id" | "userId" | "createdAt">>
): Promise<void> {
  const idx = mockStore.aquariums.findIndex((a) => a.id === id);
  if (idx >= 0) {
    mockStore.aquariums[idx] = { ...mockStore.aquariums[idx], ...data, updatedAt: ts(0) };
  }
}

export async function deleteAquarium(id: string): Promise<void> {
  mockStore.aquariums = mockStore.aquariums.filter((a) => a.id !== id);
}

export async function updateAlertThresholds(
  aquariumId: string,
  thresholds: AlertThresholds
): Promise<void> {
  const idx = mockStore.aquariums.findIndex((a) => a.id === aquariumId);
  if (idx >= 0) {
    mockStore.aquariums[idx].alertThresholds = thresholds;
  }
}

// ─── Events ─────────────────────────────────────────────────────────────────

export async function getEvents(
  aquariumId: string,
  limitCount = 100
): Promise<AquariumEvent[]> {
  return mockStore.events
    .filter((e) => e.aquariumId === aquariumId)
    .sort((a, b) => (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0))
    .slice(0, limitCount);
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
  const events = await getEvents(aquariumId);
  return events.find((e) => e.type === "parameter_reading") || null;
}

export async function addEvent(
  aquariumId: string,
  userId: string,
  data: Omit<AquariumEvent, "id" | "aquariumId" | "userId" | "timestamp">
): Promise<string> {
  const id = genId();
  mockStore.events.unshift({
    ...data,
    id,
    aquariumId,
    userId,
    timestamp: ts(0),
  } as AquariumEvent);
  return id;
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<AquariumEvent, "id" | "aquariumId" | "userId" | "timestamp">>
): Promise<void> {
  const idx = mockStore.events.findIndex((e) => e.id === id);
  if (idx >= 0) {
    mockStore.events[idx] = { ...mockStore.events[idx], ...data };
  }
}

export async function deleteEvent(id: string): Promise<void> {
  mockStore.events = mockStore.events.filter((e) => e.id !== id);
}

// ─── Analyses ───────────────────────────────────────────────────────────────

export async function getAnalyses(
  aquariumId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _limitCount = 10
): Promise<Analysis[]> {
  return mockStore.analyses.filter((a) => a.aquariumId === aquariumId);
}

export async function getLatestAnalysis(
  aquariumId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId?: string
): Promise<Analysis | null> {
  const list = await getAnalyses(aquariumId, _userId, 1);
  return list[0] || null;
}

// ─── AI Context ─────────────────────────────────────────────────────────────

let aiContext = "";

export async function getAIContext(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<string> {
  return aiContext;
}

export async function saveAIContext(_userId: string, ctx: string): Promise<void> {
  aiContext = ctx;
}

// ─── Batch delete ───────────────────────────────────────────────────────────

export async function deleteAquariumAndData(aquariumId: string): Promise<void> {
  mockStore.events = mockStore.events.filter((e) => e.aquariumId !== aquariumId);
  mockStore.analyses = mockStore.analyses.filter((a) => a.aquariumId !== aquariumId);
  mockStore.aquariums = mockStore.aquariums.filter((a) => a.id !== aquariumId);
}
