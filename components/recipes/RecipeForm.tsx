"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import type { Ingredient, RecipeInput } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { uploadRecipeImage, UploadError } from "@/lib/storage";

interface Props {
  initial?: Partial<RecipeInput>;
  loading?: boolean;
  onSubmit: (data: RecipeInput) => void;
}

export function RecipeForm({ initial, loading, onSubmit }: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients && initial.ingredients.length > 0
      ? initial.ingredients
      : [{ name: "", amount: "" }],
  );
  const [instructions, setInstructions] = useState<string[]>(
    initial?.instructions && initial.instructions.length > 0
      ? initial.instructions
      : [""],
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");

  function updateIngredient(i: number, field: keyof Ingredient, value: string) {
    setIngredients((ings) =>
      ings.map((ing, idx) => (idx === i ? { ...ing, [field]: value } : ing)),
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadRecipeImage(user.uid, file);
      setImageUrl(url);
      toast.success("התמונה הועלתה");
    } catch (err) {
      const msg =
        err instanceof UploadError
          ? err.message
          : err instanceof Error
            ? err.message
            : "שגיאה בהעלאה";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validInstructions = instructions.filter((i) => i.trim());
    onSubmit({
      title: title.trim(),
      ingredients: validIngredients,
      instructions: validInstructions,
      tags,
      imageUrl: imageUrl.trim() || undefined,
      sourceUrl: initial?.sourceUrl,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="input-label">שם המתכון</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="למשל: עוגת שוקולד"
          required
        />
      </div>

      <div>
        <label className="input-label">תמונה</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="url"
            dir="ltr"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "מעלה..." : "העלה"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="תצוגה מקדימה"
            className="mt-3 h-32 rounded-2xl object-cover border border-surface-300"
          />
        )}
      </div>

      <div>
        <label className="input-label">מרכיבים</label>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                placeholder="שם המרכיב"
              />
              <input
                className="input w-32"
                value={ing.amount}
                onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                placeholder="כמות"
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  className="btn-ghost !px-2"
                  onClick={() =>
                    setIngredients(ingredients.filter((_, idx) => idx !== i))
                  }
                  title="הסר"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary mt-3 !px-4 !py-2 text-xs"
          onClick={() =>
            setIngredients([...ingredients, { name: "", amount: "" }])
          }
        >
          <Plus className="h-3.5 w-3.5" /> הוסף מרכיב
        </button>
      </div>

      <div>
        <label className="input-label">אופן ההכנה</label>
        <p className="text-xs text-ink-500 mb-2">
          חשוב לכלול את כמויות המרכיבים בתוך ההוראות
        </p>
        <div className="space-y-2">
          {instructions.map((inst, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center text-xs font-bold mt-1 shadow-cta">
                {i + 1}
              </span>
              <textarea
                className="input flex-1 min-h-[70px]"
                value={inst}
                onChange={(e) =>
                  setInstructions(
                    instructions.map((s, idx) =>
                      idx === i ? e.target.value : s,
                    ),
                  )
                }
                placeholder={`שלב ${i + 1} - כולל כמויות (למשל: לערבב 500 גרם קמח עם ליטר מים)`}
              />
              {instructions.length > 1 && (
                <button
                  type="button"
                  className="btn-ghost !px-2 mt-1"
                  onClick={() =>
                    setInstructions(instructions.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary mt-3 !px-4 !py-2 text-xs"
          onClick={() => setInstructions([...instructions, ""])}
        >
          <Plus className="h-3.5 w-3.5" /> הוסף שלב
        </button>
      </div>

      <div>
        <label className="input-label">תגיות</label>
        <div className="flex flex-wrap items-center gap-2 bg-white border border-surface-300 rounded-2xl px-3 py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs font-medium text-peach-700 bg-peach-300 border border-peach-200 rounded-full px-2.5 py-0.5 cursor-pointer hover:bg-peach-200"
              onClick={() => setTags(tags.filter((t) => t !== tag))}
            >
              {tag}
              <X className="h-3 w-3" />
            </span>
          ))}
          <input
            className="bg-transparent outline-none text-sm text-ink-900 flex-1 min-w-[120px]"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder={tags.length === 0 ? "הקלד תגית ולחץ Enter" : ""}
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn-brand w-full !py-3.5 text-base"
        disabled={loading}
      >
        {loading ? "שומר..." : "שמור מתכון"}
      </button>
    </form>
  );
}
