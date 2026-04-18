"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getAnalyses, getEvents } from "@/lib/firestore";
import type { Analysis, AquariumEvent } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/lib/types";
import { cn, formatAnalysisTimestamp, toDateOrNull } from "@/lib/utils";
import {
  ArrowLeft,
  Bot,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Droplets,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  CheckCircle, AlertTriangle, XCircle,
};

export default function AnalysisPage() {
  const params = useParams();
  const aquariumId = params.id as string;
  const { user } = useAuth();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [events, setEvents] = useState<AquariumEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !aquariumId) return;
    async function load() {
      setLoading(true);
      try {
        const [anls, evts] = await Promise.all([
          getAnalyses(aquariumId, user!.uid),
          getEvents(aquariumId, 5), // Just need to know if events exist and last timestamp
        ]);
        setAnalyses(anls);
        setEvents(evts);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, aquariumId]);

  const latest = analyses[0] || null;
  const previousAnalyses = analyses.slice(1);

  const hasNewEventsSinceAnalysis = latest && events.length > 0 && (() => {
    const analysisTime = toDateOrNull(latest.timestamp)?.getTime() || 0;
    return events.some((e) => {
      const eventTime = toDateOrNull(e.timestamp)?.getTime() || 0;
      return eventTime > analysisTime;
    });
  })();

  async function runAnalysis() {
    if (!user || analyzing) return;
    setAnalyzing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ aquariumId }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429) {
          toast.error(data.error || "Daily limit reached");
        } else {
          toast.error(data.error || "Analysis failed. Try again.");
        }
        return;
      }

      const result = await res.json();
      // Prepend new analysis
      setAnalyses([result as Analysis, ...analyses]);
      toast.success("Analysis complete!");
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Analysis failed. Check your connection.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/aquariums/${aquariumId}/timeline`} className="btn-ghost p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="section-title text-xl">Analysis</h1>
        </div>

        {/* Latest Analysis or Empty State */}
        {latest ? (
          <div className="space-y-4 mb-6">
            {/* Severity Banner */}
            <div className={cn("rounded-xl p-1 border", SEVERITY_CONFIG[latest.severity].colorClass)}>
              <div className="flex items-center gap-2 px-3 py-2">
                {(() => {
                  const SevIcon = SEVERITY_ICONS[SEVERITY_CONFIG[latest.severity].icon];
                  return SevIcon ? <SevIcon className="h-5 w-5" /> : null;
                })()}
                <span className="font-bold text-sm tracking-wide">
                  {SEVERITY_CONFIG[latest.severity].label}
                </span>
              </div>
            </div>

            {/* Analysis Content */}
            <div className="card p-5">
              <p className="text-sm text-slate-200 leading-relaxed">{latest.summary}</p>

              {latest.recommendations?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Recommendations
                  </h3>
                  <ul className="space-y-1.5">
                    {latest.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-teal-500 mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action buttons based on recommendations */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <Link
                  href={`/advisor?aquariumId=${aquariumId}&analysisId=${latest.id}`}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Discuss with AI
                </Link>
                {latest.recommendations?.some((r) =>
                  r.toLowerCase().includes("water change")
                ) && (
                  <Link
                    href={`/aquariums/${aquariumId}/log?type=water_change`}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    Log Water Change
                  </Link>
                )}
                {latest.recommendations?.some((r) =>
                  r.toLowerCase().includes("retest") || r.toLowerCase().includes("test")
                ) && (
                  <Link
                    href={`/aquariums/${aquariumId}/log?type=parameter_reading`}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    Log Retest
                  </Link>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-600">
                <span>
                  Analyzed {formatAnalysisTimestamp(latest.timestamp)}
                </span>
                <span>·</span>
                <span>{latest.eventCount} events · {latest.daysCovered} days of data</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center mb-6">
            <Bot className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-200 mb-2">Ready to analyze your tank</h2>
            <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
              I&apos;ll look at your events and parameter trends to find patterns and give recommendations.
            </p>
          </div>
        )}

        {/* Run Analysis Button */}
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-6"
        >
          {analyzing ? (
            <>
              <LoadingSpinner className="h-4 w-4" />
              Analyzing your tank...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              {latest ? "Run New Analysis" : "Run First Analysis"}
            </>
          )}
        </button>

        {hasNewEventsSinceAnalysis && (
          <p className="text-xs text-center text-slate-500 -mt-4 mb-6">
            New events logged since last analysis
          </p>
        )}

        {/* Loading shimmer during analysis */}
        {analyzing && (
          <div className="card p-5 mb-6 space-y-3">
            <div className="shimmer h-8 rounded-lg" />
            <div className="shimmer h-4 rounded w-3/4" />
            <div className="shimmer h-4 rounded w-1/2" />
            <div className="shimmer h-4 rounded w-2/3" />
          </div>
        )}

        {/* Previous Analyses */}
        {previousAnalyses.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Previous Analyses
            </h3>
            <div className="space-y-1">
              {previousAnalyses.map((a) => {
                const sevConfig = SEVERITY_CONFIG[a.severity];
                const SevIcon = SEVERITY_ICONS[sevConfig.icon];
                const expanded = expandedId === a.id;
                const date = formatAnalysisTimestamp(a.timestamp, "Unknown");

                return (
                  <div key={a.id} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedId(expanded ? null : a.id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {SevIcon && <SevIcon className={cn("h-4 w-4", sevConfig.colorClass.includes("emerald") ? "text-emerald-400" : sevConfig.colorClass.includes("yellow") ? "text-yellow-400" : sevConfig.colorClass.includes("orange") ? "text-orange-400" : "text-red-400")} />}
                        <span className="text-sm text-slate-300">{date}</span>
                        <span className="text-xs text-slate-500">{sevConfig.label}</span>
                      </div>
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                    {expanded && (
                      <div className="p-3 pt-0 border-t border-slate-800">
                        <p className="text-sm text-slate-300 mb-2">{a.summary}</p>
                        {a.recommendations?.length > 0 && (
                          <ul className="space-y-1">
                            {a.recommendations.map((rec, i) => (
                              <li key={i} className="text-xs text-slate-400">• {rec}</li>
                            ))}
                          </ul>
                        )}
                        <Link
                          href={`/advisor?aquariumId=${aquariumId}&analysisId=${a.id}`}
                          className="btn-ghost text-xs flex items-center gap-1.5 mt-3 w-fit"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Discuss with AI
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
