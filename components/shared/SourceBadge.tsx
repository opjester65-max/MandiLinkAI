import React from 'react';

interface SourceBadgeProps {
  source:
    | 'sandbox'
    | 'live'
    | 'recorded'
    | 'simulated'
    | 'fixture'
    | 'gemma'
    | 'gemini'
    | 'snowflake'
    | 'solana';
  className?: string;
}

export function SourceBadge({ source, className = '' }: SourceBadgeProps) {
  switch (source) {
    case 'sandbox':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-950 border border-amber-300 shadow-2xs ${className}`}
          title="Isolated browser memory sandbox with deterministic sample data"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Practice market
        </span>
      );
    case 'live':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
          Live
        </span>
      );
    case 'recorded':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-950 border border-blue-300 ${className}`}
        >
          Recorded
        </span>
      );
    case 'simulated':
    case 'fixture':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 ${className}`}
        >
          Simulated
        </span>
      );
    case 'gemini':
    case 'gemma':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-900 border border-blue-200 ${className}`}
        >
          Gemini 2.5 Flash
        </span>
      );
    case 'snowflake':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-950 border border-cyan-200 ${className}`}
        >
          Snowflake Model (Simulated)
        </span>
      );
    case 'solana':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-950 border border-purple-200 ${className}`}
        >
          Solana Registry (Simulated)
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
