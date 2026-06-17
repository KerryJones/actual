// FINANCE FORK: trailing-12-month savings rate per calendar month.
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import { buildFlowFilter, type FlowKind } from './flowFilter';

export type SavingsRatePoint = {
  /** 'yyyy-MM' */
  month: string;
  /** cents, positive */
  income: number;
  /** cents, positive (sign-normalized from negative-for-expense storage) */
  expense: number;
  /** -1..1 */
  rate: number;
};

export type SavingsRateData = {
  start: string;
  end: string;
  months: SavingsRatePoint[];
  /** Trailing-12-month aggregate rate, in -1..1 */
  trailingRate: number;
  /** Year-to-date aggregate rate, in -1..1 */
  ytdRate: number;
};

type MonthRow = { month: string; amount: number };

async function queryMonthly(
  start: string,
  end: string,
  kind: FlowKind,
): Promise<MonthRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter(buildFlowFilter(start, end, kind))
      .groupBy([{ $month: '$date' }])
      .select([
        { month: { $month: '$date' } },
        { amount: { $sum: '$amount' } },
      ]),
  );
  return (data as MonthRow[]).map(row => ({
    month: row.month,
    amount: kind === 'expense' ? -row.amount : row.amount,
  }));
}

export const getSavingsRateData = async (
  _spreadsheet: ReturnType<typeof useSpreadsheet>,
  setData: (data: SavingsRateData) => void,
) => {
  const currentMonth = monthUtils.currentMonth();
  const startMonth = monthUtils.subMonths(currentMonth, 11);
  const start = startMonth + '-01';
  const end = monthUtils.currentDay();

  const [income, expense] = await Promise.all([
    queryMonthly(start, end, 'income'),
    queryMonthly(start, end, 'expense'),
  ]);

  const incomeByMonth = new Map(income.map(r => [r.month, r.amount]));
  const expenseByMonth = new Map(expense.map(r => [r.month, r.amount]));

  const months = monthUtils.rangeInclusive(startMonth, currentMonth).map(m => {
    const i = incomeByMonth.get(m) ?? 0;
    const e = expenseByMonth.get(m) ?? 0;
    const rate = i > 0 ? Math.max(-1, Math.min(1, (i - e) / i)) : 0;
    return { month: m, income: i, expense: e, rate };
  });

  const totalIncome = months.reduce((a, m) => a + m.income, 0);
  const totalExpense = months.reduce((a, m) => a + m.expense, 0);
  const trailingRate =
    totalIncome > 0
      ? Math.max(-1, Math.min(1, (totalIncome - totalExpense) / totalIncome))
      : 0;

  const ytdPrefix = currentMonth.slice(0, 4) + '-';
  const ytdMonths = months.filter(m => m.month.startsWith(ytdPrefix));
  const ytdIncome = ytdMonths.reduce((a, m) => a + m.income, 0);
  const ytdExpense = ytdMonths.reduce((a, m) => a + m.expense, 0);
  const ytdRate =
    ytdIncome > 0
      ? Math.max(-1, Math.min(1, (ytdIncome - ytdExpense) / ytdIncome))
      : 0;

  setData({ start, end, months, trailingRate, ytdRate });
};
