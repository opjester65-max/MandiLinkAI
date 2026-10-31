import React from 'react';

interface QuantityProps {
  grams: number;
  className?: string;
  showKgOnly?: boolean;
}

export function Quantity({ grams, className = '', showKgOnly = false }: QuantityProps) {
  const kg = grams / 1000;
  const isWholeKg = grams % 1000 === 0;

  return (
    <span className={`font-mono tabular-nums font-medium ${className}`}>
      {showKgOnly || isWholeKg ? `${kg.toLocaleString()} kg` : `${kg.toFixed(2)} kg (${grams.toLocaleString()} g)`}
    </span>
  );
}
