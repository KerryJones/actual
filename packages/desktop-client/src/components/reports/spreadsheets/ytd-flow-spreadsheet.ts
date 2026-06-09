import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

export type YTDFlowData = {
  start: string;
  end: string;
  /** Cents (IntegerAmount), positive. */
  income: number;
  /** Cents (IntegerAmount), positive (sign-normalized from Actual's
   * negative-for-expense storage convention). */
  expense: number;
};

// Uses the same is_income filter as month-over-month-spreadsheet so the
// two cards' numbers reconcile.
async function querySum(
  start: string,
  end: string,
  kind: 'income' | 'expense',
): Promise<number> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [
          { date: { $gte: start } },
          { date: { $lte: end } },
          { amount: { [kind === 'income' ? '$gt' : '$lt']: 0 } },
          { 'account.offbudget': false },
          { 'payee.transfer_acct': null },
          { 'category.is_income': kind === 'income' },
        ],
      })
      .select([{ amount: { $sum: '$amount' } }]),
  );
  const sum = (data as { amount: number }[])[0]?.amount ?? 0;
  return kind === 'expense' ? -sum : sum;
}

export const getYTDFlowData = async (
  _spreadsheet: ReturnType<typeof useSpreadsheet>,
  setData: (data: YTDFlowData) => void,
) => {
  const end = monthUtils.currentDay();
  const start = `${monthUtils.currentYear()}-01-01`;
  const [income, expense] = await Promise.all([
    querySum(start, end, 'income'),
    querySum(start, end, 'expense'),
  ]);
  setData({ start, end, income, expense });
};
