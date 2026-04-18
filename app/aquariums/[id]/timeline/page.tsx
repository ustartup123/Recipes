"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEvents, getLatestAnalysis, deleteEvent, getAquariums } from "@/lib/firestore";
import type { Aquarium, AquariumEvent, EventType, Analysis } from "@/lib/types";
import { EVENT_TYPE_CONFIG, SEVERITY_CONFIG, PARAMETER_COLORS } from "@/lib/types";
import { cn, formatTemp, fahrenheitToCelsius } from "@/lib/utils";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import {
  FlaskConical,
  Droplets,
  Fish,
  Skull,
  Pill,
  Wrench,
  Eye,
  MoreHorizontal,
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link2,
  RefreshCw,
  Filter,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const EVENT_ICONS: Record<string, React.ElementType> = {
  FlaskConical, Droplets, Fish, Skull, Pill, Wrench, Eye, MoreHorizontal,
};

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  CheckCircle, AlertTriangle, XCircle,
};

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

function ParamTooltip({ active, payload, label, tempUnit }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: number;
  tempUnit: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const date = new Date(label);
  return (
    <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
      <p style={{ color: "#94a3b8", marginBottom: 4 }}>
        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
        {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </p>
      {payload.map((entry) => {
        const unit = entry.dataKey === "temperature"
          ? (tempUnit === "celsius" ? " °C" : " °F")
          : PARAM_UNIT[entry.dataKey] || "";
        const val = typeof entry.value === "number"
          ? (Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1))
          : entry.value;
        return (
          <div key={entry.dataKey} style={{ color: entry.color, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
            <span>{PARAM_SHORT[entry.dataKey]}: {val}{unit}</span>
          </div>
        );
      })}
    </div>
  );
}

function groupByDate(events: AquariumEvent[]): Map<string, AquariumEvent[]> {
  const groups = new Map<string, AquariumEvent[]>();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const event of events) {
    const date = event.timestamp?.toDate?.() || new Date();
    let label: string;

    if (date.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(event);
  }
  return groups;
}

export default function TimelinePage() {
  const params = useParams();
  const aquariumId = params.id as string;
  const { user } = useAuth();
  const { tempUnit } = useUserPreferences();

  const [events, setEvents] = useState<AquariumEvent[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [aquariumName, setAquariumName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | "all">("all");
  const [loadMoreCount, setLoadMoreCount] = useState(100);

  useEffect(() => {
    if (!user || !aquariumId) return;
    async function load() {
      setLoading(true);
      try {
        const [evts, latest, aquariums] = await Promise.all([
          getEvents(aquariumId, loadMoreCount),
          getLatestAnalysis(aquariumId, user!.uid),
          getAquariums(user!.uid),
        ]);
        setEvents(evts);
        setAnalysis(latest);
        const aq = aquariums.find((a: Aquarium) => a.id === aquariumId);
        if (aq) setAquariumName(aq.name);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, aquariumId, loadMoreCount]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);

  // Chart data from parameter_reading events (numeric timestamp x-axis)
  const chartData = useMemo(() => {
    return events
      .filter((e) => e.type === "parameter_reading" && e.metadata)
      .reverse()
      .map((e) => {
        const date = e.timestamp?.toDate?.() || new Date();
        const row: Record<string, number> = { timestamp: date.getTime() };
        const meta = e.metadata!;
        for (const key of ["ph", "ammonia", "nitrite", "nitrate", "temperature", "gh", "kh"]) {
          const val = meta[key as keyof typeof meta] as number | undefined;
          if (val != null) {
            row[key] = key === "temperature" && tempUnit === "celsius"
              ? parseFloat(fahrenheitToCelsius(val).toFixed(1))
              : val;
          }
        }
        return row;
      });
  }, [events, tempUnit]);

  // Event markers for chart
  const eventMarkers = useMemo(() => {
    return events
      .filter((e) => e.type !== "parameter_reading")
      .map((e) => ({
        timestamp: e.timestamp?.toDate?.()?.getTime?.() || 0,
        type: e.type,
        title: e.title,
      }));
  }, [events]);

  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set(["ph"]));
  const [showEventMarkers, setShowEventMarkers] = useState(true);
  const paramOptions = ["ph", "ammonia", "nitrite", "nitrate", "temperature", "gh", "kh"];

  function toggleParam(param: string) {
    setSelectedParams((prev) => {
      const next = new Set(prev);
      if (next.has(param)) {
        if (next.size > 1) next.delete(param);
      } else {
        next.add(param);
      }
      return next;
    });
  }

  const formatChartTick = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent(eventId);
      setEvents(events.filter((e) => e.id !== eventId));
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  // Check if there are new events since last analysis
  const hasNewEventsSinceAnalysis = useMemo(() => {
    if (!analysis) return false;
    const analysisTime = analysis.timestamp?.toDate?.()?.getTime?.() || 0;
    return events.some((e) => {
      const eventTime = e.timestamp?.toDate?.()?.getTime?.() || 0;
      return eventTime > analysisTime;
    });
  }, [events, analysis]);

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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost p-2">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="section-title text-xl">Timeline</h1>
              {aquariumName && (
                <p className="text-sm text-slate-500 -mt-1">{aquariumName}</p>
              )}
            </div>
          </div>
          <Link
            href={`/aquariums/${aquariumId}/log`}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Entry
          </Link>
        </div>

        {/* AI Insight Summary */}
        {analysis ? (
          <div className={cn("card p-4 mb-6 border", SEVERITY_CONFIG[analysis.severity].colorClass)}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const SevIcon = SEVERITY_ICONS[SEVERITY_CONFIG[analysis.severity].icon];
                  return SevIcon ? <SevIcon className="h-4 w-4" /> : null;
                })()}
                <span className="text-sm font-bold">{SEVERITY_CONFIG[analysis.severity].label}</span>
              </div>
              {hasNewEventsSinceAnalysis && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  New data available
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 mt-2">{analysis.summary}</p>
            <div className="flex gap-2 mt-3">
              <Link
                href={`/aquariums/${aquariumId}/analysis`}
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
              >
                View Full Analysis →
              </Link>
              <Link
                href={`/aquariums/${aquariumId}/analysis`}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                Run New Analysis
              </Link>
            </div>
          </div>
        ) : (
          <div className="card p-4 mb-6 border border-slate-700">
            <p className="text-sm text-slate-400">
              Ready for your first analysis.{" "}
              <Link
                href={`/aquariums/${aquariumId}/analysis`}
                className="text-teal-400 hover:text-teal-300 transition-colors"
              >
                Run Analysis →
              </Link>
            </p>
          </div>
        )}

        {events.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No events yet"
            description="Log your first water test to start tracking."
            action={
              <Link
                href={`/aquariums/${aquariumId}/log`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Log First Event
              </Link>
            }
          />
        ) : (
          <>
            {/* Parameter Chart */}
            {chartData.length > 1 && (
              <div className="card p-4 mb-6">
                {/* Multi-select parameter pills */}
                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {paramOptions.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleParam(p)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                        selectedParams.has(p)
                          ? "bg-slate-700 text-slate-100"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      {selectedParams.has(p) && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: PARAMETER_COLORS[p] }}
                        />
                      )}
                      {PARAM_SHORT[p]}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowEventMarkers(!showEventMarkers)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap border",
                      showEventMarkers
                        ? "bg-slate-700/50 text-slate-300 border-slate-600"
                        : "text-slate-500 hover:text-slate-300 border-transparent"
                    )}
                  >
                    Events
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={formatChartTick}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    {/* Each selected param gets its own Y-axis for independent scaling */}
                    {paramOptions.filter((p) => selectedParams.has(p)).map((p, i) => (
                      <YAxis
                        key={p}
                        yAxisId={p}
                        orientation={i === 0 ? "left" : "right"}
                        hide={selectedParams.size > 1 || i > 0}
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={selectedParams.size === 1 ? 35 : 0}
                        domain={["auto", "auto"]}
                      />
                    ))}
                    <Tooltip content={<ParamTooltip tempUnit={tempUnit} />} />
                    {/* Parameter lines */}
                    {paramOptions.filter((p) => selectedParams.has(p)).map((p) => (
                      <Line
                        key={p}
                        yAxisId={p}
                        type="monotone"
                        dataKey={p}
                        stroke={PARAMETER_COLORS[p] || "#14b8a6"}
                        strokeWidth={2}
                        dot={{ r: 3, fill: PARAMETER_COLORS[p] || "#14b8a6" }}
                        connectNulls
                        activeDot={{ r: 5 }}
                      />
                    ))}
                    {/* Event markers as vertical reference lines */}
                    {showEventMarkers && eventMarkers.map((marker, i) => (
                      <ReferenceLine
                        key={`evt-${i}`}
                        x={marker.timestamp}
                        yAxisId={paramOptions.find((p) => selectedParams.has(p)) || "ph"}
                        stroke={EVENT_TYPE_CONFIG[marker.type]?.color || "#64748b"}
                        strokeDasharray="3 3"
                        strokeOpacity={0.6}
                        label={{
                          value: EVENT_MARKER_LABELS[marker.type] || "•",
                          position: "insideTopRight",
                          fill: EVENT_TYPE_CONFIG[marker.type]?.color || "#64748b",
                          fontSize: 9,
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                className="select text-xs py-1.5 w-auto"
                value={filter}
                onChange={(e) => setFilter(e.target.value as EventType | "all")}
              >
                <option value="all">All types</option>
                {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(
                  ([type, config]) => (
                    <option key={type} value={type}>{config.label}</option>
                  )
                )}
              </select>
            </div>

            {/* Event Timeline */}
            <div className="space-y-1">
              {Array.from(grouped.entries()).map(([dateLabel, dateEvents]) => (
                <div key={dateLabel}>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider py-2 mt-2">
                    {dateLabel}
                  </div>
                  <div className="space-y-1">
                    {dateEvents.map((event) => {
                      const config = EVENT_TYPE_CONFIG[event.type];
                      const Icon = EVENT_ICONS[config.icon];
                      const time = event.timestamp?.toDate?.()
                        ? event.timestamp.toDate().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                        : "";

                      return (
                        <div key={event.id} className="card p-3 group">
                          <div className="flex items-start gap-3">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border", config.bgClass)}>
                              {Icon && <Icon className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-200">{event.title}</span>
                                <span className="text-xs text-slate-600">{time}</span>
                              </div>

                              {/* Parameter details for readings */}
                              {event.type === "parameter_reading" && event.metadata && (
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  {event.metadata.ph != null && <span className="text-xs text-slate-400">pH {event.metadata.ph}</span>}
                                  {event.metadata.ammonia != null && <span className="text-xs text-slate-400">NH3 {event.metadata.ammonia}</span>}
                                  {event.metadata.nitrite != null && <span className="text-xs text-slate-400">NO2 {event.metadata.nitrite}</span>}
                                  {event.metadata.nitrate != null && <span className="text-xs text-slate-400">NO3 {event.metadata.nitrate}</span>}
                                  {event.metadata.temperature != null && <span className="text-xs text-slate-400">{formatTemp(event.metadata.temperature, tempUnit)}</span>}
                                  {event.metadata.gh != null && <span className="text-xs text-slate-400">GH {event.metadata.gh}</span>}
                                  {event.metadata.kh != null && <span className="text-xs text-slate-400">KH {event.metadata.kh}</span>}
                                </div>
                              )}

                              {/* Event details for non-readings */}
                              {event.type !== "parameter_reading" && event.metadata && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {event.metadata.species && `${event.metadata.count || 1}x ${event.metadata.species}`}
                                  {event.metadata.species && event.metadata.source && ` · From ${event.metadata.source}`}
                                  {event.metadata.waterChangePercent && `${event.metadata.waterChangePercent}%`}
                                  {event.metadata.conditionerUsed && ` · ${event.metadata.conditionerUsed}`}
                                  {event.metadata.product && event.metadata.product}
                                  {event.metadata.amount && ` · ${event.metadata.amount}`}
                                </div>
                              )}

                              {event.details && (
                                <p className="text-xs text-slate-500 mt-1">{event.details}</p>
                              )}

                              {/* AI Correlation Badge */}
                              {event.aiCorrelation && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Link2 className="h-3 w-3 text-teal-500" />
                                  <span className="text-xs text-teal-400">{event.aiCorrelation}</span>
                                </div>
                              )}
                            </div>

                            {/* Delete (shown on hover) */}
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all cursor-pointer"
                              aria-label="Delete event"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {events.length >= loadMoreCount && (
              <button
                onClick={() => setLoadMoreCount(loadMoreCount + 100)}
                className="btn-secondary w-full mt-4 text-sm"
              >
                Load More Events
              </button>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
