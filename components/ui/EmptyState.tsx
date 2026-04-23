"use client";

import { Soup } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Soup, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="mb-5 h-20 w-20 rounded-3xl bg-gradient-to-br from-peach-300 to-peach-200 flex items-center justify-center shadow-soft">
        <Icon className="h-9 w-9 text-brand-600" />
      </div>
      <h3 className="text-xl font-bold text-ink-900 mb-2 tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-ink-700 mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
