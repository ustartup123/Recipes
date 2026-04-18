"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { addEvent, getLatestParameterEvent } from "@/lib/firestore";
import type { EventType, EventMetadata, AquariumEvent, TempUnit } from "@/lib/types";
import { EVENT_TYPE_CONFIG, EVENT_VALIDATION } from "@/lib/types";
import { cn, fahrenheitToCelsius, celsiusToFahrenheit } from "@/lib/utils";
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
  Save,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const EVENT_ICONS: Record<string, React.ElementType> = {
  FlaskConical,
  Droplets,
  Fish,
  Skull,
  Pill,
  Wrench,
  Eye,
  MoreHorizontal,
};

const EVENT_TYPES: EventType[] = [
  "parameter_reading",
  "water_change",
  "fish_added",
  "fish_died",
  "dosing",
  "equipment",
  "observation",
  "other",
];

const DEFAULT_PLACEHOLDERS_F: Record<string, number> = {
  ph: 7.0,
  ammonia: 0,
  nitrite: 0,
  nitrate: 20,
  temperature: 78,
  gh: 8,
  kh: 5,
};

function validateField(field: string, value: number, currentTempUnit?: TempUnit): string | null {
  const rule = EVENT_VALIDATION[field];
  if (!rule) return null;
  // For temperature, validate in the user's chosen unit
  if (field === "temperature" && currentTempUnit === "celsius") {
    const minC = fahrenheitToCelsius(rule.min);
    const maxC = fahrenheitToCelsius(rule.max);
    if (value < minC || value > maxC) {
      return `Must be between ${minC.toFixed(0)} and ${maxC.toFixed(0)}`;
    }
    return null;
  }
  if (value < rule.min || value > rule.max) {
    return `Must be between ${rule.min} and ${rule.max}`;
  }
  return null;
}

export default function LogPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const aquariumId = params.id as string;
  const { user } = useAuth();
  const { tempUnit, setTempUnit } = useUserPreferences();

  const preselectedType = (searchParams.get("type") as EventType) || "parameter_reading";
  const [eventType, setEventType] = useState<EventType>(preselectedType);
  const [saving, setSaving] = useState(false);
  const [lastReading, setLastReading] = useState<AquariumEvent | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state for each event type (preserved across type switches)
  // Date & time default to now
  const [eventDate, setEventDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [eventTime, setEventTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  const [paramFields, setParamFields] = useState<Record<string, string>>({});
  const [waterChangeFields, setWaterChangeFields] = useState({ percent: "", conditioner: "" });
  const [fishFields, setFishFields] = useState({ species: "", count: "", source: "" });
  const [dosingFields, setDosingFields] = useState({ product: "", amount: "" });
  const [equipmentFields, setEquipmentFields] = useState({ title: "" });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!aquariumId) return;
    getLatestParameterEvent(aquariumId).then(setLastReading);
  }, [aquariumId]);

  function getPlaceholder(param: string): string {
    if (lastReading?.metadata) {
      const val = lastReading.metadata[param as keyof EventMetadata];
      if (val != null) {
        // Show last reading in user's preferred unit
        if (param === "temperature" && tempUnit === "celsius" && typeof val === "number") {
          return `last: ${fahrenheitToCelsius(val).toFixed(1)}`;
        }
        return `last: ${val}`;
      }
    }
    const defaults = { ...DEFAULT_PLACEHOLDERS_F };
    if (tempUnit === "celsius") {
      defaults.temperature = Math.round(fahrenheitToCelsius(78));
    }
    const ideal = defaults[param];
    return ideal != null ? `ideal: ${ideal}` : "";
  }

  async function handleSubmit() {
    if (!user || saving) return;

    // Validate
    const newErrors: Record<string, string> = {};

    if (eventType === "parameter_reading") {
      const hasAnyParam = Object.values(paramFields).some((v) => v.trim() !== "");
      if (!hasAnyParam) {
        toast.error("Enter at least one parameter value");
        return;
      }
      for (const [key, val] of Object.entries(paramFields)) {
        if (val.trim() === "") continue;
        const num = parseFloat(val);
        if (isNaN(num)) {
          newErrors[key] = "Must be a number";
          continue;
        }
        const err = validateField(key, num, tempUnit);
        if (err) newErrors[key] = err;
      }
    }

    if (eventType === "water_change") {
      if (!waterChangeFields.percent.trim()) {
        newErrors.percent = "Required";
      } else {
        const pct = parseFloat(waterChangeFields.percent);
        if (isNaN(pct)) newErrors.percent = "Must be a number";
        else {
          const err = validateField("waterChangePercent", pct);
          if (err) newErrors.percent = err;
        }
      }
    }

    if (eventType === "fish_added" || eventType === "fish_died") {
      if (!fishFields.species.trim()) newErrors.species = "Required";
      if (fishFields.count.trim()) {
        const c = parseInt(fishFields.count);
        if (isNaN(c)) newErrors.count = "Must be a number";
        else {
          const err = validateField("count", c);
          if (err) newErrors.count = err;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Build event
    const metadata: EventMetadata = {};
    let title = "";

    switch (eventType) {
      case "parameter_reading": {
        title = "Water Test";
        for (const [key, val] of Object.entries(paramFields)) {
          if (val.trim()) {
            let numVal = parseFloat(val);
            // Convert temperature to Fahrenheit for storage if user entered in Celsius
            if (key === "temperature" && tempUnit === "celsius") {
              numVal = celsiusToFahrenheit(numVal);
            }
            (metadata as Record<string, number>)[key] = numVal;
          }
        }
        break;
      }
      case "water_change": {
        const pct = parseFloat(waterChangeFields.percent);
        title = `${pct}% Water Change`;
        metadata.waterChangePercent = pct;
        if (waterChangeFields.conditioner.trim()) {
          metadata.conditionerUsed = waterChangeFields.conditioner.trim();
        }
        break;
      }
      case "fish_added": {
        const count = fishFields.count.trim() ? parseInt(fishFields.count) : 1;
        title = `Added ${count}x ${fishFields.species.trim()}`;
        metadata.species = fishFields.species.trim();
        metadata.count = count;
        if (fishFields.source.trim()) metadata.source = fishFields.source.trim();
        break;
      }
      case "fish_died": {
        const count = fishFields.count.trim() ? parseInt(fishFields.count) : 1;
        title = `${count}x ${fishFields.species.trim()} died`;
        metadata.species = fishFields.species.trim();
        metadata.count = count;
        break;
      }
      case "dosing": {
        title = dosingFields.product.trim() || "Dosing";
        if (dosingFields.product.trim()) metadata.product = dosingFields.product.trim();
        if (dosingFields.amount.trim()) metadata.amount = dosingFields.amount.trim();
        break;
      }
      case "equipment": {
        title = equipmentFields.title.trim() || "Equipment Change";
        break;
      }
      case "observation": {
        title = "Observation";
        break;
      }
      default: {
        title = "Event";
        break;
      }
    }

    setSaving(true);
    try {
      const eventData: Parameters<typeof addEvent>[2] = { type: eventType, title };
      if (notes.trim()) eventData.details = notes.trim();
      if (Object.keys(metadata).length > 0) eventData.metadata = metadata;

      // Build custom timestamp from date/time inputs
      const [year, month, day] = eventDate.split("-").map(Number);
      const [hours, minutes] = eventTime.split(":").map(Number);
      const customDate = new Date(year, month - 1, day, hours, minutes);

      await addEvent(aquariumId, user.uid, eventData, customDate);
      toast.success("Event logged!");
      router.push(`/aquariums/${aquariumId}/timeline`);
    } catch (err) {
      toast.error("Failed to save. Check your connection.");
      console.error("Log event error:", err);
    } finally {
      setSaving(false);
    }
  }

  const PARAM_FIELDS = ["ph", "ammonia", "nitrite", "nitrate", "temperature", "gh", "kh"];
  const tempLabel = tempUnit === "celsius" ? "Temperature (°C)" : "Temperature (°F)";
  const PARAM_LABELS: Record<string, string> = {
    ph: "pH", ammonia: "Ammonia (ppm)", nitrite: "Nitrite (ppm)",
    nitrate: "Nitrate (ppm)", temperature: tempLabel, gh: "GH (dGH)", kh: "KH (dKH)",
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/aquariums/${aquariumId}/timeline`} className="btn-ghost p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="section-title text-xl">Log Entry</h1>
        </div>

        {/* Event type pills */}
        <div className="mb-6">
          <label className="input-label mb-2">Event Type</label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {EVENT_TYPES.map((type) => {
              const config = EVENT_TYPE_CONFIG[type];
              const Icon = EVENT_ICONS[config.icon];
              const active = eventType === type;
              return (
                <button
                  key={type}
                  onClick={() => setEventType(type)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-all cursor-pointer",
                    active
                      ? config.bgClass
                      : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Time */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="input-label">Date & Time</label>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setEventDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
                setEventTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
              }}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              Now
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              className="input flex-1"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <input
              type="time"
              className="input flex-1"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>

        {/* Type-specific fields */}
        <div className="card p-5 mb-4">
          {eventType === "parameter_reading" && (
            <div>
            <div className="flex items-center justify-end gap-2 mb-3">
              <span className="text-xs text-slate-500">Temperature unit:</span>
              <button
                type="button"
                onClick={() => setTempUnit(tempUnit === "celsius" ? "fahrenheit" : "celsius")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer",
                  "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-600"
                )}
              >
                {tempUnit === "celsius" ? "°C" : "°F"}
                <span className="text-slate-500 text-[10px]">→ {tempUnit === "celsius" ? "°F" : "°C"}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PARAM_FIELDS.map((param) => (
                <div key={param}>
                  <label htmlFor={`param-${param}`} className="input-label">
                    {PARAM_LABELS[param]}
                  </label>
                  <input
                    id={`param-${param}`}
                    type="number"
                    step="any"
                    className={cn("input font-mono", errors[param] && "border-red-500 focus:border-red-500")}
                    placeholder={getPlaceholder(param)}
                    value={paramFields[param] || ""}
                    onChange={(e) => {
                      setParamFields({ ...paramFields, [param]: e.target.value });
                      if (errors[param]) setErrors({ ...errors, [param]: "" });
                    }}
                  />
                  {errors[param] && (
                    <p className="text-xs text-red-400 mt-1">{errors[param]}</p>
                  )}
                </div>
              ))}
            </div>
            </div>
          )}

          {eventType === "water_change" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="wc-percent" className="input-label">Percentage</label>
                <div className="relative">
                  <input
                    id="wc-percent"
                    type="number"
                    className={cn("input font-mono pr-8", errors.percent && "border-red-500")}
                    placeholder="25"
                    value={waterChangeFields.percent}
                    onChange={(e) => {
                      setWaterChangeFields({ ...waterChangeFields, percent: e.target.value });
                      if (errors.percent) setErrors({ ...errors, percent: "" });
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                </div>
                {errors.percent && <p className="text-xs text-red-400 mt-1">{errors.percent}</p>}
              </div>
              <div>
                <label htmlFor="wc-conditioner" className="input-label">Conditioner Used</label>
                <input
                  id="wc-conditioner"
                  type="text"
                  className="input"
                  placeholder="e.g., Seachem Prime"
                  value={waterChangeFields.conditioner}
                  onChange={(e) => setWaterChangeFields({ ...waterChangeFields, conditioner: e.target.value })}
                />
              </div>
            </div>
          )}

          {(eventType === "fish_added" || eventType === "fish_died") && (
            <div className="space-y-3">
              <div>
                <label htmlFor="fish-species" className="input-label">Species</label>
                <input
                  id="fish-species"
                  type="text"
                  className={cn("input", errors.species && "border-red-500")}
                  placeholder="e.g., Neon Tetra"
                  value={fishFields.species}
                  onChange={(e) => {
                    setFishFields({ ...fishFields, species: e.target.value });
                    if (errors.species) setErrors({ ...errors, species: "" });
                  }}
                />
                {errors.species && <p className="text-xs text-red-400 mt-1">{errors.species}</p>}
              </div>
              <div>
                <label htmlFor="fish-count" className="input-label">Count</label>
                <input
                  id="fish-count"
                  type="number"
                  className={cn("input font-mono", errors.count && "border-red-500")}
                  placeholder="1"
                  value={fishFields.count}
                  onChange={(e) => {
                    setFishFields({ ...fishFields, count: e.target.value });
                    if (errors.count) setErrors({ ...errors, count: "" });
                  }}
                />
                {errors.count && <p className="text-xs text-red-400 mt-1">{errors.count}</p>}
              </div>
              {eventType === "fish_added" && (
                <div>
                  <label htmlFor="fish-source" className="input-label">Source</label>
                  <input
                    id="fish-source"
                    type="text"
                    className="input"
                    placeholder="e.g., PetSmart"
                    value={fishFields.source}
                    onChange={(e) => setFishFields({ ...fishFields, source: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {eventType === "dosing" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="dose-product" className="input-label">Product</label>
                <input
                  id="dose-product"
                  type="text"
                  className="input"
                  placeholder="e.g., Seachem Prime"
                  value={dosingFields.product}
                  onChange={(e) => setDosingFields({ ...dosingFields, product: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="dose-amount" className="input-label">Amount</label>
                <input
                  id="dose-amount"
                  type="text"
                  className="input"
                  placeholder="e.g., 2ml"
                  value={dosingFields.amount}
                  onChange={(e) => setDosingFields({ ...dosingFields, amount: e.target.value })}
                />
              </div>
            </div>
          )}

          {eventType === "equipment" && (
            <div>
              <label htmlFor="equip-title" className="input-label">What changed?</label>
              <input
                id="equip-title"
                type="text"
                className="input"
                placeholder="e.g., Replaced filter media"
                value={equipmentFields.title}
                onChange={(e) => setEquipmentFields({ title: e.target.value })}
              />
            </div>
          )}

          {(eventType === "observation" || eventType === "other") && (
            <p className="text-sm text-slate-500">Add details in the notes field below.</p>
          )}
        </div>

        {/* Notes (always visible) */}
        <div className="card p-5 mb-6">
          <label htmlFor="event-notes" className="input-label">Notes (optional)</label>
          <textarea
            id="event-notes"
            className="input min-h-[80px] resize-y"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Event
        </button>
      </div>
    </AppShell>
  );
}
