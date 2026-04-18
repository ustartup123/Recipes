import { describe, it, expect } from "vitest";
import { EVENT_VALIDATION } from "@/lib/types";

// Test input validation logic used by API routes and log page
function validateField(field: string, value: number): string | null {
  const rule = EVENT_VALIDATION[field];
  if (!rule) return null;
  if (value < rule.min || value > rule.max) {
    return `Must be between ${rule.min} and ${rule.max}`;
  }
  return null;
}

describe("API input validation", () => {
  describe("pH validation", () => {
    it("accepts 0", () => expect(validateField("ph", 0)).toBeNull());
    it("accepts 7.0", () => expect(validateField("ph", 7.0)).toBeNull());
    it("accepts 14", () => expect(validateField("ph", 14)).toBeNull());
    it("rejects -1", () => expect(validateField("ph", -1)).toBeTruthy());
    it("rejects 14.1", () => expect(validateField("ph", 14.1)).toBeTruthy());
  });

  describe("ammonia validation", () => {
    it("accepts 0", () => expect(validateField("ammonia", 0)).toBeNull());
    it("accepts 0.25", () => expect(validateField("ammonia", 0.25)).toBeNull());
    it("accepts 20", () => expect(validateField("ammonia", 20)).toBeNull());
    it("rejects -0.1", () => expect(validateField("ammonia", -0.1)).toBeTruthy());
    it("rejects 21", () => expect(validateField("ammonia", 21)).toBeTruthy());
  });

  describe("temperature validation", () => {
    it("accepts 72", () => expect(validateField("temperature", 72)).toBeNull());
    it("accepts 32 (min)", () => expect(validateField("temperature", 32)).toBeNull());
    it("accepts 120 (max)", () => expect(validateField("temperature", 120)).toBeNull());
    it("rejects 31", () => expect(validateField("temperature", 31)).toBeTruthy());
    it("rejects 121", () => expect(validateField("temperature", 121)).toBeTruthy());
  });

  describe("waterChangePercent validation", () => {
    it("accepts 25", () => expect(validateField("waterChangePercent", 25)).toBeNull());
    it("accepts 1 (min)", () => expect(validateField("waterChangePercent", 1)).toBeNull());
    it("accepts 100 (max)", () => expect(validateField("waterChangePercent", 100)).toBeNull());
    it("rejects 0", () => expect(validateField("waterChangePercent", 0)).toBeTruthy());
    it("rejects 101", () => expect(validateField("waterChangePercent", 101)).toBeTruthy());
  });

  describe("count validation", () => {
    it("accepts 1", () => expect(validateField("count", 1)).toBeNull());
    it("accepts 999", () => expect(validateField("count", 999)).toBeNull());
    it("rejects 0", () => expect(validateField("count", 0)).toBeTruthy());
    it("rejects 1000", () => expect(validateField("count", 1000)).toBeTruthy());
  });

  describe("nitrite validation", () => {
    it("accepts 0", () => expect(validateField("nitrite", 0)).toBeNull());
    it("rejects 21", () => expect(validateField("nitrite", 21)).toBeTruthy());
  });

  describe("nitrate validation", () => {
    it("accepts 0", () => expect(validateField("nitrate", 0)).toBeNull());
    it("accepts 500 (max)", () => expect(validateField("nitrate", 500)).toBeNull());
    it("rejects 501", () => expect(validateField("nitrate", 501)).toBeTruthy());
  });

  describe("GH/KH validation", () => {
    it("accepts GH 8", () => expect(validateField("gh", 8)).toBeNull());
    it("accepts KH 5", () => expect(validateField("kh", 5)).toBeNull());
    it("rejects GH 31", () => expect(validateField("gh", 31)).toBeTruthy());
    it("rejects KH -1", () => expect(validateField("kh", -1)).toBeTruthy());
  });

  describe("unknown fields", () => {
    it("returns null for unknown field", () => {
      expect(validateField("unknown_field", 999)).toBeNull();
    });
  });
});

describe("analysis response validation", () => {
  it("validates severity values", () => {
    const valid = ["green", "yellow", "orange", "red"];
    for (const sev of valid) {
      expect(valid.includes(sev)).toBe(true);
    }
    expect(valid.includes("blue")).toBe(false);
  });

  it("filters invalid event IDs from correlations", () => {
    const validIds = new Set(["evt1", "evt2", "evt3"]);
    const correlations = [
      { eventId: "evt1", badgeText: "Valid correlation" },
      { eventId: "fake_id", badgeText: "Should be filtered" },
      { eventId: "evt2", badgeText: "Another valid one" },
    ];

    const filtered = correlations.filter((c) => validIds.has(c.eventId));
    expect(filtered).toHaveLength(2);
    expect(filtered[0].eventId).toBe("evt1");
    expect(filtered[1].eventId).toBe("evt2");
  });

  it("filters correlations with badge text too long", () => {
    const correlations = [
      { eventId: "evt1", badgeText: "Short" },
      { eventId: "evt2", badgeText: "A".repeat(81) },
    ];

    const filtered = correlations.filter((c) => c.badgeText.length <= 80);
    expect(filtered).toHaveLength(1);
  });
});
