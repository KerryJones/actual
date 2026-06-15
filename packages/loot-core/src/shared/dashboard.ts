// FINANCE FORK: dashboard defaults rebuilt to spec — KPI strip, full-width
// Sankey, paired analytics rows, and a final list row. 12-col grid, rowHeight 100.
import type { NewDashboardWidgetEntity } from '#types/models';

type WidgetType = NewDashboardWidgetEntity['type'];

export const KPI_WIDGET_TYPES: Set<WidgetType> = new Set([
  'total-income-ytd-card',
  'total-expenses-ytd-card',
  'savings-rate-card',
  'fi-progress-card',
  'summary-card',
]);

export const WIDGET_DEFAULT_SIZE: Record<
  WidgetType,
  { width: number; height: number }
> = {
  // KPI strip — single-row hero numbers
  'total-income-ytd-card': { width: 3, height: 1 },
  'total-expenses-ytd-card': { width: 3, height: 1 },
  'savings-rate-card': { width: 3, height: 1 },
  'fi-progress-card': { width: 3, height: 1 },
  'summary-card': { width: 3, height: 1 },
  // Formula — small but tall enough for header + dynamic-font hero
  'formula-card': { width: 3, height: 2 },
  // Sankey — full width, tall
  'sankey-card': { width: 12, height: 4 },
  // Lists — third-width
  'top-movers-card': { width: 4, height: 3 },
  'recurring-auditor-card': { width: 4, height: 3 },
  'month-over-month-card': { width: 4, height: 3 },
  'subscriptions-card': { width: 4, height: 3 },
  'markdown-card': { width: 4, height: 3 },
  // Charts — half-width
  'net-worth-card': { width: 6, height: 3 },
  'net-worth-composition-card': { width: 6, height: 3 },
  'category-trend-card': { width: 6, height: 3 },
  'calendar-card': { width: 6, height: 3 },
  'cash-flow-card': { width: 6, height: 3 },
  'spending-card': { width: 6, height: 3 },
  'budget-analysis-card': { width: 6, height: 3 },
  'crossover-card': { width: 6, height: 3 },
  'age-of-money-card': { width: 6, height: 3 },
  'ytd-category-card': { width: 6, height: 3 },
  'balance-forecast-card': { width: 6, height: 3 },
  'custom-report': { width: 6, height: 3 },
};

export const DEFAULT_DASHBOARD_STATE: NewDashboardWidgetEntity[] = [
  // Row 0 (h=1): KPI strip
  {
    type: 'total-income-ytd-card',
    width: 3,
    height: 1,
    x: 0,
    y: 0,
    meta: null,
  },
  {
    type: 'total-expenses-ytd-card',
    width: 3,
    height: 1,
    x: 3,
    y: 0,
    meta: null,
  },
  { type: 'savings-rate-card', width: 3, height: 1, x: 6, y: 0, meta: null },
  { type: 'fi-progress-card', width: 3, height: 1, x: 9, y: 0, meta: null },

  // Row 1–4 (h=4): Sankey, full width
  { type: 'sankey-card', width: 12, height: 4, x: 0, y: 1, meta: null },

  // Row 5–7 (h=3): Net Worth · Net Worth Composition
  { type: 'net-worth-card', width: 6, height: 3, x: 0, y: 5, meta: null },
  {
    type: 'net-worth-composition-card',
    width: 6,
    height: 3,
    x: 6,
    y: 5,
    meta: null,
  },

  // Row 8–10 (h=3): Spending by Category · Calendar
  { type: 'category-trend-card', width: 6, height: 3, x: 0, y: 8, meta: null },
  {
    type: 'calendar-card',
    width: 6,
    height: 3,
    x: 6,
    y: 8,
    meta: {
      timeFrame: {
        start: '2026-01-01',
        end: '2026-03-31',
        mode: 'sliding-window',
      },
      conditions: [{ field: 'transfer', op: 'is', value: false }],
      conditionsOp: 'and',
    },
  },

  // Row 11–13 (h=3): Top Movers · Recurring Charges · Month over Month
  { type: 'top-movers-card', width: 4, height: 3, x: 0, y: 11, meta: null },
  {
    type: 'recurring-auditor-card',
    width: 4,
    height: 3,
    x: 4,
    y: 11,
    meta: null,
  },
  {
    type: 'month-over-month-card',
    width: 4,
    height: 3,
    x: 8,
    y: 11,
    meta: null,
  },
];
