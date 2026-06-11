// FINANCE FORK: monthly balance walk, bucketed by [L|I|R|D] account name prefix.
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { AccountEntity } from '@actual-app/core/types/models';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

export type CompositionBucket = 'liquid' | 'investments' | 'realEstate' | 'debt';

export type CompositionPoint = {
  /** 'yyyy-MM' */
  month: string;
  liquid: number;
  investments: number;
  realEstate: number;
  debt: number;
  total: number;
};

export type NetWorthCompositionData = {
  start: string;
  end: string;
  months: CompositionPoint[];
};

const PREFIX_MAP: Record<string, CompositionBucket> = {
  L: 'liquid',
  I: 'investments',
  R: 'realEstate',
  D: 'debt',
};

export function parseBucket(name: string): CompositionBucket {
  const match = name.match(/^\[(L|I|R|D)\]/);
  if (match) return PREFIX_MAP[match[1]];
  return 'liquid';
}

type AccountMonthRow = { account: string; month: string; amount: number };

async function queryAccountMonthSums(
  accountIds: string[],
  end: string,
): Promise<AccountMonthRow[]> {
  if (accountIds.length === 0) return [];
  const { data } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [
          { account: { $oneof: accountIds } },
          { date: { $lte: end } },
        ],
      })
      .groupBy(['account', { $month: '$date' }])
      .select([
        'account',
        { month: { $month: '$date' } },
        { amount: { $sum: '$amount' } },
      ]),
  );
  return data as AccountMonthRow[];
}

const LOOKBACK_MONTHS = 24;

export function createNetWorthCompositionSpreadsheet(accounts: AccountEntity[]) {
  return async (
    _spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: NetWorthCompositionData) => void,
  ) => {
    const currentMonth = monthUtils.currentMonth();
    const startMonth = monthUtils.subMonths(currentMonth, LOOKBACK_MONTHS - 1);
    const start = startMonth + '-01';
    const end = monthUtils.currentDay();

    const months = monthUtils.rangeInclusive(startMonth, currentMonth);
    const accountIds = accounts.map(a => a.id);
    const rows = await queryAccountMonthSums(accountIds, end);

    const seriesByAccount = new Map<
      string,
      {
        bucket: CompositionBucket;
        starting: number;
        deltas: Map<string, number>;
      }
    >();
    for (const account of accounts) {
      seriesByAccount.set(account.id, {
        bucket: parseBucket(account.name),
        starting: 0,
        deltas: new Map(),
      });
    }
    for (const row of rows) {
      const entry = seriesByAccount.get(row.account);
      if (!entry) continue;
      if (monthUtils.isBefore(row.month, startMonth)) {
        entry.starting += row.amount;
      } else {
        entry.deltas.set(row.month, row.amount);
      }
    }

    const accountSeries = [...seriesByAccount.values()].map(entry => {
      let running = entry.starting;
      const balances = months.map(m => {
        running += entry.deltas.get(m) ?? 0;
        return running;
      });
      return { bucket: entry.bucket, balances };
    });

    const result: CompositionPoint[] = months.map((month, idx) => {
      let liquid = 0,
        investments = 0,
        realEstate = 0,
        debt = 0;
      for (const series of accountSeries) {
        const v = series.balances[idx];
        switch (series.bucket) {
          case 'liquid':
            liquid += v;
            break;
          case 'investments':
            investments += v;
            break;
          case 'realEstate':
            realEstate += v;
            break;
          case 'debt':
            debt += v;
            break;
        }
      }
      return {
        month,
        liquid,
        investments,
        realEstate,
        debt,
        total: liquid + investments + realEstate + debt,
      };
    });

    setData({ start, end, months: result });
  };
}
