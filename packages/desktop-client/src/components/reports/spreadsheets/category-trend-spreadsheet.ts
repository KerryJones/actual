// FINANCE FORK: top-9 expense categories with 12-month series + baseline.
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import { buildFlowFilter } from './flowFilter';

export type CategoryTrendSeries = {
  /** Category id (the filter guarantees non-null). */
  category: string;
  /** 12 months of positive cents (oldest first, indexed by data.months). */
  values: number[];
  /** Trailing-3-month average (positive cents). */
  baseline: number;
};

export type CategoryTrendData = {
  /** Ordered 'yyyy-MM' labels (length 12). */
  months: string[];
  start: string;
  end: string;
  series: CategoryTrendSeries[];
};

type CategoryMonthRow = {
  category: string;
  month: string;
  amount: number;
};

const TOP_N = 9;

async function queryByCategoryAndMonth(
  start: string,
  end: string,
): Promise<CategoryMonthRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter(buildFlowFilter(start, end, 'expense'))
      .groupBy([{ $id: '$category' }, { $month: '$date' }])
      .select([
        { category: { $id: '$category' } },
        { month: { $month: '$date' } },
        { amount: { $sum: '$amount' } },
      ]),
  );
  return data as CategoryMonthRow[];
}

export const getCategoryTrendData = async (
  _spreadsheet: ReturnType<typeof useSpreadsheet>,
  setData: (data: CategoryTrendData) => void,
) => {
  const currentMonth = monthUtils.currentMonth();
  const startMonth = monthUtils.subMonths(currentMonth, 11);
  const start = startMonth + '-01';
  const end = monthUtils.currentDay();

  const rows = await queryByCategoryAndMonth(start, end);

  const months = monthUtils.rangeInclusive(startMonth, currentMonth);
  const monthIndex = new Map(months.map((m, i) => [m, i]));

  const byCategory = new Map<
    string,
    { total: number; values: number[] }
  >();
  for (const row of rows) {
    const idx = monthIndex.get(row.month);
    if (idx == null) continue;
    const positiveCents = -row.amount;
    const entry = byCategory.get(row.category) ?? {
      total: 0,
      values: new Array<number>(months.length).fill(0),
    };
    entry.values[idx] += positiveCents;
    entry.total += positiveCents;
    byCategory.set(row.category, entry);
  }

  const top = [...byCategory.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, TOP_N);

  const series: CategoryTrendSeries[] = top.map(([category, { values }]) => {
    const last3 = values.slice(-3);
    const baseline = Math.round(last3.reduce((a, b) => a + b, 0) / 3);
    return { category, values, baseline };
  });

  setData({ months, start, end, series });
};
