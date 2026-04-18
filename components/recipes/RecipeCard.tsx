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
      <div className="aspect-[4/3] bg-slate-800 flex items-center justify-center">
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ChefHat className="h-12 w-12 text-slate-600" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-100 mb-2 truncate">
          {recipe.title}
        </h3>
        <div className="flex flex-wrap gap-1">
          {recipe.tags?.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
