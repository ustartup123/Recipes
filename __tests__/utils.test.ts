import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatDateShort,
  toDateOrNull,
  formatFullTimestamp,
} from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "py-2")).toBe("px-2 py-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
});

describe("formatDate", () => {
  it("formats a date", () => {
    const date = new Date("2024-04-05T10:30:00");
    const result = formatDate(date);
    expect(result).toContain("Apr");
    expect(result).toContain("5");
  });
});

describe("formatDateShort", () => {
  it("formats a short date", () => {
    const date = new Date("2024-04-05T10:30:00");
    const result = formatDateShort(date);
    expect(result).toContain("Apr");
    expect(result).toContain("5");
  });
});

describe("toDateOrNull", () => {
  it("returns null for null/undefined", () => {
    expect(toDateOrNull(null)).toBeNull();
    expect(toDateOrNull(undefined)).toBeNull();
  });

  it("handles Firestore Timestamp (object with toDate)", () => {
    const fake = { toDate: () => new Date("2026-04-17T12:00:00Z") };
    const d = toDateOrNull(fake);
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe("2026-04-17T12:00:00.000Z");
  });

  it("returns null if toDate throws", () => {
    const bad = { toDate: () => { throw new Error("boom"); } };
    expect(toDateOrNull(bad)).toBeNull();
  });

  it("passes through Date instances", () => {
    const src = new Date("2026-04-17T10:00:00Z");
    expect(toDateOrNull(src)).toBe(src);
  });

  it("returns null for invalid Date", () => {
    expect(toDateOrNull(new Date("not a date"))).toBeNull();
  });

  it("handles plain-object Firestore shape { seconds, nanoseconds }", () => {
    const d = toDateOrNull({ seconds: 1745000000, nanoseconds: 500000000 });
    expect(d).toBeInstanceOf(Date);
    expect(d!.getTime()).toBe(1745000000 * 1000 + 500);
  });

  it("handles epoch milliseconds", () => {
    const ms = 1745000000000;
    expect(toDateOrNull(ms)!.getTime()).toBe(ms);
  });

  it("handles epoch seconds", () => {
    const s = 1745000000;
    expect(toDateOrNull(s)!.getTime()).toBe(s * 1000);
  });

  it("handles ISO string", () => {
    const d = toDateOrNull("2026-04-17T12:00:00Z");
    expect(d!.toISOString()).toBe("2026-04-17T12:00:00.000Z");
  });

  it("returns null for unparseable string", () => {
    expect(toDateOrNull("not a date at all")).toBeNull();
  });
});

describe("formatFullTimestamp", () => {
  it("returns fallback when timestamp is missing", () => {
    expect(formatFullTimestamp(null)).toBe("recently");
    expect(formatFullTimestamp(undefined)).toBe("recently");
  });

  it("respects a custom fallback", () => {
    expect(formatFullTimestamp(null, "Unknown")).toBe("Unknown");
  });

  it("formats a Firestore-like Timestamp to include date and time", () => {
    const fake = { toDate: () => new Date("2026-04-17T14:30:00") };
    const result = formatFullTimestamp(fake);
    expect(result).toContain("Apr");
    expect(result).toContain("17");
    expect(result).toContain("2026");
  });

  it("formats an ISO string", () => {
    const result = formatFullTimestamp("2026-04-17T14:30:00Z");
    expect(result).toContain("Apr");
    expect(result).toContain("17");
    expect(result).not.toBe("recently");
  });

  it("formats a { seconds, nanoseconds } Firestore-on-the-wire shape", () => {
    const seconds = Math.floor(new Date("2026-04-17T14:30:00Z").getTime() / 1000);
    const result = formatFullTimestamp({ seconds, nanoseconds: 0 });
    expect(result).toContain("Apr");
    expect(result).toContain("17");
    expect(result).not.toBe("recently");
  });
});
