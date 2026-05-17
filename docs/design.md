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

| Change                                | File                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Light-mode token values               | `packages/desktop-client/src/style/themes/light.ts`                        |
| Dark-mode token values                | `packages/desktop-client/src/style/themes/dark.ts`                         |
| Layout width, font tracking, etc.     | `packages/desktop-client/src/style/finance-layout.css`                     |
| Where the wrapper class is applied    | `packages/desktop-client/src/components/FinancesApp.tsx`                   |
| Where the CSS file is imported        | `packages/desktop-client/src/index.tsx`                                    |
