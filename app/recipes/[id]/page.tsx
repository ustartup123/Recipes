"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  ChefHat,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import {
  getRecipe,
  deleteRecipe,
  addRecipeNote,
  deleteRecipeNote,
} from "@/lib/firestore";
import type { Recipe } from "@/lib/types";

export default function RecipeDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    getRecipe(id)
      .then((r) => {
        if (!r) {
          toast.error("המתכון לא נמצא");
          router.replace("/recipes");
          return;
        }
        if (r.userId !== user.uid) {
          toast.error("אין גישה למתכון זה");
          router.replace("/recipes");
          return;
        }
        setRecipe(r);
      })
      .catch((err) => {
        console.error(err);
        toast.error("שגיאה בטעינה");
      })
      .finally(() => setLoading(false));
  }, [id, user, router]);

  async function handleDelete() {
    if (!recipe) return;
    try {
      await deleteRecipe(recipe.id);
      toast.success("המתכון נמחק");
      router.replace("/recipes");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה במחיקה");
    }
  }

  async function handleAddNote() {
    if (!recipe || !noteInput.trim()) return;
    setAddingNote(true);
    try {
      const note = await addRecipeNote(recipe.id, noteInput.trim());
      setRecipe({ ...recipe, notes: [...recipe.notes, note] });
      setNoteInput("");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בהוספת הערה");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!recipe) return;
    try {
      await deleteRecipeNote(recipe.id, noteId);
      setRecipe({ ...recipe, notes: recipe.notes.filter((n) => n.id !== noteId) });
    } catch (err) {
      console.error(err);
      toast.error("שגיאה במחיקת הערה");
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

  if (!recipe) return null;

  return (
    <AppShell>
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900 mb-5"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לרשימה
      </Link>

      <div className="card overflow-hidden mb-6">
        <div className="p-3">
          <div className="aspect-[16/9] bg-gradient-to-br from-surface-200 to-surface-300 rounded-2xl flex items-center justify-center overflow-hidden">
            {recipe.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <ChefHat className="h-16 w-16 text-ink-500" />
            )}
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              {recipe.title}
            </h1>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className="btn-secondary !py-2 !px-4 text-sm"
              >
                <Pencil className="h-3.5 w-3.5" />
                ערוך
              </Link>
              <button
                className="btn-ghost text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                מחק
              </button>
            </div>
          </div>

          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {recipe.tags.map((tag, i) => {
                const variants = ["tag-brand", "tag-sage", "tag-lavender", "tag"];
                const cls = variants[i % variants.length];
                return (
                  <span key={i} className={cls}>
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-ink-700 hover:text-brand-500 transition-colors"
              dir="ltr"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {recipe.sourceUrl}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="card p-6 md:col-span-1">
          <h2 className="section-title mb-4">מרכיבים</h2>
          {recipe.ingredients.length === 0 ? (
            <p className="text-sm text-ink-500">אין מרכיבים</p>
          ) : (
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-3 text-sm py-2 border-b border-surface-200 last:border-0"
                >
                  <span className="text-ink-900">{ing.name}</span>
                  {ing.amount && (
                    <span className="text-ink-700 shrink-0 font-medium">{ing.amount}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6 md:col-span-2">
          <h2 className="section-title mb-4">אופן ההכנה</h2>
          {recipe.instructions.length === 0 ? (
            <p className="text-sm text-ink-500">אין הוראות</p>
          ) : (
            <ol className="space-y-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center text-xs font-bold shadow-cta">
                    {i + 1}
                  </span>
                  <p className="text-ink-900 leading-relaxed pt-1">{step}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">הערות</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="input flex-1"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="הוסף הערה..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <button
            className="btn-brand"
            onClick={handleAddNote}
            disabled={addingNote || !noteInput.trim()}
          >
            <Plus className="h-4 w-4" />
            הוסף
          </button>
        </div>
        {recipe.notes.length === 0 ? (
          <p className="text-sm text-ink-500">אין הערות</p>
        ) : (
          <ul className="space-y-2">
            {recipe.notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-2 bg-surface-100 border border-surface-300/60 rounded-2xl px-4 py-3"
              >
                <p className="text-sm text-ink-900 flex-1">{note.content}</p>
                <button
                  className="btn-ghost !px-1.5 !py-1 shrink-0 text-ink-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteNote(note.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="מחיקת מתכון"
      >
        <p className="text-sm text-ink-900 mb-5">
          האם אתה בטוח שברצונך למחוק את המתכון &ldquo;{recipe.title}&rdquo;? לא ניתן לשחזר
          פעולה זו.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            className="btn-secondary"
            onClick={() => setConfirmDelete(false)}
          >
            ביטול
          </button>
          <button
            className="btn-danger !bg-red-500 !text-white hover:!bg-red-600 !border-red-500"
            onClick={handleDelete}
          >
            מחק
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}
