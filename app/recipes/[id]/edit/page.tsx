"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { useAuth } from "@/context/AuthContext";
import { getRecipe, updateRecipe } from "@/lib/firestore";
import type { Recipe, RecipeInput } from "@/lib/types";

export default function EditRecipePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  async function handleSubmit(data: RecipeInput) {
    if (!recipe) return;
    setSaving(true);
    try {
      await updateRecipe(recipe.id, data);
      toast.success("המתכון עודכן");
      router.replace(`/recipes/${recipe.id}`);
    } catch (err) {
      console.error("updateRecipe failed:", err);
      const detail = err instanceof Error ? err.message : "";
      toast.error(detail ? `שגיאה בעדכון: ${detail}` : "שגיאה בעדכון");
      setSaving(false);
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
        href={`/recipes/${recipe.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה למתכון
      </Link>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">עריכת מתכון</h1>
      <div className="card p-5">
        <RecipeForm initial={recipe} loading={saving} onSubmit={handleSubmit} />
      </div>
    </AppShell>
  );
}
