// FINANCE FORK: trailing-12-month paired income/expense totals.
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import { buildFlowFilter, type FlowKind } from './flowFilter';

export type IncomeExpenseTrendPoint = {
  /** 'yyyy-MM' */
  month: string;
  /** Positive cents. */
  income: number;
  /** Positive cents. */
  expense: number;
  /** income - expense, signed cents. */
  net: number;
};

export type IncomeExpenseTrendData = {
  start: string;
  end: string;
  /** Oldest first, length 12. */
  months: IncomeExpenseTrendPoint[];
};

type MonthAmountRow = { month: string; amount: number };

async function queryMonthly(
  start: string,
  end: string,
  kind: FlowKind,
): Promise<MonthAmountRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter(buildFlowFilter(start, end, kind))
      .groupBy([{ $month: '$date' }])
      .select([
        { month: { $month: '$date' } },
        { amount: { $sum: '$amount' } },
      ]),
  );
  return (data as MonthAmountRow[]).map(row => ({
    month: row.month,
    amount: kind === 'expense' ? -row.amount : row.amount,
  }));
}

export const getIncomeExpenseTrendData = async (
  _spreadsheet: ReturnType<typeof useSpreadsheet>,
  setData: (data: IncomeExpenseTrendData) => void,
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

  const months = monthUtils
    .rangeInclusive(startMonth, currentMonth)
    .map(month => {
      const i = incomeByMonth.get(month) ?? 0;
      const e = expenseByMonth.get(month) ?? 0;
      return { month, income: i, expense: e, net: i - e };
    });

  setData({ start, end, months });
};
