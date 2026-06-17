// FINANCE FORK: detect recurring payees by ≥3 occurrences + stdev/mean ≤ 0.1 + median gap in cadence band.
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

export type RecurringCadence = 'monthly' | 'quarterly' | 'yearly';

export type RecurringRow = {
  payee: string;
  count: number;
  cadence: RecurringCadence;
  /** Mean per-charge amount in positive cents (pre-cadence-normalization). */
  meanCharge: number;
  /** Normalized to monthly equivalent, positive cents. */
  monthlyCost: number;
  /** monthlyCost * 12, positive cents. */
  annualCost: number;
  /** Most recent charge date ('yyyy-MM-dd'). */
  lastCharged: string;
};

export type RecurringAuditorData = {
  /** Number of transactions inspected. */
  transactionsInspected: number;
  rows: RecurringRow[];
  /** Sum of charges projected to hit in the next 30 days, positive cents. */
  next30DaysTotal: number;
};

type TxnRow = {
  payee: string | null;
  date: string;
  amount: number;
};

const CADENCE_BANDS: Record<RecurringCadence, [number, number]> = {
  monthly: [28, 31],
  quarterly: [85, 95],
  yearly: [355, 375],
};

const CADENCE_MULTIPLIER: Record<RecurringCadence, number> = {
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

const CADENCE_DAYS: Record<RecurringCadence, number> = {
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

const MIN_OCCURRENCES = 3;
const MAX_VARIANCE = 0.1;
const LOOKBACK_MONTHS = 24;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function classifyCadence(medianGapDays: number): RecurringCadence | null {
  let best: { cadence: RecurringCadence; distance: number } | null = null;
  for (const [cadenceKey, [lo, hi]] of Object.entries(CADENCE_BANDS) as Array<
    [RecurringCadence, [number, number]]
  >) {
    if (medianGapDays >= lo && medianGapDays <= hi) {
      const target = (lo + hi) / 2;
      const distance = Math.abs(medianGapDays - target);
      if (!best || distance < best.distance) {
        best = { cadence: cadenceKey, distance };
      }
    }
  }
  return best?.cadence ?? null;
}

export const getRecurringAuditorData = async (
  _spreadsheet: ReturnType<typeof useSpreadsheet>,
  setData: (data: RecurringAuditorData) => void,
) => {
  const end = monthUtils.currentDay();
  const startMonth = monthUtils.subMonths(
    monthUtils.currentMonth(),
    LOOKBACK_MONTHS - 1,
  );
  const start = startMonth + '-01';

  const { data: rawData } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [
          { date: { $gte: start } },
          { date: { $lte: end } },
          { amount: { $lt: 0 } },
          { 'account.offbudget': false },
          { 'payee.transfer_acct': null },
          { payee: { $ne: null } },
        ],
      })
      .orderBy('date')
      .select(['payee', 'date', 'amount']),
  );
  const transactions = rawData as TxnRow[];

  const byPayee = new Map<string, TxnRow[]>();
  for (const txn of transactions) {
    if (!txn.payee) continue;
    const arr = byPayee.get(txn.payee) ?? [];
    arr.push(txn);
    byPayee.set(txn.payee, arr);
  }

  const rows: RecurringRow[] = [];

  for (const [payee, txns] of byPayee.entries()) {
    if (txns.length < MIN_OCCURRENCES) continue;

    const amounts = txns.map(t => -t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (mean <= 0) continue;
    const variance =
      amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const stdev = Math.sqrt(variance);
    if (stdev / mean > MAX_VARIANCE) continue;

    const gaps: number[] = [];
    for (let i = 1; i < txns.length; i++) {
      gaps.push(
        monthUtils.differenceInCalendarDays(txns[i].date, txns[i - 1].date),
      );
    }
    const medianGap = median(gaps);
    const cadence = classifyCadence(medianGap);
    if (!cadence) continue;

    const meanCharge = Math.round(mean);
    const monthlyCost = Math.round(mean * CADENCE_MULTIPLIER[cadence]);
    rows.push({
      payee,
      count: txns.length,
      cadence,
      meanCharge,
      monthlyCost,
      annualCost: monthlyCost * 12,
      lastCharged: txns[txns.length - 1].date,
    });
  }

  rows.sort((a, b) => b.annualCost - a.annualCost);

  // Project the next-30-days total: include any recurring row whose next
  // expected charge falls in [today, today+30]. Overdue charges (lastCharged
  // older than the cadence) are treated as "due immediately" — they almost
  // always hit within 30 days as the sync catches up, and silently dropping
  // them under-reports upcoming spend. Future-dated lastCharged (scheduled
  // transactions pre-entered) clamp the projected next charge to today.
  const today = monthUtils.currentDay();
  let next30DaysTotal = 0;
  for (const row of rows) {
    const cadenceDays = CADENCE_DAYS[row.cadence];
    const daysSinceLast = monthUtils.differenceInCalendarDays(
      today,
      row.lastCharged,
    );
    const daysUntilNext = Math.max(0, cadenceDays - daysSinceLast);
    if (daysUntilNext <= 30) {
      next30DaysTotal += row.meanCharge;
    }
  }

  setData({
    transactionsInspected: transactions.length,
    rows,
    next30DaysTotal,
  });
};
