"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, FileText, Pencil, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { useAuth } from "@/context/AuthContext";
import { createRecipe } from "@/lib/firestore";
import type { RecipeInput } from "@/lib/types";

type Mode = "manual" | "url" | "text";

export default function NewRecipePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [initial, setInitial] = useState<Partial<RecipeInput> | undefined>();
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  async function callAi(path: "parse-url" | "parse-text", body: object) {
    if (!user) throw new Error("Not authenticated");
    const token = await user.getIdToken();
    const res = await fetch(`/api/ai/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to parse");
    }
    return res.json();
  }

  async function handleParseUrl() {
    if (!url.trim()) return;
    setParsing(true);
    try {
      const parsed = await callAi("parse-url", { url: url.trim() });
      setInitial(parsed);
      toast.success("המתכון זוהה בהצלחה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בזיהוי המתכון");
    } finally {
      setParsing(false);
    }
  }

  async function handleParseText() {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const parsed = await callAi("parse-text", { text: text.trim() });
      setInitial(parsed);
      toast.success("המתכון זוהה בהצלחה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בזיהוי המתכון");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(data: RecipeInput) {
    if (!user) return;
    setSaving(true);
    try {
      const id = await createRecipe(user.uid, data);
      toast.success("המתכון נשמר");
      router.replace(`/recipes/${id}`);
    } catch (err) {
      console.error("createRecipe failed:", err);
      const detail = err instanceof Error ? err.message : "";
      toast.error(detail ? `שגיאה בשמירה: ${detail}` : "שגיאה בשמירה");
      setSaving(false);
    }
  }

  const tabs: { id: Mode; label: string; icon: React.ElementType }[] = [
    { id: "manual", label: "ידני", icon: Pencil },
    { id: "url", label: "מקישור", icon: Link2 },
    { id: "text", label: "מטקסט", icon: FileText },
  ];

  return (
    <AppShell>
      <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 mb-8 tracking-tight">
        מתכון חדש
      </h1>

      <div className="flex gap-2 mb-8 p-1 bg-surface-50 rounded-full shadow-soft border border-surface-300/60 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setMode(id);
              setInitial(undefined);
            }}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
              mode === id
                ? "bg-ink-900 text-surface-100 shadow-cta"
                : "text-ink-700 hover:text-ink-900 hover:bg-surface-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "url" && !initial && (
        <div className="card p-6 mb-6">
          <label className="input-label">קישור למתכון</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="url"
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipe"
            />
            <button
              className="btn-brand whitespace-nowrap"
              onClick={handleParseUrl}
              disabled={parsing || !url.trim()}
            >
              {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
              {parsing ? "מזהה..." : "זהה מתכון"}
            </button>
          </div>
        </div>
      )}

      {mode === "text" && !initial && (
        <div className="card p-6 mb-6">
          <label className="input-label">הדבק טקסט של המתכון</label>
          <textarea
            className="input min-h-[200px] mb-4"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="הדבק כאן את המתכון - הכותרת, המרכיבים והוראות ההכנה..."
          />
          <button
            className="btn-brand"
            onClick={handleParseText}
            disabled={parsing || !text.trim()}
          >
            {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
            {parsing ? "מזהה..." : "זהה מתכון"}
          </button>
        </div>
      )}

      {(mode === "manual" || initial) && (
        <div className="card p-6">
          <RecipeForm initial={initial} loading={saving} onSubmit={handleSubmit} />
        </div>
      )}
    </AppShell>
  );
}
