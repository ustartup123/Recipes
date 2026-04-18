"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getAquariums, updateAlertThresholds } from "@/lib/firestore";
import type { Aquarium, AlertThresholds } from "@/lib/types";
import {
  PARAMETER_LABELS,
  PARAMETER_UNITS,
  DEFAULT_THRESHOLDS,
} from "@/lib/types";
import { ArrowLeft, Bell, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type ParamKey = keyof AlertThresholds;

const PARAMS: { key: ParamKey; description: string; safeRange: string }[] = [
  { key: "ph", description: "Measures water acidity/alkalinity", safeRange: "6.5–7.5 for most community fish" },
  { key: "ammonia", description: "Fish waste byproduct — highly toxic", safeRange: "0 ppm ideal, 0.25 ppm max" },
  { key: "nitrite", description: "Bacterial nitrogen cycle product — toxic", safeRange: "0 ppm ideal, 0.5 ppm max" },
  { key: "nitrate", description: "End product of nitrogen cycle", safeRange: "< 20 ppm recommended" },
  { key: "temperature", description: "Water temperature (°F)", safeRange: "72–82°F for tropical fish" },
  { key: "gh", description: "General Hardness — dissolved minerals", safeRange: "4–12 dGH" },
  { key: "kh", description: "Carbonate Hardness — pH buffer", safeRange: "3–8 dKH" },
];

export default function AlertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: aquariumId } = use(params);
  const { user } = useAuth();
  const [aquarium, setAquarium] = useState<Aquarium | null>(null);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAquariums(user.uid).then((list) => {
      const aq = list.find((a) => a.id === aquariumId);
      if (aq) {
        setAquarium(aq);
        setThresholds(aq.alertThresholds || DEFAULT_THRESHOLDS);
      }
      setLoading(false);
    });
  }, [user, aquariumId]);

  function updateThreshold(param: ParamKey, field: "min" | "max", value: string) {
    setThresholds((prev) => ({
      ...prev,
      [param]: {
        ...prev[param],
        [field]: parseFloat(value) || 0,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateAlertThresholds(aquariumId, thresholds);
      toast.success("Alert thresholds saved!");
    } catch {
      toast.error("Failed to save thresholds");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setThresholds(DEFAULT_THRESHOLDS);
    toast("Reset to defaults", { icon: "↩️" });
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-16"><LoadingSpinner className="h-8 w-8" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="btn-ghost p-2">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-teal-400" />
            <h1 className="section-title text-xl">Alert Thresholds</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{aquarium?.name}</p>
        </div>
        <button onClick={handleReset} className="btn-secondary text-xs px-3 py-2">
          Reset to defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <LoadingSpinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="card p-5 mb-4">
        <p className="text-sm text-slate-400">
          Set the safe range for each parameter. When a logged value falls outside these ranges,
          you&apos;ll see alert badges on your dashboard and parameter log.
        </p>
      </div>

      <div className="space-y-3">
        {PARAMS.map(({ key, description, safeRange }) => {
          const threshold = thresholds[key];
          return (
            <div key={key} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold font-mono text-slate-200">
                    {PARAMETER_LABELS[key]}
                    {PARAMETER_UNITS[key] && (
                      <span className="text-slate-500 font-normal text-sm ml-1">
                        ({PARAMETER_UNITS[key]})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  <p className="text-xs text-teal-600 mt-0.5">{safeRange}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Min (alert below)</label>
                  <input
                    className="input"
                    type="number"
                    value={threshold?.min ?? ""}
                    onChange={(e) => updateThreshold(key, "min", e.target.value)}
                    step="0.01"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="input-label">Max (alert above)</label>
                  <input
                    className="input"
                    type="number"
                    value={threshold?.max ?? ""}
                    onChange={(e) => updateThreshold(key, "max", e.target.value)}
                    step="0.01"
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Visual range */}
              {threshold && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-mono text-yellow-500">{threshold.min}</span>
                  <div className="flex-1 h-1 bg-slate-800 rounded-full relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500/30 via-teal-500/50 to-red-500/30" />
                  </div>
                  <span className="font-mono text-red-500">{threshold.max}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
