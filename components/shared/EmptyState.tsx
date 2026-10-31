import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="py-12 px-4 text-center border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
      {Icon && (
        <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-base font-semibold text-stone-900 mb-1">{title}</h4>
      <p className="text-sm text-stone-600 max-w-sm mx-auto mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
