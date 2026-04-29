"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "recipes:theme-mode";
const VALID_MODES: readonly ThemeMode[] = ["light", "dark", "auto"] as const;

function isValidMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (VALID_MODES as readonly string[]).includes(value);
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isValidMode(raw)) return raw;
    if (raw && !isValidMode(raw)) {
      // Corrupt value — overwrite back to default.
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private mode or storage disabled — fall back to in-memory default.
  }
  return "auto";
}

function persistMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch (err) {
    console.warn("[theme] failed to persist mode to localStorage", err);
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return systemPrefersDark() ? "dark" : "light";
}

function applyClass(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark");
    html.style.colorScheme = "dark";
  } else {
    html.classList.remove("dark");
    html.style.colorScheme = "light";
  }
}

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (next: ThemeMode) => void;
  isAutoSupported: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(readStoredMode()));
  const [isAutoSupported, setIsAutoSupported] = useState(true);

  // Apply class on mount (covers any case the inline FOUC script missed).
  useEffect(() => {
    applyClass(resolvedTheme);
  }, [resolvedTheme]);

  // matchMedia subscription for "auto" mode.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsAutoSupported(false);
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "auto") {
        setResolvedTheme(mql.matches ? "dark" : "light");
      }
    };
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    // Older Safari fallback.
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [mode]);

  // Multi-tab sync via storage events.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.storageArea !== window.localStorage) return;
      const next = isValidMode(e.newValue) ? e.newValue : "auto";
      setModeState(next);
      setResolvedTheme(resolve(next));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    if (!isValidMode(next)) {
      console.warn("[theme] invalid mode requested:", next);
      return;
    }
    setModeState(next);
    setResolvedTheme(resolve(next));
    persistMode(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode, isAutoSupported }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const __theme_internals = { STORAGE_KEY, isValidMode, resolve, readStoredMode };
