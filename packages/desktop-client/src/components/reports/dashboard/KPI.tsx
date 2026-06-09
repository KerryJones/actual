import React from 'react';
import type { ReactNode } from 'react';

import { SparkAreaChart } from '@tremor/react';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

type SparklinePoint = { x: string; y: number };
type DeltaDirection = 'up' | 'down' | 'flat';

type KPIProps = {
  label?: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { value: string; direction: DeltaDirection };
  sparkline?: SparklinePoint[];
};

const DELTA: Record<DeltaDirection, { glyph: string; classes: string }> = {
  up: { glyph: '↑', classes: 'bg-emerald-500/15 text-emerald-300' },
  down: { glyph: '↓', classes: 'bg-rose-500/15 text-rose-300' },
  flat: { glyph: '·', classes: 'bg-slate-500/15 text-slate-300' },
};

export function KPI({ label, value, hint, delta, sparkline }: KPIProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex flex-col gap-2">
        {label != null && (
          <div className="text-xs uppercase tracking-wider text-slate-400">
            {label}
          </div>
        )}
        <div className="flex items-baseline gap-3">
          <div className="font-semibold leading-none text-slate-100">
            {value}
          </div>
          {delta && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${DELTA[delta.direction].classes}`}
            >
              {DELTA[delta.direction].glyph}&nbsp;{delta.value}
            </span>
          )}
        </div>
        {hint != null && (
          <div className="text-xs text-slate-500">{hint}</div>
        )}
      </div>
      {sparkline &&
        (sparkline.length > 1 ? (
          <SparkAreaChart
            data={sparkline}
            categories={['y']}
            index="x"
            colors={['violet']}
            className="h-16 w-full"
          />
        ) : (
          // Reserve the slot so a parent that sometimes has data and sometimes
          // doesn't (initial load, partial range) doesn't reflow the card.
          <div className="h-16 w-full" />
        ))}
    </div>
  );
}

type CurrencyProps = {
  amount: number;
  showSign?: boolean;
};

KPI.Currency = function Currency({ amount, showSign = false }: CurrencyProps) {
  const format = useFormat();
  const symbol = format.currency.symbol || '$';
  const sign = amount < 0 ? '−' : showSign && amount > 0 ? '+' : '';
  const digits = format(Math.round(Math.abs(amount)), 'number');
  return (
    <span className="inline-flex items-baseline">
      <span className="text-2xl text-slate-400">
        {sign}
        {symbol}
      </span>
      <span className="text-4xl tabular-nums">
        <PrivacyFilter>{digits}</PrivacyFilter>
      </span>
    </span>
  );
};

type PercentageProps = {
  /** Value as 0..1 (e.g. 0.243 → 24.3%). */
  fraction: number;
  precision?: number;
};

KPI.Percentage = function Percentage({
  fraction,
  precision = 1,
}: PercentageProps) {
  const pct = (fraction * 100).toFixed(precision);
  return (
    <span className="inline-flex items-baseline">
      <span className="text-4xl tabular-nums">
        <PrivacyFilter>{pct}</PrivacyFilter>
      </span>
      <span className="text-2xl text-slate-400">%</span>
    </span>
  );
};
