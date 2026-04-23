"use client";

import Link from "next/link";
import { ChefHat } from "lucide-react";
import type { Recipe } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="card-hover block overflow-hidden group"
    >
      <div className="p-2.5">
        <div className="aspect-[4/3] bg-gradient-to-br from-surface-200 to-surface-300 rounded-2xl flex items-center justify-center overflow-hidden">
          {recipe.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <ChefHat className="h-10 w-10 text-ink-500" />
          )}
        </div>
      </div>
      <div className="px-5 pb-5 pt-1">
        <h3 className="font-semibold text-ink-900 mb-2 truncate tracking-tight">
          {recipe.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags?.slice(0, 4).map((tag, i) => {
            const variants = ["tag-brand", "tag-sage", "tag-lavender", "tag"];
            const cls = variants[i % variants.length];
            return (
              <span key={i} className={cls}>
                {tag}
              </span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
