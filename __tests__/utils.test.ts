import { describe, it, expect } from "vitest";
import {
  cn,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatTemp,
  formatVolume,
  gallonsToLiters,
  litersToGallons,
  checkParameterAlerts,
  getParameterStatus,
  formatDate,
  formatDateShort,
  toDateOrNull,
  formatAnalysisTimestamp,
} from "@/lib/utils";
import { DEFAULT_THRESHOLDS } from "@/lib/types";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "py-2")).toBe("px-2 py-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
});

describe("temperature conversion", () => {
  it("converts 0°C to 32°F", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });

  it("converts 100°C to 212°F", () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it("converts 32°F to 0°C", () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
  });

  it("round-trips correctly", () => {
    const original = 25;
    expect(fahrenheitToCelsius(celsiusToFahrenheit(original))).toBeCloseTo(original);
  });
});

describe("formatTemp", () => {
  it("formats in Fahrenheit", () => {
    expect(formatTemp(78, "fahrenheit")).toBe("78.0°F");
  });

  it("formats in Celsius", () => {
    expect(formatTemp(78, "celsius")).toContain("°C");
  });
});

describe("formatVolume", () => {
  it("formats gallons", () => {
    expect(formatVolume(55, "gallons")).toBe("55 gal");
  });

  it("formats liters", () => {
    expect(formatVolume(200, "liters")).toBe("200 L");
  });
});

describe("unit conversion", () => {
  it("gallons to liters", () => {
    expect(gallonsToLiters(1)).toBeCloseTo(3.785, 2);
  });

  it("liters to gallons", () => {
    expect(litersToGallons(3.78541)).toBeCloseTo(1, 2);
  });
});

describe("checkParameterAlerts", () => {
  it("returns empty for values in range", () => {
    const entry = { ph: 7.0, ammonia: 0, nitrite: 0, nitrate: 10, temperature: 78, gh: 8, kh: 5 };
    const alerts = checkParameterAlerts(entry, DEFAULT_THRESHOLDS);
    expect(Object.keys(alerts)).toHaveLength(0);
  });

  it("returns warning for out of range pH", () => {
    const entry = { ph: 8.0 };
    const alerts = checkParameterAlerts(entry, DEFAULT_THRESHOLDS);
    expect(alerts.ph).toBe("warning");
  });

  it("returns danger for high ammonia", () => {
    const entry = { ammonia: 1.0 };
    const alerts = checkParameterAlerts(entry, DEFAULT_THRESHOLDS);
    expect(alerts.ammonia).toBe("danger");
  });

  it("returns danger for high nitrite", () => {
    const entry = { nitrite: 2.0 };
    const alerts = checkParameterAlerts(entry, DEFAULT_THRESHOLDS);
    expect(alerts.nitrite).toBe("danger");
  });

  it("returns warning for moderate ammonia", () => {
    const entry = { ammonia: 0.3 };
    const alerts = checkParameterAlerts(entry, DEFAULT_THRESHOLDS);
    expect(alerts.ammonia).toBe("warning");
  });

  it("returns empty without thresholds", () => {
    const entry = { ph: 100 };
    const alerts = checkParameterAlerts(entry);
    expect(Object.keys(alerts)).toHaveLength(0);
  });

  it("skips undefined params", () => {
    const entry = { ph: undefined };
    const alerts = checkParameterAlerts(entry, DEFAULT_THRESHOLDS);
    expect(Object.keys(alerts)).toHaveLength(0);
  });
});

describe("getParameterStatus", () => {
  it("returns safe for in-range value", () => {
    expect(getParameterStatus(7.0, "ph", DEFAULT_THRESHOLDS)).toBe("safe");
  });

  it("returns warning for out-of-range pH", () => {
    expect(getParameterStatus(8.5, "ph", DEFAULT_THRESHOLDS)).toBe("warning");
  });

  it("returns danger for high ammonia", () => {
    expect(getParameterStatus(1.0, "ammonia", DEFAULT_THRESHOLDS)).toBe("danger");
  });

  it("returns unknown without thresholds", () => {
    expect(getParameterStatus(7.0, "ph")).toBe("unknown");
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
    // seconds → ms, plus half a second from nanoseconds
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

describe("formatAnalysisTimestamp", () => {
  it("returns fallback when timestamp is missing", () => {
    expect(formatAnalysisTimestamp(null)).toBe("recently");
    expect(formatAnalysisTimestamp(undefined)).toBe("recently");
  });

  it("respects a custom fallback", () => {
    expect(formatAnalysisTimestamp(null, "Unknown")).toBe("Unknown");
  });

  it("formats a Firestore-like Timestamp to include date and time", () => {
    const fake = { toDate: () => new Date("2026-04-17T14:30:00") };
    const result = formatAnalysisTimestamp(fake);
    // Should contain weekday, month, day, and time — never a raw "minutes"
    // count like "12345m".
    expect(result).toContain("Apr");
    expect(result).toContain("17");
    expect(result).toContain("2026");
    expect(result).not.toMatch(/^\d+m$/);
  });

  it("formats a plain Date the same way", () => {
    const result = formatAnalysisTimestamp(new Date("2026-04-17T14:30:00"));
    expect(result).toContain("Apr");
    expect(result).toContain("17");
  });

  it("formats an ISO string (e.g. JSON-serialized API response)", () => {
    // Regression for BUG-9: a fresh analysis returned from the API may be
    // serialized as an ISO string rather than a Firestore Timestamp. The
    // formatter must still produce a real date, not "recently".
    const result = formatAnalysisTimestamp("2026-04-17T14:30:00Z");
    expect(result).toContain("Apr");
    expect(result).toContain("17");
    expect(result).not.toBe("recently");
  });

  it("formats a { seconds, nanoseconds } Firestore-on-the-wire shape", () => {
    // Another BUG-9 regression: JSON-serialized Firestore Timestamps lose
    // their toDate() method but keep { seconds, nanoseconds }.
    const seconds = Math.floor(new Date("2026-04-17T14:30:00Z").getTime() / 1000);
    const result = formatAnalysisTimestamp({ seconds, nanoseconds: 0 });
    expect(result).toContain("Apr");
    expect(result).toContain("17");
    expect(result).not.toBe("recently");
  });
});
