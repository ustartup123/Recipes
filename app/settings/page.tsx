"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getAquariums, getEvents, getAIContext, saveAIContext } from "@/lib/firestore";
import type { Aquarium, AquariumEvent } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Settings, Download, Bell, User, ExternalLink, Bot } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState("");
  const [savingContext, setSavingContext] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAquariums(user.uid),
      getAIContext(user.uid),
    ]).then(([list, ctx]) => {
      setAquariums(list);
      setAiContext(ctx);
      setLoading(false);
    });
  }, [user]);

  async function handleSaveAIContext() {
    if (!user || savingContext) return;
    setSavingContext(true);
    try {
      await saveAIContext(user.uid, aiContext);
      toast.success("AI context saved!");
    } catch {
      toast.error("Failed to save AI context");
    } finally {
      setSavingContext(false);
    }
  }

  async function exportParameters(aquarium: Aquarium) {
    setExporting(`params-${aquarium.id}`);
    try {
      const events = await getEvents(aquarium.id, 500);
      const readings = events.filter((e: AquariumEvent) => e.type === "parameter_reading");
      const headers = ["Date", "pH", "Ammonia (ppm)", "Nitrite (ppm)", "Nitrate (ppm)", "Temp (°F)", "GH (dGH)", "KH (dKH)", "Notes"];
      const rows = readings.map((e: AquariumEvent) => {
        const m = e.metadata || {};
        return [
          formatDate(e.timestamp.toDate()),
          m.ph != null ? String(m.ph) : "",
          m.ammonia != null ? String(m.ammonia) : "",
          m.nitrite != null ? String(m.nitrite) : "",
          m.nitrate != null ? String(m.nitrate) : "",
          m.temperature != null ? String(m.temperature.toFixed(1)) : "",
          m.gh != null ? String(m.gh) : "",
          m.kh != null ? String(m.kh) : "",
          e.details || "",
        ];
      });
      downloadCSV(`${aquarium.name}-parameters.csv`, [headers, ...rows]);
      toast.success(`Exported ${readings.length} parameter readings`);
    } finally {
      setExporting(null);
    }
  }

  async function exportWaterChanges(aquarium: Aquarium) {
    setExporting(`wc-${aquarium.id}`);
    try {
      const events = await getEvents(aquarium.id, 500);
      const changes = events.filter((e: AquariumEvent) => e.type === "water_change");
      const headers = ["Date", "Percentage", "Conditioner", "Notes"];
      const rows = changes.map((e: AquariumEvent) => {
        const m = e.metadata || {};
        return [
          formatDate(e.timestamp.toDate()),
          m.waterChangePercent != null ? `${m.waterChangePercent.toFixed(1)}%` : "",
          m.conditionerUsed || "",
          e.details || "",
        ];
      });
      downloadCSV(`${aquarium.name}-water-changes.csv`, [headers, ...rows]);
      toast.success(`Exported ${changes.length} water change records`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-teal-400" />
        <h1 className="section-title text-2xl">Settings</h1>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Profile */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-slate-400" />
            <h2 className="font-bold font-mono text-slate-200 text-sm">Account</h2>
          </div>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "User"}
                width={56}
                height={56}
                className="rounded-full border-2 border-slate-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-teal-500/20 border-2 border-teal-500/30 flex items-center justify-center text-teal-400 text-xl font-bold">
                {user?.displayName?.[0] || "U"}
              </div>
            )}
            <div>
              <p className="font-bold text-slate-100">{user?.displayName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <p className="text-xs text-slate-600 mt-0.5">Signed in with Google</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={signOut}
              className="btn-danger text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* AI Context */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-4 w-4 text-slate-400" />
            <h2 className="font-bold font-mono text-slate-200 text-sm">AI Context</h2>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Help the AI understand your setup. This information is included in every AI analysis and advisor conversation.
          </p>
          <div>
            <textarea
              id="ai-context"
              className="input min-h-[120px] resize-y"
              placeholder="e.g., I have Seachem Prime, Stability, and API pH Up on hand. My tank has 6 neon tetras, 4 corydoras, 2 mystery snails. I use RO water remineralized with Salty Shrimp..."
              value={aiContext}
              onChange={(e) => {
                if (e.target.value.length <= 2000) setAiContext(e.target.value);
              }}
              maxLength={2000}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-600">
                Examples: products on hand, tank inhabitants, water source, room conditions, feeding schedule
              </p>
              <span className="text-xs text-slate-500 tabular-nums">
                {aiContext.length} / 2,000
              </span>
            </div>
          </div>
          <button
            onClick={handleSaveAIContext}
            disabled={savingContext}
            className="btn-primary text-sm mt-3"
          >
            {savingContext ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Alert thresholds shortcuts */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-slate-400" />
            <h2 className="font-bold font-mono text-slate-200 text-sm">Alert Thresholds</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Configure per-aquarium alert thresholds for water parameter warnings.
          </p>
          {loading ? (
            <LoadingSpinner className="h-5 w-5" />
          ) : (
            <div className="space-y-2">
              {aquariums.map((aq) => (
                <Link
                  key={aq.id}
                  href={`/aquariums/${aq.id}/alerts`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{aq.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{aq.type}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-teal-400 transition-colors" />
                </Link>
              ))}
              {aquariums.length === 0 && (
                <p className="text-sm text-slate-600">No aquariums yet.</p>
              )}
            </div>
          )}
        </div>

        {/* CSV Export */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-4 w-4 text-slate-400" />
            <h2 className="font-bold font-mono text-slate-200 text-sm">Export Data</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Download your data as CSV for use in spreadsheets or backup.
          </p>
          {loading ? (
            <LoadingSpinner className="h-5 w-5" />
          ) : aquariums.length === 0 ? (
            <p className="text-sm text-slate-600">No aquariums to export.</p>
          ) : (
            <div className="space-y-3">
              {aquariums.map((aq) => (
                <div key={aq.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-sm font-medium text-slate-200 mb-3">{aq.name}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportParameters(aq)}
                      disabled={!!exporting}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      {exporting === `params-${aq.id}` ? (
                        <LoadingSpinner className="h-3 w-3" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Parameters CSV
                    </button>
                    <button
                      onClick={() => exportWaterChanges(aq)}
                      disabled={!!exporting}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      {exporting === `wc-${aq.id}` ? (
                        <LoadingSpinner className="h-3 w-3" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Water Changes CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* App info */}
        <div className="card p-5">
          <h2 className="font-bold font-mono text-slate-200 text-sm mb-3">About AquaTrack</h2>
          <div className="space-y-1 text-xs text-slate-500">
            <p>Version {APP_VERSION}</p>
            <p>Freshwater aquarium water parameter tracker</p>
            <p>Built with Next.js 14, Firebase, and Gemini AI</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
