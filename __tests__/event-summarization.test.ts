import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import type { AquariumEvent } from "@/lib/types";

// Re-implement the summarization logic for testing
// (same as in the API route, extracted for unit testing)
function summarizeEvent(event: AquariumEvent): string {
  const ts = event.timestamp?.toDate?.()
    ? event.timestamp.toDate().toISOString().split("T")[0]
    : "unknown date";
  const meta = event.metadata || {};

  if (event.type === "parameter_reading") {
    const parts: string[] = [];
    if (meta.ph != null) parts.push(`pH ${meta.ph}`);
    if (meta.ammonia != null) parts.push(`NH3 ${meta.ammonia}ppm`);
    if (meta.nitrite != null) parts.push(`NO2 ${meta.nitrite}ppm`);
    if (meta.nitrate != null) parts.push(`NO3 ${meta.nitrate}ppm`);
    if (meta.temperature != null) parts.push(`Temp ${meta.temperature}°F`);
    if (meta.gh != null) parts.push(`GH ${meta.gh}dGH`);
    if (meta.kh != null) parts.push(`KH ${meta.kh}dKH`);
    return `[${ts}] READING: ${parts.join(", ")}${event.details ? ` — ${event.details}` : ""}`;
  }

  const detail = event.title || event.type;
  const extras: string[] = [];
  if (meta.species) extras.push(`${meta.count || 1}x ${meta.species}`);
  if (meta.waterChangePercent) extras.push(`${meta.waterChangePercent}%`);
  if (meta.product) extras.push(meta.product);
  if (meta.amount) extras.push(meta.amount);
  const suffix = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `[${ts}] ${event.type.toUpperCase()}: ${detail}${suffix}`;
}

function makeEvent(overrides: Partial<AquariumEvent>): AquariumEvent {
  return {
    id: "test-id",
    aquariumId: "aq1",
    userId: "user1",
    timestamp: { toDate: () => new Date("2024-04-05T10:00:00Z") } as Timestamp,
    type: "parameter_reading",
    title: "Water Test",
    ...overrides,
  };
}

describe("event summarization (smart context)", () => {
  it("summarizes parameter_reading with full detail", () => {
    const event = makeEvent({
      type: "parameter_reading",
      metadata: { ph: 7.2, ammonia: 0.25, nitrite: 0, nitrate: 15, temperature: 78 },
    });
    const result = summarizeEvent(event);
    expect(result).toContain("READING");
    expect(result).toContain("pH 7.2");
    expect(result).toContain("NH3 0.25ppm");
    expect(result).toContain("Temp 78°F");
  });

  it("summarizes fish_added as one-line", () => {
    const event = makeEvent({
      type: "fish_added",
      title: "Added 4 Neon Tetras",
      metadata: { species: "Neon Tetra", count: 4, source: "PetSmart" },
    });
    const result = summarizeEvent(event);
    expect(result).toContain("FISH_ADDED");
    expect(result).toContain("4x Neon Tetra");
    expect(result).not.toContain("pH"); // No parameter detail
  });

  it("summarizes water_change with percentage", () => {
    const event = makeEvent({
      type: "water_change",
      title: "25% Water Change",
      metadata: { waterChangePercent: 25, conditionerUsed: "Seachem Prime" },
    });
    const result = summarizeEvent(event);
    expect(result).toContain("WATER_CHANGE");
    expect(result).toContain("25%");
  });

  it("summarizes dosing with product and amount", () => {
    const event = makeEvent({
      type: "dosing",
      title: "Seachem Prime",
      metadata: { product: "Seachem Prime", amount: "2ml" },
    });
    const result = summarizeEvent(event);
    expect(result).toContain("DOSING");
    expect(result).toContain("Seachem Prime");
    expect(result).toContain("2ml");
  });

  it("summarizes fish_died", () => {
    const event = makeEvent({
      type: "fish_died",
      title: "1 Neon Tetra died",
      metadata: { species: "Neon Tetra", count: 1 },
    });
    const result = summarizeEvent(event);
    expect(result).toContain("FISH_DIED");
    expect(result).toContain("1x Neon Tetra");
  });

  it("handles event with no metadata", () => {
    const event = makeEvent({
      type: "observation",
      title: "Fish acting lethargic",
    });
    const result = summarizeEvent(event);
    expect(result).toContain("OBSERVATION");
    expect(result).toContain("Fish acting lethargic");
  });

  it("includes details/notes for parameter readings", () => {
    const event = makeEvent({
      type: "parameter_reading",
      metadata: { ph: 7.0 },
      details: "Tested after water change",
    });
    const result = summarizeEvent(event);
    expect(result).toContain("Tested after water change");
  });

  it("handles missing timestamp gracefully", () => {
    const event = makeEvent({
      timestamp: {} as Timestamp,
    });
    const result = summarizeEvent(event);
    expect(result).toContain("unknown date");
  });
});
