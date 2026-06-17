// FINANCE FORK: monthly net worth running totals for hero + trend cards.
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

export type NetWorthTrendPoint = {
  /** 'yyyy-MM' */
  month: string;
  /** Running net worth at month-end in cents. */
  value: number;
};

export type NetWorthTrendData = {
  start: string;
  end: string;
  /** Oldest first. */
  months: NetWorthTrendPoint[];
  /** Current net worth (last month value). */
  netWorth: number;
  /** netWorth - previousMonth value (signed cents). */
  momDelta: number;
  /** momDelta / |previousMonth value|, or 0 if previous is 0. */
  momPct: number;
  /**
   * True when the earliest transaction is on or before the window start —
   * i.e. the running totals reflect real data across the full requested
   * range. Cards use this to gate prior-year overlays so a brand-new user
   * doesn't see a flat-$0 line stitched onto the front of the chart.
   */
  hasFullHistory: boolean;
};

type MonthAmountRow = { month: string; amount: number };

async function queryStartingBalance(start: string): Promise<number> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter({ date: { $lt: start } })
      .calculate({ $sum: '$amount' }),
  );
  return (data as number) ?? 0;
}

async function queryMonthlyDeltas(
  start: string,
  end: string,
): Promise<MonthAmountRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [{ date: { $gte: start } }, { date: { $lte: end } }],
      })
      .groupBy({ $month: '$date' })
      .select([
        { month: { $month: '$date' } },
        { amount: { $sum: '$amount' } },
      ]),
  );
  return data as MonthAmountRow[];
}

/**
 * Builds a getter for the trailing N months of net worth (current month included).
 * N=12 by default for the hero sparkline; the trend card passes 24.
 */
export function createNetWorthTrendSpreadsheet(months: number = 12) {
  return async (
    _spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: NetWorthTrendData) => void,
  ) => {
    const currentMonth = monthUtils.currentMonth();
    const startMonth = monthUtils.subMonths(currentMonth, months - 1);
    const start = startMonth + '-01';
    const end = monthUtils.currentDay();

    const [startingBalance, monthlyDeltas, earliestTransaction] =
      await Promise.all([
        queryStartingBalance(start),
        queryMonthlyDeltas(start, end),
        send('get-earliest-transaction'),
      ]);
    const hasFullHistory =
      !!earliestTransaction && earliestTransaction.date <= start;

    const deltaByMonth = new Map(
      monthlyDeltas.map(r => [r.month, r.amount]),
    );

    let running = startingBalance;
    const points: NetWorthTrendPoint[] = monthUtils
      .rangeInclusive(startMonth, currentMonth)
      .map(month => {
        running += deltaByMonth.get(month) ?? 0;
        return { month, value: running };
      });

    const netWorth = points[points.length - 1]?.value ?? 0;
    const previous = points[points.length - 2]?.value ?? 0;
    const momDelta = netWorth - previous;
    const momPct = previous !== 0 ? momDelta / Math.abs(previous) : 0;

    setData({
      start,
      end,
      months: points,
      netWorth,
      momDelta,
      momPct,
      hasFullHistory,
    });
  };
}
