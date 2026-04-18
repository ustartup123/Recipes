import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AlertThresholds, ParameterEntry, ParameterKey } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function formatTemp(f: number, unit: "fahrenheit" | "celsius"): string {
  if (unit === "celsius") {
    return `${fahrenheitToCelsius(f).toFixed(1)}°C`;
  }
  return `${f.toFixed(1)}°F`;
}

export function formatVolume(
  vol: number,
  unit: "gallons" | "liters"
): string {
  return `${vol} ${unit === "gallons" ? "gal" : "L"}`;
}

export function gallonsToLiters(g: number): number {
  return g * 3.78541;
}

export function litersToGallons(l: number): number {
  return l / 3.78541;
}

export function checkParameterAlerts(
  entry: Partial<ParameterEntry>,
  thresholds?: AlertThresholds
): Record<string, "danger" | "warning"> {
  if (!thresholds) return {};
  const alerts: Record<string, "danger" | "warning"> = {};

  const params: ParameterKey[] = ["ph", "ammonia", "nitrite", "nitrate", "temperature", "gh", "kh"];

  for (const param of params) {
    const val = entry[param] as number | undefined;
    const threshold = thresholds[param];
    if (val === undefined || val === null || !threshold) continue;

    if (val < threshold.min || val > threshold.max) {
      // Ammonia and nitrite are immediately dangerous
      if (param === "ammonia" && val > 0.5) {
        alerts[param] = "danger";
      } else if (param === "nitrite" && val > 1) {
        alerts[param] = "danger";
      } else {
        alerts[param] = "warning";
      }
    }
  }

  return alerts;
}

export function getParameterStatus(
  value: number,
  param: ParameterKey,
  thresholds?: AlertThresholds
): "safe" | "warning" | "danger" | "unknown" {
  if (!thresholds || !thresholds[param]) return "unknown";
  const { min, max } = thresholds[param]!;

  if (param === "ammonia" && value > 0.5) return "danger";
  if (param === "nitrite" && value > 1) return "danger";

  if (value < min || value > max) return "warning";
  return "safe";
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Normalize any timestamp-like value into a JavaScript Date.
 *
 * Handles Firestore Timestamps (with `.toDate()`), `Date` instances, ISO /
 * RFC-2822 strings, numeric epoch values (ms or seconds), and Firestore
 * plain-object timestamps shaped like `{ seconds, nanoseconds }` (which is
 * what a Firestore Timestamp becomes after JSON serialization over the wire).
 * Returns `null` for missing or unparseable values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDateOrNull(value: any): Date | null {
  if (value == null) return null;

  // Firestore Timestamp or similar object with toDate()
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Plain-object Firestore timestamp shape: { seconds, nanoseconds }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // Epoch number (ms or seconds)
  if (typeof value === "number") {
    // Treat small numbers (< year 2500 in ms) as ms; otherwise assume seconds.
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO string
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Format a timestamp-like value as a full, user-facing date+time, e.g.
 * "Fri, Apr 17, 2026, 11:35 AM". Falls back to "recently" if the value can't
 * be parsed into a real date.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatAnalysisTimestamp(value: any, fallback = "recently"): string {
  const d = toDateOrNull(value);
  if (!d) return fallback;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
