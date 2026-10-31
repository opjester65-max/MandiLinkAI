import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ApiErrorDetail } from '../../lib/contracts';

interface RetryPanelProps {
  error: ApiErrorDetail | string;
  onRetry?: () => void;
  onSwitchToSandbox?: () => void;
  className?: string;
}

export function RetryPanel({ error, onRetry, onSwitchToSandbox, className = '' }: RetryPanelProps) {
  const isString = typeof error === 'string';
  const code = !isString ? error.code : 'ERROR';
  const message = !isString ? error.message : error;
  const isMissingCreds = code === 'MISSING_SUPABASE_OR_POSTGRES_CREDENTIALS';

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border border-amber-300 bg-amber-50/70 text-stone-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              {code}
            </span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed mb-3">{message}</p>
          <div className="flex flex-wrap items-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry request
              </button>
            )}
            {isMissingCreds && onSwitchToSandbox && (
              <button
                onClick={onSwitchToSandbox}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer"
              >
                Switch to Practice Market
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
