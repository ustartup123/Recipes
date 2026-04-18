"use client";

import Link from "next/link";
import { AlertTriangle, Trash2, Edit, Fish, ClipboardList, BarChart3, Sparkles, Bot } from "lucide-react";
import type { Aquarium, ParameterEntry } from "@/lib/types";
import { PARAMETER_LABELS, PARAMETER_UNITS, DEFAULT_THRESHOLDS } from "@/lib/types";
import { checkParameterAlerts, formatTemp, formatVolume } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/context/UserPreferencesContext";

interface AquariumCardProps {
  aquarium: Aquarium;
  latestParams?: ParameterEntry | null;
  onEdit: (a: Aquarium) => void;
  onDelete: (a: Aquarium) => void;
}

const typeLabel: Record<string, string> = {
  freshwater: "Freshwater",
  planted: "Planted",
  brackish: "Brackish",
  marine: "Marine",
  reef: "Reef",
};

const typeColor: Record<string, string> = {
  freshwater: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  planted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  brackish: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  marine: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  reef: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export function AquariumCard({ aquarium, latestParams, onEdit, onDelete }: AquariumCardProps) {
  const { tempUnit } = useUserPreferences();
  const thresholds = aquarium.alertThresholds || DEFAULT_THRESHOLDS;
  const alerts = latestParams ? checkParameterAlerts(latestParams, thresholds) : {};
  const alertCount = Object.keys(alerts).length;
  const hasDanger = Object.values(alerts).includes("danger");

  const keyParams = ["ph", "ammonia", "nitrite", "nitrate"] as const;

  return (
    <div className={cn(
      "card group relative overflow-hidden transition-all duration-200",
      "hover:border-slate-700",
      hasDanger && "border-red-500/30 glow-danger-pulse"
    )}>
      {/* Top accent */}
      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-teal-400/30 to-transparent" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                typeColor[aquarium.type]
              )}>
                {typeLabel[aquarium.type]}
              </span>
              {alertCount > 0 && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                  hasDanger
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                )}>
                  <AlertTriangle className="h-3 w-3" />
                  {alertCount} alert{alertCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <Link href={`/aquariums/${aquarium.id}/timeline`} className="hover:text-teal-400 transition-colors">
              <h3 className="font-bold font-mono text-slate-100 text-lg leading-tight truncate">
                {aquarium.name}
              </h3>
            </Link>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatVolume(aquarium.volume, aquarium.volumeUnit)}
            </p>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(aquarium)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              aria-label="Edit aquarium"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(aquarium)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
              aria-label="Delete aquarium"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Latest params */}
        {latestParams ? (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {keyParams.map((param) => {
              const val = latestParams[param];
              if (val === undefined || val === null) return null;
              const alert = alerts[param];
              return (
                <div
                  key={param}
                  className={cn(
                    "bg-slate-800/60 rounded-lg px-3 py-2 border",
                    alert === "danger"
                      ? "border-red-500/30 bg-red-500/5"
                      : alert === "warning"
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-slate-700/50"
                  )}
                >
                  <div className="text-xs text-slate-500 mb-0.5">{PARAMETER_LABELS[param]}</div>
                  <div className={cn(
                    "font-mono font-bold text-sm",
                    alert === "danger" ? "text-red-400" :
                    alert === "warning" ? "text-yellow-400" :
                    "text-slate-200"
                  )}>
                    {(val as number).toFixed(2)}
                    <span className="text-xs font-normal text-slate-500 ml-0.5">
                      {PARAMETER_UNITS[param]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-3 mb-4 text-slate-600 text-sm">
            <Fish className="h-4 w-4" />
            <span>No parameter readings yet</span>
          </div>
        )}

        {/* Temperature inline */}
        {latestParams?.temperature && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <span className="font-mono text-slate-400">
              🌡 {formatTemp(latestParams.temperature, tempUnit)}
            </span>
            {latestParams.gh && (
              <span className="font-mono text-slate-400">
                · GH {latestParams.gh.toFixed(1)} dGH
              </span>
            )}
            {latestParams.kh && (
              <span className="font-mono text-slate-400">
                · KH {latestParams.kh.toFixed(1)} dKH
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <Link
            href={`/aquariums/${aquarium.id}/log`}
            className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Log
          </Link>
          <Link
            href={`/aquariums/${aquarium.id}/timeline`}
            className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Timeline
          </Link>
          <Link
            href={`/aquariums/${aquarium.id}/analysis`}
            className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Analyze
          </Link>
          <Link
            href="/advisor"
            className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <Bot className="h-3.5 w-3.5" />
            Ask AI
          </Link>
        </div>
      </div>
    </div>
  );
}
