import { Timestamp } from "firebase/firestore";

export type AquariumType = "freshwater" | "planted" | "brackish" | "marine" | "reef";
export type VolumeUnit = "gallons" | "liters";
export type TempUnit = "fahrenheit" | "celsius";

export interface Aquarium {
  id: string;
  userId: string;
  name: string;
  volume: number;
  volumeUnit: VolumeUnit;
  type: AquariumType;
  photoUrl?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  alertThresholds?: AlertThresholds;
}

export interface ParameterEntry {
  id: string;
  aquariumId: string;
  userId: string;
  timestamp: Timestamp;
  ph?: number;
  ammonia?: number;    // ppm
  nitrite?: number;    // ppm
  nitrate?: number;    // ppm
  temperature?: number; // stored in Fahrenheit internally
  gh?: number;         // dGH
  kh?: number;         // dKH
  notes?: string;
}

export interface AlertThresholds {
  ph?: { min: number; max: number };
  ammonia?: { min: number; max: number };
  nitrite?: { min: number; max: number };
  nitrate?: { min: number; max: number };
  temperature?: { min: number; max: number }; // in Fahrenheit
  gh?: { min: number; max: number };
  kh?: { min: number; max: number };
}

export interface UserPreferences {
  tempUnit: TempUnit;
  volumeUnit: VolumeUnit;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  tempUnit: "celsius",
  volumeUnit: "liters",
};

export interface ChatImage {
  base64: string;      // data URL (data:image/jpeg;base64,...)
  mimeType: string;    // e.g. "image/jpeg"
  url?: string;        // Firebase Storage URL (after persistence)
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: ChatImage[];
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  ph: { min: 6.5, max: 7.5 },
  ammonia: { min: 0, max: 0.25 },
  nitrite: { min: 0, max: 0.5 },
  nitrate: { min: 0, max: 20 },
  temperature: { min: 72, max: 82 }, // °F
  gh: { min: 4, max: 12 },
  kh: { min: 3, max: 8 },
};

export const PARAMETER_LABELS: Record<string, string> = {
  ph: "pH",
  ammonia: "Ammonia",
  nitrite: "Nitrite",
  nitrate: "Nitrate",
  temperature: "Temperature",
  gh: "GH",
  kh: "KH",
};

export const PARAMETER_UNITS: Record<string, string> = {
  ph: "",
  ammonia: "ppm",
  nitrite: "ppm",
  nitrate: "ppm",
  temperature: "°F",
  gh: "dGH",
  kh: "dKH",
};

export const PARAMETER_COLORS: Record<string, string> = {
  ph: "#14b8a6",
  ammonia: "#ef4444",
  nitrite: "#f97316",
  nitrate: "#eab308",
  temperature: "#3b82f6",
  gh: "#8b5cf6",
  kh: "#ec4899",
};

export type ParameterKey = keyof Omit<ParameterEntry, "id" | "aquariumId" | "userId" | "timestamp" | "notes">;

// ─── Unified Event Model ─────────────────────────────────────────────────────

export type EventType =
  | "parameter_reading"
  | "water_change"
  | "fish_added"
  | "fish_died"
  | "dosing"
  | "equipment"
  | "observation"
  | "other";

export interface EventMetadata {
  // parameter_reading
  ph?: number;
  ammonia?: number;       // ppm
  nitrite?: number;       // ppm
  nitrate?: number;       // ppm
  temperature?: number;   // Fahrenheit internally
  gh?: number;            // dGH
  kh?: number;            // dKH
  // fish_added / fish_died
  species?: string;
  count?: number;
  source?: string;        // for fish_added (e.g., "PetSmart")
  // dosing
  product?: string;       // e.g., "Seachem Prime"
  amount?: string;        // e.g., "2ml"
  // water_change
  waterChangePercent?: number;
  conditionerUsed?: string;
  // Marine params (forward-looking, phase 2)
  salinity?: number;      // ppt
  calcium?: number;       // ppm
  alkalinity?: number;    // dKH
  magnesium?: number;     // ppm
  phosphate?: number;     // ppm
}

export interface AquariumEvent {
  id: string;
  aquariumId: string;
  userId: string;
  timestamp: Timestamp;
  type: EventType;
  title: string;
  details?: string;
  metadata?: EventMetadata;
  aiCorrelation?: string;
}

export type AnalysisSeverity = "green" | "yellow" | "orange" | "red";

export interface Analysis {
  id: string;
  aquariumId: string;
  userId: string;
  timestamp: Timestamp;
  severity: AnalysisSeverity;
  summary: string;
  recommendations: string[];
  correlations: Array<{ eventId: string; badgeText: string }>;
  rawResponse: string;
  eventCount: number;
  daysCovered: number;
}

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: string; color: string; bgClass: string }> = {
  parameter_reading: { label: "Water Test", icon: "FlaskConical", color: "#3b82f6", bgClass: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  water_change: { label: "Water Change", icon: "Droplets", color: "#14b8a6", bgClass: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  fish_added: { label: "Fish Added", icon: "Fish", color: "#22c55e", bgClass: "bg-green-500/10 text-green-400 border-green-500/20" },
  fish_died: { label: "Fish Died", icon: "Skull", color: "#ef4444", bgClass: "bg-red-500/10 text-red-400 border-red-500/20" },
  dosing: { label: "Dosing", icon: "Pill", color: "#a855f7", bgClass: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  equipment: { label: "Equipment", icon: "Wrench", color: "#f59e0b", bgClass: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  observation: { label: "Observation", icon: "Eye", color: "#64748b", bgClass: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  other: { label: "Other", icon: "MoreHorizontal", color: "#64748b", bgClass: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

export const SEVERITY_CONFIG: Record<AnalysisSeverity, { label: string; icon: string; colorClass: string }> = {
  green: { label: "ALL GOOD", icon: "CheckCircle", colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  yellow: { label: "MINOR CONCERN", icon: "AlertTriangle", colorClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  orange: { label: "ACTION RECOMMENDED", icon: "AlertTriangle", colorClass: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  red: { label: "URGENT", icon: "XCircle", colorClass: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export const EVENT_VALIDATION: Record<string, { min: number; max: number }> = {
  ph: { min: 0, max: 14 },
  ammonia: { min: 0, max: 20 },
  nitrite: { min: 0, max: 20 },
  nitrate: { min: 0, max: 500 },
  temperature: { min: 32, max: 120 },
  gh: { min: 0, max: 30 },
  kh: { min: 0, max: 30 },
  count: { min: 1, max: 999 },
  waterChangePercent: { min: 1, max: 100 },
};
