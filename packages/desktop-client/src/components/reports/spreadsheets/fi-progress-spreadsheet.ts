// FINANCE FORK: FI progress = net worth / (annual expense × 25).
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { AccountEntity } from '@actual-app/core/types/models';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import { buildFlowFilter } from './flowFilter';

export type FIProgressData = {
  /** Sum of all account balances in cents. */
  netWorth: number;
  /** Trailing-12-month expense in cents (positive). */
  annualExpense: number;
  /** 25 * annualExpense in cents. */
  fiTarget: number;
  /** 0..(no upper bound) — fraction of FI achieved. */
  progress: number;
  start: string;
  end: string;
};

async function queryNetWorth(
  accountIds: string[],
  asOfDate: string,
): Promise<number> {
  if (accountIds.length === 0) return 0;
  const { data } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [
          { account: { $oneof: accountIds } },
          { date: { $lte: asOfDate } },
        ],
      })
      .calculate({ $sum: '$amount' }),
  );
  return (data as number) ?? 0;
}

async function queryAnnualExpense(
  start: string,
  end: string,
): Promise<number> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter(buildFlowFilter(start, end, 'expense'))
      .select([{ amount: { $sum: '$amount' } }]),
  );
  const sum = (data as { amount: number }[])[0]?.amount ?? 0;
  return -sum;
}

export function createFIProgressSpreadsheet(accounts: AccountEntity[]) {
  return async (
    _spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: FIProgressData) => void,
  ) => {
    const end = monthUtils.currentDay();
    const startMonth = monthUtils.subMonths(monthUtils.currentMonth(), 11);
    const start = startMonth + '-01';
    const accountIds = accounts.map(a => a.id);

    const [netWorth, annualExpense] = await Promise.all([
      queryNetWorth(accountIds, end),
      queryAnnualExpense(start, end),
    ]);

    const fiTarget = annualExpense * 25;
    const progress = fiTarget > 0 ? netWorth / fiTarget : 0;

    setData({ netWorth, annualExpense, fiTarget, progress, start, end });
  };
}
