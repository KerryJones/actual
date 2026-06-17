// FINANCE FORK: dashboard defaults rebuilt around the master plan's three
// questions — "where is it going / am I on a good long trajectory / anything
// weird" — with explicit visual hierarchy. 12-col grid, rowHeight 100.
import type { NewDashboardWidgetEntity } from '#types/models';

type WidgetType = NewDashboardWidgetEntity['type'];

// minH=1 widgets — kept for back-compat: existing user dashboards may persist
// these at h=1 from the previous default; without this allowance,
// react-grid-layout would silently force-resize them up to h=2 on first load.
export const KPI_WIDGET_TYPES: Set<WidgetType> = new Set([
  'summary-card',
  'total-income-ytd-card',
  'total-expenses-ytd-card',
  'savings-rate-card',
  'fi-progress-card',
]);

export const WIDGET_DEFAULT_SIZE: Record<
  WidgetType,
  { width: number; height: number }
> = {
  // KPI/legacy single-row hero numbers (kept addable but not in default layout)
  'total-income-ytd-card': { width: 3, height: 2 },
  'total-expenses-ytd-card': { width: 3, height: 2 },
  'savings-rate-card': { width: 3, height: 2 },
  'fi-progress-card': { width: 3, height: 2 },
  'summary-card': { width: 3, height: 1 },
  // Formula — small but tall enough for header + dynamic-font hero
  'formula-card': { width: 3, height: 2 },
  // Sankey — full width, tall
  'sankey-card': { width: 12, height: 4 },
  // Hero strip (Net Worth) — half-width, h=2
  'net-worth-hero-card': { width: 6, height: 2 },
  // Analytical row — third-width, h=3
  'top-movers-card': { width: 4, height: 3 },
  'top-categories-card': { width: 4, height: 3 },
  'recurring-auditor-card': { width: 4, height: 3 },
  'month-over-month-card': { width: 4, height: 3 },
  'subscriptions-card': { width: 4, height: 3 },
  'markdown-card': { width: 4, height: 3 },
  // Supporting trends — half-width
  'net-worth-trend-card': { width: 6, height: 2 },
  'income-expense-trend-card': { width: 6, height: 2 },
  // Other charts — half-width
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
  // Row 1 (y=0, h=4): "Where is it going?" — Sankey, full width.
  { type: 'sankey-card', width: 12, height: 4, x: 0, y: 0, meta: null },

  // Row 2 (y=4, h=2): "Am I on a good long trajectory?" — hero strip.
  { type: 'net-worth-hero-card', width: 6, height: 2, x: 0, y: 4, meta: null },
  { type: 'fi-progress-card', width: 3, height: 2, x: 6, y: 4, meta: null },
  { type: 'savings-rate-card', width: 3, height: 2, x: 9, y: 4, meta: null },

  // Row 3 (y=6, h=3): "Anything weird?" — analytical cards.
  { type: 'top-movers-card', width: 4, height: 3, x: 0, y: 6, meta: null },
  { type: 'top-categories-card', width: 4, height: 3, x: 4, y: 6, meta: null },
  {
    type: 'recurring-auditor-card',
    width: 4,
    height: 3,
    x: 8,
    y: 6,
    meta: null,
  },

  // Row 4 (y=9, h=2): Supporting trends.
  { type: 'net-worth-trend-card', width: 6, height: 2, x: 0, y: 9, meta: null },
  {
    type: 'income-expense-trend-card',
    width: 6,
    height: 2,
    x: 6,
    y: 9,
    meta: null,
  },
];
