import { describe, it, expect } from "vitest";
import {
  EVENT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  EVENT_VALIDATION,
  DEFAULT_THRESHOLDS,
  PARAMETER_LABELS,
  PARAMETER_UNITS,
  PARAMETER_COLORS,
} from "@/lib/types";

describe("EVENT_TYPE_CONFIG", () => {
  it("has all 8 event types", () => {
    const types = Object.keys(EVENT_TYPE_CONFIG);
    expect(types).toHaveLength(8);
    expect(types).toContain("parameter_reading");
    expect(types).toContain("water_change");
    expect(types).toContain("fish_added");
    expect(types).toContain("fish_died");
    expect(types).toContain("dosing");
    expect(types).toContain("equipment");
    expect(types).toContain("observation");
    expect(types).toContain("other");
  });

  it("every config has label, icon, color, bgClass", () => {
    for (const [type, config] of Object.entries(EVENT_TYPE_CONFIG)) {
      expect(config.label, `${type}.label`).toBeTruthy();
      expect(config.icon, `${type}.icon`).toBeTruthy();
      expect(config.color, `${type}.color`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(config.bgClass, `${type}.bgClass`).toBeTruthy();
    }
  });
});

describe("SEVERITY_CONFIG", () => {
  it("has all 4 severities", () => {
    expect(Object.keys(SEVERITY_CONFIG)).toEqual(["green", "yellow", "orange", "red"]);
  });

  it("each severity has label, icon, colorClass", () => {
    for (const [sev, config] of Object.entries(SEVERITY_CONFIG)) {
      expect(config.label, `${sev}.label`).toBeTruthy();
      expect(config.icon, `${sev}.icon`).toBeTruthy();
      expect(config.colorClass, `${sev}.colorClass`).toBeTruthy();
    }
  });
});

describe("EVENT_VALIDATION", () => {
  it("pH range is 0-14", () => {
    expect(EVENT_VALIDATION.ph).toEqual({ min: 0, max: 14 });
  });

  it("ammonia range is 0-20", () => {
    expect(EVENT_VALIDATION.ammonia).toEqual({ min: 0, max: 20 });
  });

  it("temperature range is 32-120", () => {
    expect(EVENT_VALIDATION.temperature).toEqual({ min: 32, max: 120 });
  });

  it("waterChangePercent range is 1-100", () => {
    expect(EVENT_VALIDATION.waterChangePercent).toEqual({ min: 1, max: 100 });
  });

  it("count range is 1-999", () => {
    expect(EVENT_VALIDATION.count).toEqual({ min: 1, max: 999 });
  });
});

describe("DEFAULT_THRESHOLDS", () => {
  it("has all 7 parameters", () => {
    expect(Object.keys(DEFAULT_THRESHOLDS)).toHaveLength(7);
  });

  it("ammonia max is 0.25", () => {
    expect(DEFAULT_THRESHOLDS.ammonia?.max).toBe(0.25);
  });
});

describe("PARAMETER constants", () => {
  it("LABELS has all 7 parameters", () => {
    expect(Object.keys(PARAMETER_LABELS)).toHaveLength(7);
  });

  it("UNITS has all 7 parameters", () => {
    expect(Object.keys(PARAMETER_UNITS)).toHaveLength(7);
    expect(PARAMETER_UNITS.ammonia).toBe("ppm");
  });

  it("COLORS has all 7 parameters", () => {
    expect(Object.keys(PARAMETER_COLORS)).toHaveLength(7);
  });
});
