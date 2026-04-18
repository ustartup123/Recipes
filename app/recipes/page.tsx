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
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-slate-100">המתכונים שלי</h1>
        <Link
          href="/recipes/new"
          className="btn-primary inline-flex items-center gap-1.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          מתכון חדש
        </Link>
      </div>

      {recipes.length > 0 && (
        <div className="relative mb-5">
          <Search className="h-4 w-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            className="input pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או תגית..."
          />
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
          description="התחל על ידי הוספת המתכון הראשון שלך"
          action={
            <Link href="/recipes/new" className="btn-primary inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              הוסף מתכון
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-12">לא נמצאו מתכונים התואמים לחיפוש</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
