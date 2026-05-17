// FINANCE FORK: shared spreadsheet for two-window category comparisons.
// Used by MonthOverMonthCard (current vs previous month) and YTDCategoryCard
// (YTD this year vs same period last year). Returns per-category totals for
// each window, in cents and as-recorded sign (expenses are negative).
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

export type CategoryWindowComparison = {
  // category id, or '__uncategorized__' when the transaction has no category
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
  category: string | null;
  amount: number;
};

async function queryCategoryTotals(
  startDate: string,
  endDate: string,
): Promise<CategoryAmountRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [
          { date: { $gte: startDate } },
          { date: { $lte: endDate } },
          { amount: { $lt: 0 } },
          { 'account.offbudget': false },
          { 'category.is_income': false },
        ],
      })
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

    const keyOf = (r: CategoryAmountRow) => r.category ?? '__uncategorized__';

    const byKey = new Map<string, { currentTotal: number; previousTotal: number }>();
    for (const row of current) {
      const k = keyOf(row);
      const entry = byKey.get(k) ?? { currentTotal: 0, previousTotal: 0 };
      entry.currentTotal += row.amount;
      byKey.set(k, entry);
    }
    for (const row of previous) {
      const k = keyOf(row);
      const entry = byKey.get(k) ?? { currentTotal: 0, previousTotal: 0 };
      entry.previousTotal += row.amount;
      byKey.set(k, entry);
    }

    // Sort by absolute current-window size descending (biggest spend first).
    const rows: CategoryWindowComparison[] = [...byKey.entries()]
      .map(([category, totals]) => ({ category, ...totals }))
      .sort(
        (a, b) => Math.abs(b.currentTotal) - Math.abs(a.currentTotal),
      );

    setData({
      rows,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    });
  };
}
