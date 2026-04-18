"use client";
import { cn } from "@/lib/utils";
import type { AlertThresholds, ParameterKey } from "@/lib/types";
import { getParameterStatus } from "@/lib/utils";

interface ParameterBadgeProps {
  param: ParameterKey;
  value: number;
  thresholds?: AlertThresholds;
  unit?: string;
  label?: string;
  showLabel?: boolean;
}

export function ParameterBadge({
  param,
  value,
  thresholds,
  unit,
  label,
  showLabel = true,
}: ParameterBadgeProps) {
  const status = getParameterStatus(value, param, thresholds);

  const statusClass = {
    safe: "badge-safe",
    warning: "badge-warning",
    danger: "badge-danger",
    unknown: "badge-unknown",
  }[status];

  const dot = {
    safe: "bg-emerald-400",
    warning: "bg-yellow-400",
    danger: "bg-red-400 animate-pulse",
    unknown: "bg-slate-500",
  }[status];

  return (
    <span className={cn(statusClass, status === "danger" && "glow-danger-pulse")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {showLabel && label && <span className="text-xs opacity-70">{label}</span>}
      <span className="font-mono font-semibold">
        {value.toFixed(param === "temperature" ? 1 : 2)}
        {unit && <span className="font-normal opacity-70 ml-0.5">{unit}</span>}
      </span>
    </span>
  );
}
