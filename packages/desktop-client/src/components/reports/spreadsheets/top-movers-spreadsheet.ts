// FINANCE FORK: per-category current-month vs trailing-3-month average.
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import { buildFlowFilter } from './flowFilter';

export type TopMoverRow = {
  /** Category id (the filter guarantees non-null). */
  category: string;
  /** Current month spend, positive cents. */
  current: number;
  /** Trailing-3-month average spend, positive cents. */
  baseline: number;
  /** current - baseline, signed positive cents. */
  delta: number;
};

export type TopMoversData = {
  /** 'yyyy-MM' label of the current window. */
  currentMonth: string;
  /** First/last day of the trailing-3-month window. */
  baselineStart: string;
  baselineEnd: string;
  upMovers: TopMoverRow[];
  downMovers: TopMoverRow[];
};

type CategoryAmountRow = { category: string; amount: number };

async function queryByCategory(
  start: string,
  end: string,
): Promise<CategoryAmountRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter(buildFlowFilter(start, end, 'expense'))
      .groupBy([{ $id: '$category' }])
      .select([
        { category: { $id: '$category' } },
        { amount: { $sum: '$amount' } },
      ]),
  );
  return data as CategoryAmountRow[];
}

const TOP_N_PER_SIDE = 5;

export const getTopMoversData = async (
  _spreadsheet: ReturnType<typeof useSpreadsheet>,
  setData: (data: TopMoversData) => void,
) => {
  const currentMonth = monthUtils.currentMonth();
  const currentStart = currentMonth + '-01';
  const currentEnd = monthUtils.getMonthEnd(currentStart);

  // Baseline excludes the current month so the delta has signal.
  const baselineStartMonth = monthUtils.subMonths(currentMonth, 3);
  const baselineEndMonth = monthUtils.subMonths(currentMonth, 1);
  const baselineStart = baselineStartMonth + '-01';
  const baselineEnd = monthUtils.getMonthEnd(baselineEndMonth + '-01');

  const [current, baseline] = await Promise.all([
    queryByCategory(currentStart, currentEnd),
    queryByCategory(baselineStart, baselineEnd),
  ]);

  // amount is stored negative-for-expense; flip to positive for display.
  const byKey = new Map<string, { current: number; baselineTotal: number }>();
  for (const row of current) {
    const entry = byKey.get(row.category) ?? { current: 0, baselineTotal: 0 };
    entry.current += -row.amount;
    byKey.set(row.category, entry);
  }
  for (const row of baseline) {
    const entry = byKey.get(row.category) ?? { current: 0, baselineTotal: 0 };
    entry.baselineTotal += -row.amount;
    byKey.set(row.category, entry);
  }

  const rows: TopMoverRow[] = [...byKey.entries()].map(
    ([category, { current, baselineTotal }]) => {
      const baseline = Math.round(baselineTotal / 3);
      return {
        category,
        current,
        baseline,
        delta: current - baseline,
      };
    },
  );

  const upMovers = rows
    .filter(r => r.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, TOP_N_PER_SIDE);

  const downMovers = rows
    .filter(r => r.delta < 0)
    .sort((a, b) => a.delta - b.delta) // most negative first
    .slice(0, TOP_N_PER_SIDE);

  setData({
    currentMonth,
    baselineStart,
    baselineEnd,
    upMovers,
    downMovers,
  });
};
