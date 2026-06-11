// FINANCE FORK: two-window per-category expense comparison.
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import { buildFlowFilter } from './flowFilter';

export type CategoryWindowComparison = {
  /** category id (the filter guarantees non-null) */
  category: string;
  currentTotal: number;
  previousTotal: number;
};

export type MonthOverMonthData = {
  rows: CategoryWindowComparison[];
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

type CreateMonthOverMonthSpreadsheetProps = {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

type CategoryAmountRow = {
  category: string;
  amount: number;
};

async function queryCategoryTotals(
  startDate: string,
  endDate: string,
): Promise<CategoryAmountRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter(buildFlowFilter(startDate, endDate, 'expense'))
      .groupBy([{ $id: '$category' }])
      .select([
        { category: { $id: '$category' } },
        { amount: { $sum: '$amount' } },
      ]),
  );
  return data as CategoryAmountRow[];
}

export function createMonthOverMonthSpreadsheet({
  currentStart,
  currentEnd,
  previousStart,
  previousEnd,
}: CreateMonthOverMonthSpreadsheetProps) {
  return async (
    _spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: MonthOverMonthData) => void,
  ) => {
    const [current, previous] = await Promise.all([
      queryCategoryTotals(currentStart, currentEnd),
      queryCategoryTotals(previousStart, previousEnd),
    ]);

    const byKey = new Map<
      string,
      { currentTotal: number; previousTotal: number }
    >();
    for (const row of current) {
      const entry = byKey.get(row.category) ?? {
        currentTotal: 0,
        previousTotal: 0,
      };
      entry.currentTotal += row.amount;
      byKey.set(row.category, entry);
    }
    for (const row of previous) {
      const entry = byKey.get(row.category) ?? {
        currentTotal: 0,
        previousTotal: 0,
      };
      entry.previousTotal += row.amount;
      byKey.set(row.category, entry);
    }

    const rows: CategoryWindowComparison[] = [...byKey.entries()]
      .map(([category, totals]) => ({ category, ...totals }))
      .sort((a, b) => Math.abs(b.currentTotal) - Math.abs(a.currentTotal));

    setData({
      rows,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    });
  };
}
