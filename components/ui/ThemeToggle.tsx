"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const SEGMENTS: ReadonlyArray<{
  mode: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { mode: "light", label: "בהיר", icon: Sun },
  { mode: "dark", label: "כהה", icon: Moon },
  { mode: "auto", label: "אוטומטי", icon: Monitor },
];

export function ThemeToggle() {
  const { mode, setMode, isAutoSupported } = useTheme();
  const segments = isAutoSupported ? SEGMENTS : SEGMENTS.filter((s) => s.mode !== "auto");

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Logical-next / logical-prev navigation. Browser handles RTL flip
    // automatically via dir="rtl" on <html>; ArrowRight/ArrowLeft are
    // mapped to logical next/prev (NOT visual next/prev).
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = segments.findIndex((s) => s.mode === mode);
    if (idx === -1) {
      setMode(segments[0].mode);
      return;
    }
    const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const direction = e.key === "ArrowRight" ? 1 : -1;
    // In RTL, ArrowRight moves to the visually-left (i.e. previous in source order),
    // so flip the increment to keep "ArrowRight = next-logical".
    const step = isRtl ? -direction : direction;
    const nextIdx = (idx + step + segments.length) % segments.length;
    setMode(segments[nextIdx].mode);
  }

  return (
    <div
      role="radiogroup"
      aria-label="ערכת נושא"
      onKeyDown={handleKeyDown}
      className="inline-flex items-center gap-1 bg-surface-200 p-1 rounded-full border border-surface-300"
    >
      {segments.map(({ mode: segMode, label, icon: Icon }) => {
        const isActive = mode === segMode;
        return (
          <button
            key={segMode}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setMode(segMode)}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium",
              "transition-all duration-150 cursor-pointer min-h-[44px]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              isActive
                ? "bg-ink-900 text-surface-100 shadow-soft"
                : "text-ink-700 hover:text-ink-900 hover:bg-surface-50",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
