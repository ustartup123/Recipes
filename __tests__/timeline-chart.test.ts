import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { fahrenheitToCelsius } from "@/lib/utils";
import { EVENT_TYPE_CONFIG, PARAMETER_COLORS } from "@/lib/types";
import type { AquariumEvent, EventType } from "@/lib/types";

// ─── Re-implement pure logic from timeline page for unit testing ────────────

const PARAM_SHORT: Record<string, string> = {
  ph: "pH", ammonia: "NH3", nitrite: "NO2", nitrate: "NO3",
  temperature: "Temp", gh: "GH", kh: "KH",
};

const PARAM_UNIT: Record<string, string> = {
  ph: "", ammonia: " ppm", nitrite: " ppm", nitrate: " ppm",
  temperature: "", gh: " dGH", kh: " dKH",
};

const EVENT_MARKER_LABELS: Record<string, string> = {
  water_change: "WC",
  fish_added: "+Fish",
  fish_died: "Died",
  dosing: "Dose",
  equipment: "Equip",
  observation: "Note",
  other: "•",
};

const PARAM_OPTIONS = ["ph", "ammonia", "nitrite", "nitrate", "temperature", "gh", "kh"];

function buildChartData(events: AquariumEvent[], tempUnit: "fahrenheit" | "celsius") {
  return events
    .filter((e) => e.type === "parameter_reading" && e.metadata)
    .reverse()
    .map((e) => {
      const date = e.timestamp?.toDate?.() || new Date();
      const row: Record<string, number> = { timestamp: date.getTime() };
      const meta = e.metadata!;
      for (const key of PARAM_OPTIONS) {
        const val = meta[key as keyof typeof meta] as number | undefined;
        if (val != null) {
          row[key] = key === "temperature" && tempUnit === "celsius"
            ? parseFloat(fahrenheitToCelsius(val).toFixed(1))
            : val;
        }
      }
      return row;
    });
}

function buildEventMarkers(events: AquariumEvent[]) {
  return events
    .filter((e) => e.type !== "parameter_reading")
    .map((e) => ({
      timestamp: e.timestamp?.toDate?.()?.getTime?.() || 0,
      type: e.type,
      title: e.title,
    }));
}

function toggleParam(prev: Set<string>, param: string): Set<string> {
  const next = new Set(prev);
  if (next.has(param)) {
    if (next.size > 1) next.delete(param);
  } else {
    next.add(param);
  }
  return next;
}

function formatChartTick(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<AquariumEvent>): AquariumEvent {
  return {
    id: "evt-1",
    aquariumId: "aq1",
    userId: "user1",
    timestamp: { toDate: () => new Date("2024-06-15T14:30:00Z") } as Timestamp,
    type: "parameter_reading",
    title: "Water Test",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("chart data construction", () => {
  it("converts parameter events to chart rows with numeric timestamp", () => {
    const events = [
      makeEvent({
        id: "e1",
        timestamp: { toDate: () => new Date("2024-06-15T10:00:00Z") } as Timestamp,
        metadata: { ph: 7.2, ammonia: 0.25 },
      }),
    ];
    const data = buildChartData(events, "fahrenheit");
    expect(data).toHaveLength(1);
    expect(data[0].timestamp).toBe(new Date("2024-06-15T10:00:00Z").getTime());
    expect(data[0].ph).toBe(7.2);
    expect(data[0].ammonia).toBe(0.25);
  });

  it("converts temperature to Celsius when unit is celsius", () => {
    const events = [
      makeEvent({ metadata: { temperature: 78 } }),
    ];
    const data = buildChartData(events, "celsius");
    expect(data[0].temperature).toBeCloseTo(fahrenheitToCelsius(78), 1);
  });

  it("keeps temperature in Fahrenheit when unit is fahrenheit", () => {
    const events = [
      makeEvent({ metadata: { temperature: 78 } }),
    ];
    const data = buildChartData(events, "fahrenheit");
    expect(data[0].temperature).toBe(78);
  });

  it("excludes non-parameter events", () => {
    const events = [
      makeEvent({ type: "water_change", title: "25% WC", metadata: { waterChangePercent: 25 } }),
      makeEvent({ type: "parameter_reading", metadata: { ph: 7.0 } }),
    ];
    const data = buildChartData(events, "fahrenheit");
    expect(data).toHaveLength(1);
    expect(data[0].ph).toBe(7.0);
  });

  it("reverses events for chronological order", () => {
    const events = [
      makeEvent({
        id: "e1",
        timestamp: { toDate: () => new Date("2024-06-16T10:00:00Z") } as Timestamp,
        metadata: { ph: 7.5 },
      }),
      makeEvent({
        id: "e2",
        timestamp: { toDate: () => new Date("2024-06-15T10:00:00Z") } as Timestamp,
        metadata: { ph: 7.0 },
      }),
    ];
    const data = buildChartData(events, "fahrenheit");
    expect(data[0].ph).toBe(7.0); // earlier event first
    expect(data[1].ph).toBe(7.5);
  });

  it("skips null/undefined metadata values", () => {
    const events = [
      makeEvent({ metadata: { ph: 7.0 } }),
    ];
    const data = buildChartData(events, "fahrenheit");
    expect(data[0].ph).toBe(7.0);
    expect(data[0].ammonia).toBeUndefined();
    expect(data[0].temperature).toBeUndefined();
  });
});

describe("event markers", () => {
  it("extracts non-parameter events as markers", () => {
    const events = [
      makeEvent({ type: "parameter_reading", metadata: { ph: 7.0 } }),
      makeEvent({
        id: "e2",
        type: "water_change",
        title: "25% WC",
        timestamp: { toDate: () => new Date("2024-06-15T12:00:00Z") } as Timestamp,
      }),
      makeEvent({
        id: "e3",
        type: "fish_died",
        title: "1x Neon Tetra died",
        timestamp: { toDate: () => new Date("2024-06-15T14:00:00Z") } as Timestamp,
      }),
    ];
    const markers = buildEventMarkers(events);
    expect(markers).toHaveLength(2);
    expect(markers[0].type).toBe("water_change");
    expect(markers[0].title).toBe("25% WC");
    expect(markers[1].type).toBe("fish_died");
  });

  it("returns empty array when only parameter events exist", () => {
    const events = [
      makeEvent({ type: "parameter_reading", metadata: { ph: 7.0 } }),
    ];
    expect(buildEventMarkers(events)).toHaveLength(0);
  });

  it("uses numeric timestamp for marker positioning", () => {
    const date = new Date("2024-06-15T12:00:00Z");
    const events = [
      makeEvent({
        type: "water_change",
        title: "WC",
        timestamp: { toDate: () => date } as Timestamp,
      }),
    ];
    const markers = buildEventMarkers(events);
    expect(markers[0].timestamp).toBe(date.getTime());
  });
});

describe("event marker labels", () => {
  it("has labels for all non-parameter event types", () => {
    const nonParamTypes: EventType[] = [
      "water_change", "fish_added", "fish_died",
      "dosing", "equipment", "observation", "other",
    ];
    for (const type of nonParamTypes) {
      expect(EVENT_MARKER_LABELS[type]).toBeTruthy();
    }
  });

  it("does not have a label for parameter_reading", () => {
    expect(EVENT_MARKER_LABELS["parameter_reading"]).toBeUndefined();
  });
});

describe("multi-parameter toggle", () => {
  it("adds a new parameter", () => {
    const result = toggleParam(new Set(["ph"]), "ammonia");
    expect(result.has("ph")).toBe(true);
    expect(result.has("ammonia")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("removes a parameter when multiple selected", () => {
    const result = toggleParam(new Set(["ph", "ammonia"]), "ph");
    expect(result.has("ph")).toBe(false);
    expect(result.has("ammonia")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("prevents removing the last parameter", () => {
    const result = toggleParam(new Set(["ph"]), "ph");
    expect(result.has("ph")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("can select all parameters", () => {
    let selected = new Set(["ph"]);
    for (const p of PARAM_OPTIONS.slice(1)) {
      selected = toggleParam(selected, p);
    }
    expect(selected.size).toBe(7);
  });

  it("toggling off and on returns to same state", () => {
    const initial = new Set(["ph", "ammonia"]);
    const afterOff = toggleParam(initial, "ammonia");
    const afterOn = toggleParam(afterOff, "ammonia");
    expect(afterOn).toEqual(initial);
  });
});

describe("chart tick formatting", () => {
  it("formats timestamp as short date", () => {
    const ts = new Date("2024-06-15T14:30:00Z").getTime();
    const result = formatChartTick(ts);
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });

  it("formats different months correctly", () => {
    const ts = new Date("2024-01-03T10:00:00Z").getTime();
    const result = formatChartTick(ts);
    expect(result).toContain("Jan");
  });
});

describe("parameter display constants", () => {
  it("PARAM_SHORT has all 7 parameters", () => {
    expect(Object.keys(PARAM_SHORT)).toHaveLength(7);
    expect(PARAM_SHORT.ph).toBe("pH");
    expect(PARAM_SHORT.ammonia).toBe("NH3");
    expect(PARAM_SHORT.temperature).toBe("Temp");
  });

  it("PARAM_UNIT has correct units", () => {
    expect(PARAM_UNIT.ammonia).toBe(" ppm");
    expect(PARAM_UNIT.ph).toBe("");
    expect(PARAM_UNIT.gh).toBe(" dGH");
  });

  it("every param option has a color defined", () => {
    for (const p of PARAM_OPTIONS) {
      expect(PARAMETER_COLORS[p]).toBeTruthy();
    }
  });

  it("every non-parameter event type has a config and marker label", () => {
    for (const type of Object.keys(EVENT_MARKER_LABELS)) {
      expect(EVENT_TYPE_CONFIG[type as EventType]).toBeTruthy();
    }
  });
});

describe("custom timestamp for events", () => {
  it("Date constructed from date+time strings is correct", () => {
    const dateStr = "2024-06-15";
    const timeStr = "14:30";
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(5); // June = 5
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
  });

  it("handles midnight correctly", () => {
    const date = new Date(2024, 0, 1, 0, 0);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });

  it("handles end of day correctly", () => {
    const date = new Date(2024, 0, 1, 23, 59);
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
  });
});
