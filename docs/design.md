# Design — Mercury-inspired visual language

## Inspiration

[Mercury](https://mercury.com). Calm, scannable, financial-app feel. The three things to copy:

1. **Restrained color.** One muted accent. Semantic green/red for amounts. No rainbow palette.
2. **Generous whitespace and tight typography hierarchy.** Numbers read as hero content; secondary text recedes.
3. **Background-color contrast in place of borders.** Rows and cards separate via subtle background shifts, not 1px lines.

## Principles

1. **Constrain content width on wide monitors.** Sidebar anchors left; main content centers within a max-width wrapper. Target: `max-width: 1440px`.
2. **Reduce visual noise.** Replace borders with background-color shifts where possible. Keep borders only where they carry information (e.g., focused inputs).
3. **One restrained accent + semantic colors.** A muted accent for interactive emphasis; existing semantic positive/negative tokens for amounts with slightly reduced saturation.
4. **Big numbers feel like hero content.** Use the existing `SummaryNumber` component (`packages/desktop-client/src/components/reports/reports/SummaryNumber.tsx`) for any card that has a single dominant value.

## Tokens

Concrete values landed in Phase 1. To tune, edit the lines marked `// FINANCE FORK` in `packages/desktop-client/src/style/themes/light.ts` and `dark.ts`.

### Light mode

- **Canvas / page background**: `#fafaf9` (warm near-white)
- **Card background**: `#ffffff`
- **Sidebar background**: `#f5f4f2` (reads as canvas, not separate panel)
- **Text — primary** (`pageText`, `pageTextDark`): `#0a1628` (deep navy)
- **Text — secondary** (`pageTextLight`, `tableTextLight`): `#475569` / `#64748b`
- **Text — subdued** (`pageTextSubdued`): `#94a3b8`
- **Accent** (`buttonPrimaryBackground`, `sidebarItemAccentSelected`, `tableBorderSelected`): `#586cb1` (muted blue-purple, Mercury-feel)
- **Positive (green)** (`numberPositive`): `#16a34a`
- **Negative (red)** (`numberNegative`): `#dc2626`

### Dark mode

- **Canvas / page background**: `#0f1115` (graphite, not black)
- **Card background**: `#181b21`
- **Sidebar background**: `#0c0e12` (slightly darker than canvas)
- **Text — primary** (`pageText`, `pageTextDark`): `#e7e9ee` / `#f3f4f6`
- **Text — secondary** (`pageTextLight`): `#9ca3af`
- **Text — subdued** (`pageTextSubdued`): `#6b7280`
- **Accent** (`buttonPrimaryBackground`, `sidebarItemAccentSelected`, `tableBorderSelected`): `#7785c8` (accent lifted for dark contrast)
- **Positive (green)**: `#4ade80`
- **Negative (red)**: `#f87171`

### Border-to-background substitutions

- `tableBorder`, `tableBorderHover`, `tableBorderSeparator` → near-background (`#f0eeec` / `#e7e5e1` light, `#1f242c` / `#262b34` dark).
- `cardBorder` → near-background.
- Row hover/selection use background-color shift (`tableRowBackgroundHover`: `#f5f4f2` light, `#1f242c` dark) instead of borders.

## Layout

- **Max-width wrapper**: a single CSS class (`.finance-content-wrapper`) applied around the main content area in `FinancesApp.tsx`. Wrapper does `max-width: 1440px; margin: 0 auto;`. Sidebar remains outside the wrapper.
- **Font family**: Inter Variable stays (already loaded in `packages/desktop-client/index.html`). Only adjust weight, tracking, and line-height in `finance-layout.css`.
- **Typography refinements**:
  - Tighten line-height on tabular content.
  - Slight positive tracking on large display numbers for legibility at scale.
  - Monospace digit alignment on amount columns (use Inter's `tnum` feature where applicable).

## Component patterns

### Theme tokens

All new components consume the existing CSS custom properties (`--color-*`) — never hard-code colors. This keeps light/dark mode automatic and rebases mechanical.

### Hero numbers

Use `SummaryNumber` (`packages/desktop-client/src/components/reports/reports/SummaryNumber.tsx`) for any single-value display. It auto-scales font size and accepts `contentType="financial"` for currency formatting.

### Dashboard cards (Phase 2)

Custom cards live alongside upstream ones in `packages/desktop-client/src/components/reports/reports/`. They follow the existing `useReport(sheetName, getData)` + spreadsheet pattern (`packages/desktop-client/src/components/reports/useReport.ts`) for data, and register through `getDashboardWidgetItems.ts` + `Overview.tsx` for placement.

Concrete fork cards (all wired via the dispatch in `Overview.tsx`):

- `MonthOverMonthCard.tsx` — current month vs previous month per category. Visualization: stacked horizontal bars (current = stronger color, previous = subdued bar below). Exports `CategoryComparisonList` for reuse.
- `YTDCategoryCard.tsx` — same `CategoryComparisonList`; windows are `${year}-01-01 → today` vs `${year-1}-01-01 → same MM-DD prior year`.
- `SubscriptionsCard.tsx` — hero number via `SummaryNumber`. Sums monthly-equivalent cost of all active recurring expense schedules, with top-N breakdown beneath. Normalization helper at `packages/desktop-client/src/components/reports/util-monthly-equivalent.ts` is reusable for forecasting later.

All three consume theme tokens only — never hard-coded colors — so the Phase 1 restyle applies automatically.

## Where to make changes

| Change                             | File                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| Light-mode token values            | `packages/desktop-client/src/style/themes/light.ts`      |
| Dark-mode token values             | `packages/desktop-client/src/style/themes/dark.ts`       |
| Layout width, font tracking, etc.  | `packages/desktop-client/src/style/finance-layout.css`   |
| Where the wrapper class is applied | `packages/desktop-client/src/components/FinancesApp.tsx` |
| Where the CSS file is imported     | `packages/desktop-client/src/index.tsx`                  |

---

# Dashboard cards — Mercury only

The /reports dashboard uses **the same Mercury tokens** as the rest of the app. There is no obsidian, no violet, no parallel design system, no card-specific color values. Every visible color on a dashboard card resolves to `theme.*` from `@actual-app/components/theme`, which resolves to the values exported from `themes/dark.ts` and `themes/light.ts`.

## The rule

**Dashboard chrome, text, borders, and backgrounds must come from Mercury theme tokens — never from hardcoded Tailwind color classes or hex literals.**

If you find yourself typing `text-slate-*`, `bg-slate-*`, `border-slate-*`, `text-rose-*`, `bg-emerald-*/15`, or any hex/rgba into a `.tsx` file under `components/reports/reports/`, stop. Use `style={{ color: theme.pageTextDark }}` (or the appropriate token) instead. The whole point is that changing one value in `themes/dark.ts` restyles every card on the page.

| Need                              | Use                                                          |
| --------------------------------- | ------------------------------------------------------------ |
| Card chrome (bg/border/shadow)    | Use `ReportCard` — it reads `theme.tableBackground` etc.     |
| Header (title + date range)       | `ReportCardName` + `DateRange` in a 20px-padded header `View` |
| Hero number                       | `SummaryNumber` (auto-fits font; colors by sign via `theme.reportsNumber*`) |
| Static text colors                | `theme.pageText`, `theme.pageTextLight`, `theme.pageTextSubdued` |
| Card padding                      | `padding: 20`                                                 |

## What Tailwind / Tremor are (and aren't) for

Tailwind v3 and `@tremor/react` are installed as Phase 0 infrastructure for future chart needs (Phase 2 Savings Rate sparkline, Net Worth composition area chart, etc.). After the Phase 3 YTD refactor there are no current consumers; the pipeline ships near-zero CSS until something inside `components/reports/dashboard/` or `components/reports/reports/` references a Tailwind class.

If a Phase 2 card needs a Tremor chart, the rules are:
1. Card chrome (background, border, padding, text colors) still goes through `theme.*` — Tremor is for the chart guts only.
2. Tremor `colors={[...]}` palette: prefer `'indigo'` (closest to Mercury's `buttonPrimaryBackground`, `#7785c8`). Other Mercury-aligned options: `'rose'` for negative, `'emerald'` for positive.
3. Layout utility classes (`flex`, `gap-*`, `tabular-nums`) are fine. Color/background classes are not.

## Scope mechanism

- `tailwind.config.cjs` `content` array includes `src/components/reports/dashboard/**`, `src/components/reports/reports/**`, the dashboard CSS file, and `node_modules/@tremor/**`. Nothing else.
- `corePlugins.preflight: false` — Tailwind's CSS reset is OFF so it doesn't override Actual's typography app-wide.
- `darkMode: 'class'` — dark variants only apply inside an element with class `dark`. The page scope div (`finance-dashboard-scope dark` in `Overview.tsx`) sets it once.
- Safelist for slate / violet / indigo / rose color names so Tremor's runtime class generation survives tree-shaking. Not for direct use in cards.

## Phase 1 cards

- **Total Income (YTD)** — hero number, on-budget income transactions, Jan 1 of current year through today. Uses `ytd-flow-spreadsheet`. Rendered through `<YTDFlowCard kind='income'>` which composes `ReportCard` + `ReportCardName` + `DateRange` + `SummaryNumber` (same structure as upstream `SummaryCard`).
- **Total Expenses (YTD)** — same query, `kind='expense'`. The card passes a sign-flipped negative value to `SummaryNumber` so it colors via `theme.reportsNumberNegative`.
- **Sankey card** — upstream widget, feature flag default flipped to `true` for this fork.
- **Calendar card** — upstream widget, already in the add menu.

## Phase 2 cards (analytical layer)

All Phase 2 cards consume Mercury theme tokens only, store integer cents in their spreadsheet outputs, and follow the same `ReportCard` → padded header (`ReportCardName` + `DateRange` or subtitle) → body structure as upstream cards.

- **Savings Rate** — `SavingsRateCard.tsx` + `savings-rate-spreadsheet.ts`. Hero number is current month's `(income − expense) / income`, clamped to `[−1, 1]`. Sparkline body is the trailing 12 months via the shared `CompactAreaChart` primitive (`charts/CompactAreaChart.tsx`), colored by sign through `theme.reportsNumberPositive` / `theme.reportsNumberNegative`. Same filter as `ytd-flow-spreadsheet` so numbers reconcile.
- **FI Progress** — `FIProgressCard.tsx` + `fi-progress-spreadsheet.ts`. Hero is `net_worth / (annual_expense × 25)` as a percentage. Net worth comes from per-account balance queries (one per account from `useAccounts()` at `currentDay`); annual expense is the trailing-12-mo expense total. Progress bar clamps the visualization to `[0, 100]%` while the hero number shows the actual value.
- **Top Movers** — `TopMoversCard.tsx` + `top-movers-spreadsheet.ts`. Two columns of categories (up movers left, down movers right) ranked by `abs(delta)` against trailing-3-mo average. Up movers use `theme.reportsNumberNegative` (spending more = bad); down movers use `theme.reportsNumberPositive`. Bar widths normalize to `max(abs(delta))` across both columns.
- **Spending by Category** — `CategoryTrendCard.tsx` + `category-trend-spreadsheet.ts`. 3×3 grid of `CompactAreaChart` sparklines, one per top-9 expense category by trailing-12-mo total. Each cell overlays a Recharts `ReferenceLine` at the trailing-3-mo average for visual deviation.
- **Recurring Charges** — `RecurringAuditorCard.tsx` + `recurring-auditor-spreadsheet.ts`. Auto-detects recurring payees without relying on Actual's `schedules` table. Detection rules: ≥3 occurrences, `stdev(amounts) / mean(amounts) ≤ 0.1`, median gap in `{monthly: [28, 31], quarterly: [85, 95], yearly: [355, 375]}` days. Pure text rows sorted by annual cost descending.
- **Net Worth Composition** *(gated)* — `NetWorthCompositionCard.tsx` + `net-worth-composition-spreadsheet.ts`. Stacked Recharts `AreaChart` of Liquid / Investments / Real Estate / Debt over 24 months. Bucket is parsed from a bracket prefix on the account name (`[L]`, `[I]`, `[R]`, `[D]`); unprefixed accounts default to Liquid. Colors come from `getColorScale('qualitative')` (Mercury's `chartQual1..4`). Useful only after accounts are renamed.

Universal Phase 2 conventions:

- Integer cents flow all the way to `SummaryNumber` — never call `integerToAmount` ahead of it. `format(_, 'financial')` divides by 100 internally.
- Card body charts use `useId()`-derived gradient ids so multiple instances on the page don't collide.
- New widget types live in the `SpecializedWidget` union (`packages/loot-core/src/types/models/dashboard.ts`) and the `isWidgetType` allowlist (`packages/loot-core/src/server/dashboard/app.ts`).

## Where to make changes

| Change                          | File                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| **Any color** on any card        | `packages/desktop-client/src/style/themes/dark.ts` / `light.ts` (the **only** source of truth) |
| Chart palettes (Recharts)        | `packages/desktop-client/src/style/themes/dark.ts` (`reports*` and `chartQual*` exports) |
| YTD card data / behavior         | `packages/desktop-client/src/components/reports/reports/YTDFlowCard.tsx` and `spreadsheets/ytd-flow-spreadsheet.ts` |
| Dashboard scope CSS              | `packages/desktop-client/src/style/finance-dashboard.css`                       |
| Tailwind safelist / config       | `packages/desktop-client/tailwind.config.cjs`                                   |
| Where the dashboard scope class is applied | `packages/desktop-client/src/components/reports/Overview.tsx`         |
