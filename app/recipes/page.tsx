"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChefHat, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { useAuth } from "@/context/AuthContext";
import { getRecipes } from "@/lib/firestore";
import type { Recipe } from "@/lib/types";

export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    getRecipes(user.uid)
      .then(setRecipes)
      .catch((err) => {
        console.error(err);
        toast.error("שגיאה בטעינת המתכונים");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = search.trim()
    ? recipes.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q))
        );
      })
    : recipes;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight">
            המתכונים שלי
          </h1>
          {recipes.length > 0 && (
            <p className="text-ink-700 text-sm mt-1.5">
              {recipes.length} {recipes.length === 1 ? "מתכון בספרייה" : "מתכונים בספרייה"}
            </p>
          )}
        </div>
        <Link href="/recipes/new" className="btn-primary">
          <span className="btn-primary-icon">
            <Plus className="h-3.5 w-3.5" />
          </span>
          מתכון חדש
        </Link>
      </div>

      {recipes.length > 0 && (
        <div className="relative mb-8">
          <div className="flex items-center gap-2 bg-white rounded-full shadow-soft border border-surface-300/60 pr-2 pl-2 py-2">
            <div className="h-9 w-9 rounded-full bg-surface-200 text-ink-700 flex items-center justify-center shrink-0">
              <Search className="h-4 w-4" />
            </div>
            <input
              className="flex-1 bg-transparent border-0 outline-none text-sm text-ink-900 placeholder-ink-500 py-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או תגית..."
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="עדיין אין מתכונים"
          description="התחל על ידי הוספת המתכון הראשון שלך. אפשר לייבא מקישור, מטקסט או להוסיף ידנית."
          action={
            <Link href="/recipes/new" className="btn-brand">
              <Plus className="h-4 w-4" />
              הוסף מתכון
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-soft py-16 text-center">
          <p className="text-ink-700 text-sm">לא נמצאו מתכונים התואמים לחיפוש</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
