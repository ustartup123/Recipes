"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { AquariumForm } from "@/components/aquariums/AquariumForm";
import { Sparkline } from "@/components/parameters/Sparkline";
import {
  getAquariums,
  getEvents,
  getLatestParameterEvent,
  createAquarium,
  updateAquarium,
  deleteAquariumAndData,
} from "@/lib/firestore";
import type { Aquarium, AquariumEvent, ParameterEntry } from "@/lib/types";
import {
  PARAMETER_LABELS,
  PARAMETER_UNITS,
  DEFAULT_THRESHOLDS,
  EVENT_TYPE_CONFIG,
} from "@/lib/types";
import {
  checkParameterAlerts,
  formatTemp,
  formatVolume,
  cn,
} from "@/lib/utils";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  Bot,
  FlaskConical,
  Droplets,
  Fish,
  Skull,
  Pill,
  ClipboardList,
  BarChart3,
  Sparkles,
  Edit,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const EVENT_ICONS: Record<string, React.ElementType> = {
  FlaskConical, Droplets, Fish, Skull, Pill,
};

interface AquariumDashData {
  aquarium: Aquarium;
  latestParams: AquariumEvent | null;
  recentEvents: AquariumEvent[];
  paramHistory: AquariumEvent[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { tempUnit } = useUserPreferences();
  const [data, setData] = useState<AquariumDashData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Aquarium | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Aquarium | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      const aquariums = await getAquariums(user.uid);
      const enriched = await Promise.all(
        aquariums.map(async (aq) => {
          try {
            const [latestParams, allEvents] = await Promise.all([
              getLatestParameterEvent(aq.id),
              getEvents(aq.id, 30),
            ]);
            const recentEvents = allEvents.slice(0, 3);
            const paramHistory = allEvents.filter((e) => e.type === "parameter_reading");
            return {
              aquarium: aq,
              latestParams,
              recentEvents,
              paramHistory,
            };
          } catch (err) {
            console.error(`Failed to load data for tank "${aq.name}":`, err);
            return {
              aquarium: aq,
              latestParams: null,
              recentEvents: [] as AquariumEvent[],
              paramHistory: [] as AquariumEvent[],
            };
          }
        })
      );
      setData(enriched);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  async function handleCreate(formData: Omit<Aquarium, "id" | "userId" | "createdAt" | "updatedAt">) {
    if (!user) return;
    try {
      await createAquarium(user.uid, formData);
      toast.success("Aquarium created!");
      setShowCreate(false);
      loadData();
    } catch (err) {
      console.error("Failed to create aquarium:", err);
      toast.error("Failed to create aquarium. Please try again.");
    }
  }

  async function handleEdit(formData: Omit<Aquarium, "id" | "userId" | "createdAt" | "updatedAt">) {
    if (!editTarget) return;
    try {
      await updateAquarium(editTarget.id, formData);
      toast.success("Aquarium updated!");
      setEditTarget(null);
      loadData();
    } catch (err) {
      console.error("Failed to update aquarium:", err);
      toast.error("Failed to update aquarium. Please try again.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAquariumAndData(deleteTarget.id);
      toast.success("Aquarium deleted");
      setDeleteTarget(null);
      loadData();
    } finally {
      setDeleting(false);
    }
  }

  const totalAlerts = data.reduce((sum, d) => {
    if (!d.latestParams?.metadata) return sum;
    const thresholds = d.aquarium.alertThresholds || DEFAULT_THRESHOLDS;
    return sum + Object.keys(checkParameterAlerts(d.latestParams.metadata as Partial<ParameterEntry>, thresholds)).length;
  }, 0);

  const tanksWithAlerts = data.filter((d) => {
    if (!d.latestParams?.metadata) return false;
    const thresholds = d.aquarium.alertThresholds || DEFAULT_THRESHOLDS;
    return Object.keys(checkParameterAlerts(d.latestParams.metadata as Partial<ParameterEntry>, thresholds)).length > 0;
  }).length;

  // Per-tank quick-add: generate href for a specific tank
  function quickAddHref(tankId: string, type: string): string {
    return `/aquariums/${tankId}/log?type=${type}`;
  }

  return (
    <AppShell>
      {/* Welcome header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title text-2xl">
            Welcome back, {user?.displayName?.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Tank</span>
        </button>
      </div>

      {/* Summary stats */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tanks</div>
            <div className="text-3xl font-bold font-mono text-slate-100">{data.length}</div>
          </div>
          <div className={cn("card p-4", totalAlerts > 0 && "border-yellow-500/20 bg-yellow-500/5")}>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Alerts</div>
            <div className={cn("text-3xl font-bold font-mono", totalAlerts > 0 ? "text-yellow-400" : "text-emerald-400")}>
              {totalAlerts}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Healthy</div>
            <div className="text-3xl font-bold font-mono text-emerald-400">
              {data.length - tanksWithAlerts}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Total Events</div>
            <div className="text-3xl font-bold font-mono text-slate-100">
              {data.reduce((s, d) => {
                return s + d.paramHistory.length + d.recentEvents.filter((e) => e.type !== "parameter_reading").length;
              }, 0)}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Fish}
          title="No aquariums yet"
          description="Add your first tank to start tracking water parameters and get AI-powered insights."
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Tank
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map(({ aquarium, latestParams, recentEvents, paramHistory }) => {
            const thresholds = aquarium.alertThresholds || DEFAULT_THRESHOLDS;
            const latest = latestParams?.metadata || {};
            const alerts = checkParameterAlerts(latest as Partial<ParameterEntry>, thresholds);
            const alertCount = Object.keys(alerts).length;
            const hasDanger = Object.values(alerts).includes("danger");
            const hasWarning = Object.values(alerts).includes("warning");

            const typeColors: Record<string, string> = {
              freshwater: "text-blue-400 bg-blue-500/10 border-blue-500/20",
              planted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              brackish: "text-amber-400 bg-amber-500/10 border-amber-500/20",
              marine: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
              reef: "text-purple-400 bg-purple-500/10 border-purple-500/20",
            };

            // Convert param events to ParameterEntry-like for sparklines
            const sparklineData = paramHistory.map((e) => ({
              id: e.id,
              aquariumId: e.aquariumId,
              userId: e.userId,
              timestamp: e.timestamp,
              ...(e.metadata || {}),
            })) as ParameterEntry[];

            return (
              <div
                key={aquarium.id}
                className={cn(
                  "card overflow-hidden transition-all duration-200",
                  hasDanger && "border-red-500/30",
                  hasWarning && !hasDanger && "border-yellow-500/20"
                )}
              >
                <div className="h-0.5 bg-gradient-to-r from-teal-500/40 via-teal-400/20 to-transparent" />

                <div className="p-5">
                  {/* Tank header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", typeColors[aquarium.type] || typeColors.freshwater)}>
                          {aquarium.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatVolume(aquarium.volume, aquarium.volumeUnit)}
                        </span>
                        {alertCount > 0 ? (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                            hasDanger
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          )}>
                            <AlertTriangle className="h-3 w-3" />
                            {alertCount} alert{alertCount > 1 ? "s" : ""}
                          </span>
                        ) : latestParams ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" />
                            All good
                          </span>
                        ) : null}
                      </div>
                      <Link href={`/aquariums/${aquarium.id}/timeline`} className="hover:text-teal-400 transition-colors">
                        <h2 className="font-bold font-mono text-xl text-slate-100">{aquarium.name}</h2>
                      </Link>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditTarget(aquarium)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        aria-label="Edit aquarium"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(aquarium)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        aria-label="Delete aquarium"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Parameter grid */}
                  {latestParams?.metadata ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
                      {(["ph", "ammonia", "nitrite", "nitrate", "temperature", "gh", "kh"] as const).map((param) => {
                        const val = (latest as Record<string, number | undefined>)[param];
                        if (val === undefined || val === null) return null;
                        const alert = alerts[param];

                        let display: string;
                        if (param === "temperature") {
                          display = formatTemp(val, tempUnit);
                        } else {
                          display = `${val.toFixed(2)}`;
                        }

                        return (
                          <div
                            key={param}
                            className={cn(
                              "bg-slate-800/50 rounded-xl p-3 border",
                              alert === "danger"
                                ? "border-red-500/30 bg-red-500/5"
                                : alert === "warning"
                                ? "border-yellow-500/20 bg-yellow-500/5"
                                : "border-slate-700/50"
                            )}
                          >
                            <div className="text-xs text-slate-500 mb-1">{PARAMETER_LABELS[param]}</div>
                            <div className={cn(
                              "font-mono font-bold text-base",
                              alert === "danger" ? "text-red-400" :
                              alert === "warning" ? "text-yellow-400" :
                              "text-slate-100"
                            )}>
                              {display}
                            </div>
                            {PARAMETER_UNITS[param] && param !== "temperature" && (
                              <div className="text-xs text-slate-600 mt-0.5">{PARAMETER_UNITS[param]}</div>
                            )}
                            {sparklineData.length > 2 && (
                              <div className="mt-2 -mx-1">
                                <Sparkline entries={sparklineData} parameter={param} height={30} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-4 text-slate-600">
                      <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-base">
                        <FlaskConical className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">No readings yet</p>
                        <Link
                          href={`/aquariums/${aquarium.id}/log?type=parameter_reading`}
                          className="text-xs text-teal-500 hover:text-teal-400 transition-colors"
                        >
                          Log your first water test →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Recent Events */}
                  {recentEvents.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/50">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Recent Events</div>
                      <div className="space-y-1">
                        {recentEvents.map((event) => {
                          const config = EVENT_TYPE_CONFIG[event.type];
                          const Icon = EVENT_ICONS[config.icon];
                          const timeAgo = event.timestamp?.toDate?.()
                            ? getRelativeTime(event.timestamp.toDate())
                            : "";
                          return (
                            <Link key={event.id} href={`/aquariums/${aquarium.id}/timeline`} className="flex items-center gap-2 text-xs hover:bg-slate-800/50 rounded-md px-1 -mx-1 py-0.5 transition-colors">
                              <div className={cn("h-5 w-5 rounded flex items-center justify-center flex-shrink-0", config.bgClass)}>
                                {Icon ? <Icon className="h-3 w-3" /> : <span className="text-[10px]">•</span>}
                              </div>
                              <span className="text-slate-300 truncate">{event.title}</span>
                              <span className="text-slate-600 flex-shrink-0">{timeAgo}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800/50">
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

                  {/* Per-tank Quick-Add event buttons */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Link href={quickAddHref(aquarium.id, "fish_added")} aria-label="Log fish addition" className="card-hover px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium">
                      <Fish className="h-3.5 w-3.5 text-green-400" />
                      <span className="hidden sm:inline">Addition</span>
                    </Link>
                    <Link href={quickAddHref(aquarium.id, "fish_died")} aria-label="Log fish death" className="card-hover px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium">
                      <Skull className="h-3.5 w-3.5 text-red-400" />
                      <span className="hidden sm:inline">Death</span>
                    </Link>
                    <Link href={quickAddHref(aquarium.id, "dosing")} aria-label="Log dosing" className="card-hover px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium">
                      <Pill className="h-3.5 w-3.5 text-purple-400" />
                      <span className="hidden sm:inline">Dose</span>
                    </Link>
                    <Link href={quickAddHref(aquarium.id, "parameter_reading")} aria-label="Log water test" className="card-hover px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium">
                      <FlaskConical className="h-3.5 w-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Test</span>
                    </Link>
                    <Link href={quickAddHref(aquarium.id, "water_change")} aria-label="Log water change" className="card-hover px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium">
                      <Droplets className="h-3.5 w-3.5 text-teal-400" />
                      <span className="hidden sm:inline">WC</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick-add buttons are now per-tank inside each card above */}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Aquarium">
        <AquariumForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitLabel="Create Aquarium"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Aquarium">
        {editTarget && (
          <AquariumForm
            initial={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Aquarium" size="sm">
        <p className="text-sm text-slate-400 mb-6">
          Are you sure you want to delete{" "}
          <strong className="text-slate-200">{deleteTarget?.name}</strong>?
          This will permanently delete all parameter logs and water change records.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            {deleting && <LoadingSpinner className="h-4 w-4" />}
            Delete Forever
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
