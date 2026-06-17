// FINANCE FORK: top spending categories MTD with prior-month delta.
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import { buildFlowFilter } from './flowFilter';

export type TopCategoryRow = {
  /** Category id (the filter guarantees non-null). */
  category: string;
  /** Current-month spend, positive cents. */
  current: number;
  /** Prior-month spend, positive cents. */
  previous: number;
  /** (current - previous) / previous, or 0 if previous is 0. */
  deltaPct: number;
};

export type TopCategoriesData = {
  currentMonth: string;
  previousMonth: string;
  rows: TopCategoryRow[];
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

const TOP_N = 6;

export const getTopCategoriesData = async (
  _spreadsheet: ReturnType<typeof useSpreadsheet>,
  setData: (data: TopCategoriesData) => void,
) => {
  const currentMonth = monthUtils.currentMonth();
  const currentStart = currentMonth + '-01';
  // Cap "current month" at today so future-dated scheduled transactions
  // don't inflate MTD spend or skew the MoM delta.
  const today = monthUtils.currentDay();
  const monthEnd = monthUtils.getMonthEnd(currentStart);
  const currentEnd = today < monthEnd ? today : monthEnd;

  const previousMonth = monthUtils.subMonths(currentMonth, 1);
  const previousStart = previousMonth + '-01';
  const previousEnd = monthUtils.getMonthEnd(previousStart);

  const [current, previous] = await Promise.all([
    queryByCategory(currentStart, currentEnd),
    queryByCategory(previousStart, previousEnd),
  ]);

  const byKey = new Map<string, { current: number; previous: number }>();
  for (const row of current) {
    const entry = byKey.get(row.category) ?? { current: 0, previous: 0 };
    entry.current += -row.amount;
    byKey.set(row.category, entry);
  }
  for (const row of previous) {
    const entry = byKey.get(row.category) ?? { current: 0, previous: 0 };
    entry.previous += -row.amount;
    byKey.set(row.category, entry);
  }

  const rows: TopCategoryRow[] = [...byKey.entries()]
    .map(([category, { current, previous }]) => ({
      category,
      current,
      previous,
      deltaPct: previous !== 0 ? (current - previous) / previous : 0,
    }))
    .filter(r => r.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, TOP_N);

  setData({ currentMonth, previousMonth, rows });
};
