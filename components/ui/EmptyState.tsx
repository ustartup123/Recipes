"use client";

import { Fish } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Fish, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 h-14 w-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
        <Icon className="h-7 w-7 text-teal-400 opacity-60" />
      </div>
      <h3 className="text-lg font-bold font-mono text-slate-300 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
