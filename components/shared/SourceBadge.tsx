import React from 'react';

interface SourceBadgeProps {
  source: 'sandbox' | 'live' | 'fixture' | 'gemma' | 'snowflake' | 'solana';
  className?: string;
}

export function SourceBadge({ source, className = '' }: SourceBadgeProps) {
  switch (source) {
    case 'sandbox':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs ${className}`}
          title="Isolated browser memory sandbox with deterministic fixtures"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Practice market
        </span>
      );
    case 'live':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Live workspace
        </span>
      );
    case 'gemma':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 ${className}`}
        >
          Gemma 4 Vision
        </span>
      );
    case 'snowflake':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-900 border border-cyan-200 ${className}`}
        >
          Snowflake CoCo
        </span>
      );
    case 'solana':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200 ${className}`}
        >
          Solana Agent Registry
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-800 ${className}`}>
          {source}
        </span>
      );
  }
}
