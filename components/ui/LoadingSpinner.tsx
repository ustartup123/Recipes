"use client";
import { cn } from "@/lib/utils";
import { Fish } from "lucide-react";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-teal-500",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-2 border-slate-800 border-t-teal-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Fish className="h-6 w-6 text-teal-400" />
          </div>
        </div>
        <p className="text-slate-500 text-sm font-mono">Loading...</p>
      </div>
    </div>
  );
}
