import React from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { SparkAreaChart } from '@tremor/react';

import { theme } from '@actual-app/components/theme';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

type SparklinePoint = { x: string; y: number };
type DeltaDirection = 'up' | 'down';

type KPIProps = {
  label?: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { value: string; direction: DeltaDirection };
  sparkline?: SparklinePoint[];
};

// Pill background uses a 15%-opacity wash of the same token as the pill text,
// so the two track each other when theme tokens change. Computed at module
// load because theme.* are static CSS var strings.
const PILL: Record<DeltaDirection, { glyph: string; style: CSSProperties }> = {
  up: {
    glyph: '↑',
    style: {
      backgroundColor: `color-mix(in srgb, ${theme.numberPositive} 15%, transparent)`,
      color: theme.numberPositive,
    },
  },
  down: {
    glyph: '↓',
    style: {
      backgroundColor: `color-mix(in srgb, ${theme.numberNegative} 15%, transparent)`,
      color: theme.numberNegative,
    },
  },
};

export function KPI({ label, value, hint, delta, sparkline }: KPIProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex flex-col gap-2">
        {label != null && (
          <div
            className="text-xs uppercase tracking-wider"
            style={{ color: theme.pageTextLight }}
          >
            {label}
          </div>
        )}
        <div className="flex items-baseline gap-3">
          <div
            className="font-semibold leading-none"
            style={{ color: theme.pageTextDark }}
          >
            {value}
          </div>
          {delta && (
            <span
              className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={PILL[delta.direction].style}
            >
              {PILL[delta.direction].glyph}&nbsp;{delta.value}
            </span>
          )}
        </div>
        {hint != null && (
          <div className="text-xs" style={{ color: theme.pageTextSubdued }}>
            {hint}
          </div>
        )}
      </div>
      {sparkline &&
        (sparkline.length > 1 ? (
          <SparkAreaChart
            data={sparkline}
            categories={['y']}
            index="x"
            colors={['indigo']}
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
  isNegative?: boolean;
};

export function KPICurrency({
  amount,
  showSign = false,
  isNegative = false,
}: CurrencyProps) {
  const format = useFormat();
  const symbol = format.currency.symbol || '$';
  const sign = amount < 0 ? '−' : showSign && amount > 0 ? '+' : '';
  const digits = format(Math.round(Math.abs(amount)), 'number');
  return (
    <PrivacyFilter>
      <span className="inline-flex items-baseline">
        <span className="text-2xl" style={{ color: theme.pageTextLight }}>
          {sign}
          {symbol}
        </span>
        <span
          className="text-4xl tabular-nums"
          style={{
            color: isNegative ? theme.numberNegative : theme.pageTextDark,
          }}
        >
          {digits}
        </span>
      </span>
    </PrivacyFilter>
  );
}

type PercentageProps = {
  /** Value as 0..1 (e.g. 0.243 → 24.3%). */
  fraction: number;
  precision?: number;
};

export function KPIPercentage({ fraction, precision = 1 }: PercentageProps) {
  const pct = (fraction * 100).toFixed(precision);
  return (
    <PrivacyFilter>
      <span className="inline-flex items-baseline">
        <span
          className="text-4xl tabular-nums"
          style={{ color: theme.pageTextDark }}
        >
          {pct}
        </span>
        <span className="text-2xl" style={{ color: theme.pageTextLight }}>
          %
        </span>
      </span>
    </PrivacyFilter>
  );
}
