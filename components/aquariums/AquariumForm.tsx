"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Aquarium, AquariumType, VolumeUnit } from "@/lib/types";
import { useUserPreferences } from "@/context/UserPreferencesContext";

interface AquariumFormProps {
  initial?: Partial<Aquarium>;
  onSubmit: (data: Omit<Aquarium, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function AquariumForm({ initial, onSubmit, onCancel, submitLabel = "Create Aquarium" }: AquariumFormProps) {
  const { volumeUnit: preferredVolumeUnit, setVolumeUnit: saveVolumePreference } = useUserPreferences();
  const [name, setName] = useState(initial?.name || "");
  const [volume, setVolume] = useState(String(initial?.volume || ""));
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(initial?.volumeUnit || preferredVolumeUnit);
  const [type, setType] = useState<AquariumType>(initial?.type || "freshwater");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nameError = touched.name && !name.trim() ? "Tank name is required" : null;
  const volumeError = touched.volume && !volume.trim() ? "Volume is required" : null;
  const isValid = !!name.trim() && !!volume.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Mark all fields as touched to reveal any inline errors
    setTouched({ name: true, volume: true });
    if (!name.trim() || !volume.trim()) return;

    setLoading(true);
    try {
      const data: Parameters<typeof onSubmit>[0] = {
        name: name.trim(),
        volume: parseFloat(volume),
        volumeUnit,
        type,
      };
      if (notes.trim()) data.notes = notes.trim();
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        {/* Required field legend */}
        <p className="text-xs text-slate-500 mb-3">
          Fields marked <span className="text-red-400">*</span> are required
        </p>
      </div>

      <div>
        <label className="input-label">
          Tank Name <span className="text-red-400">*</span>
        </label>
        <input
          className={`input${nameError ? " border-red-500 focus:border-red-500" : ""}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="e.g. Living Room 55gal"
          maxLength={80}
        />
        {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">
            Volume <span className="text-red-400">*</span>
          </label>
          <input
            className={`input${volumeError ? " border-red-500 focus:border-red-500" : ""}`}
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, volume: true }))}
            placeholder="55"
            min="0.1"
            step="0.1"
          />
          {volumeError && <p className="text-xs text-red-400 mt-1">{volumeError}</p>}
        </div>
        <div>
          <label className="input-label">Unit</label>
          <select className="select" value={volumeUnit} onChange={(e) => {
            const unit = e.target.value as VolumeUnit;
            setVolumeUnit(unit);
            saveVolumePreference(unit);
          }}>
            <option value="gallons">Gallons</option>
            <option value="liters">Liters</option>
          </select>
        </div>
      </div>

      <div>
        <label className="input-label">Tank Type</label>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as AquariumType)}>
          <option value="freshwater">Freshwater</option>
          <option value="planted">Planted</option>
          <option value="brackish">Brackish</option>
          <option value="marine">Marine</option>
          <option value="reef">Reef</option>
        </select>
      </div>

      <div>
        <label className="input-label">Notes (optional)</label>
        <textarea
          className="input resize-none"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tank inhabitants, equipment, setup notes..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !isValid}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
