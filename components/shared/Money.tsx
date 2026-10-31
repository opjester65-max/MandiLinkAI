import React from 'react';
import { paisaToPkr } from '../../lib/contracts';

interface MoneyProps {
  paisa: number;
  perKg?: boolean;
  className?: string;
}

export function Money({ paisa, perKg = false, className = '' }: MoneyProps) {
  const pkr = paisaToPkr(paisa);
  const formatted =
    pkr % 1 === 0
      ? pkr.toLocaleString('en-PK')
      : pkr.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <span className={`font-mono tabular-nums font-semibold tracking-tight ${className}`}>
      PKR {formatted}
      {perKg && <span className="text-xs font-normal text-stone-600">/kg</span>}
    </span>
  );
}
