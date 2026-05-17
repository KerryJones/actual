// FINANCE FORK: helper for normalizing a recurring schedule's amount to
// "what does this cost per month on average?". Used by SubscriptionsCard;
// kept as a standalone util so future features (forecasting, etc.) can reuse.
import type { RecurConfig } from '@actual-app/core/types/models';

/**
 * Convert a recurring schedule's `_amount` + `_date` (RecurConfig) into the
 * equivalent monthly cost. Returns the absolute monthly magnitude in the
 * same units as `amount` (cents in Actual's internal representation).
 *
 * Caller is responsible for sign handling — pass `Math.abs(getScheduledAmount(...))`
 * or pass the raw amount and ignore the sign of the return value.
 *
 * Approximations:
 *  - daily   → amount * 30 / interval     (treats a month as 30 days)
 *  - weekly  → amount * (52 / 12) / interval
 *  - monthly → amount / interval
 *  - yearly  → amount / (12 * interval)
 */
export function getMonthlyEquivalent(
  amount: number,
  recur: RecurConfig,
): number {
  const interval = recur.interval && recur.interval > 0 ? recur.interval : 1;
  const magnitude = Math.abs(amount);

  switch (recur.frequency) {
    case 'daily':
      return (magnitude * 30) / interval;
    case 'weekly':
      return (magnitude * (52 / 12)) / interval;
    case 'monthly':
      return magnitude / interval;
    case 'yearly':
      return magnitude / (12 * interval);
    default:
      return magnitude;
  }
}
