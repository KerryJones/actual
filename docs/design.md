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

# Dashboard redesign — obsidian + violet (Phase 0+)

The /reports dashboard runs its own visual language, separate from the Mercury-inspired theme above. Mercury covers the rest of the app (budget, accounts, modals, etc.); the dashboard runs an obsidian-glass aesthetic built on Tailwind v3 + Tremor v3, scoped so neither system bleeds into the other.

## Why a separate system

The dashboard's job is rendering large analytical surfaces — charts, KPIs, comparisons. Mercury's neutral palette and inline-style chrome don't give those surfaces the visual weight they need. Tremor's design primitives (Tremor's own `KPI`, `BarList`, `SparkAreaChart`, etc.) ship batteries-included for that purpose, but they require Tailwind. Bolting Tailwind on globally would break Actual's existing inline-style codebase, so the dashboard runs Tailwind under a scope.

## Scope mechanism

- `tailwind.config.cjs` `content` array only includes `src/components/reports/dashboard/**`, `src/components/reports/reports/**`, the dashboard CSS file, and `node_modules/@tremor/**`. Nothing else.
- `corePlugins.preflight: false` — Tailwind's CSS reset is OFF. Without this, Tailwind's reset would override Actual's typography across the entire app. Tremor components style themselves explicitly so they don't need the reset.
- `darkMode: 'class'` — dark variants only apply inside an element with class `dark`. The `<DashboardCard>` wrapper sets it on every card; the page scope (`.finance-dashboard-scope` in `finance-dashboard.css`) sets `color-scheme: dark` so form controls render consistently.
- Tailwind utility names safelisted for slate / violet / indigo / rose colors so Tremor's runtime class generation survives tree-shaking in production builds.

## Palette (locked tokens)

| Role             | Token            | Hex / Tailwind                                                |
| ---------------- | ---------------- | ------------------------------------------------------------- |
| Background base  | `bg`             | `slate-950` (#020617)                                         |
| Card surface     | `surface`        | `slate-900/60` with `backdrop-blur-xl` (glass)                |
| Card border      | `border`         | `slate-800/50` (hairline)                                     |
| Primary accent   | `accent`         | `violet-500` (#8b5cf6)                                        |
| Secondary accent | `accent2`        | `indigo-400` (#818cf8)                                        |
| Negative         | `negative`       | `rose-400` (#fb7185)                                          |
| Hero text        | `text-hero`      | `slate-100` (#f1f5f9)                                         |
| Body text        | `text-body`      | `slate-300` (#cbd5e1)                                         |
| Muted text       | `text-muted`     | `slate-400` (#94a3b8)                                         |
| Subdued text     | `text-subdued`   | `slate-500` (#64748b)                                         |

## Card chrome (locked)

The `<DashboardCard>` wrapper composes upstream `ReportCard` (for menu + viewport-defer UX) and renders the glass surface inside it. The chrome is locked at:

```
rounded-xl border border-slate-800/50 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl shadow-slate-950/50
```

Always `p-6` (24px) padding. Always `rounded-xl` (12px). No internal section borders within a card — separate sections with whitespace or background-color shifts instead.

## Typography

- **Hero number**: 36–40px (Tailwind `text-4xl`) in `text-slate-100`. Use the `<KPI>` primitive — it handles label + value + delta + sparkline layout in one shot.
- **Currency symbol**: smaller than the digits (`text-2xl` for `$`, `text-4xl` for the digits). `<KPI.Currency amount={1189020} />` renders the split.
- **Percentage**: `<KPI.Percentage fraction={0.243} />` — digits at `text-4xl`, `%` at `text-2xl`.
- **Label** (eyebrow above a hero number): `text-xs uppercase tracking-wider text-slate-400`.
- **Hint** (subline under value): `text-xs text-slate-500`.
- **Delta pill**: rounded-full pill, `text-xs`, `bg-emerald-500/15 text-emerald-300` for up, `bg-rose-500/15 text-rose-300` for down.

## Color economy

One accent (violet) plus one negative (rose), against grayscale. Avoid putting positive green and negative red on the same card unless the card directly compares them (e.g. Top Movers up/down columns). Tremor chart `colors={["violet", "indigo"]}` is the default for area/bar charts on the dashboard.

## Primitives

| Primitive            | File                                                                                          | Role                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `DashboardCard`      | `packages/desktop-client/src/components/reports/dashboard/DashboardCard.tsx`                 | Glass-chrome wrapper. Replaces `ReportCard` chrome for Phase 1+ widgets.            |
| `KPI`                | `packages/desktop-client/src/components/reports/dashboard/KPI.tsx`                            | Hero-number layout (label + value + delta + sparkline). Powers Savings Rate, FI Progress, Total Income/Expenses, etc. |
| `KPI.Currency`       | same file                                                                                     | Currency-formatted hero value with the smaller-symbol treatment. `tone='negative'` switches digits to muted rose for expense KPIs. |
| `KPI.Percentage`     | same file                                                                                     | Percentage hero value.                                                              |

## Phase 1 cards

- **Total Income (YTD)** — hero KPI. On-budget income transactions, Jan 1 of current year through today. Uses `ytd-flow-spreadsheet`, rendered via `<YTDFlowCard kind='income'>`. Default-tone digits (slate-100).
- **Total Expenses (YTD)** — same query, `kind='expense'`. Digits in muted rose (`tone='negative'`) per the color-economy rule.
- **Sankey card** — upstream widget, feature flag default flipped to `true` for this fork. Lives in `SankeyCard.tsx` with its existing Recharts chrome until Phase 3 polishes the visuals.
- **Calendar card** — upstream widget, already in the add menu. Wrapped in the obsidian scope by virtue of the page bg; Phase 3 reskins the Recharts heatmap to match the violet/indigo palette.

## Where to make dashboard changes

| Change                          | File                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Tailwind palette / safelist     | `packages/desktop-client/tailwind.config.cjs`                                   |
| PostCSS pipeline                | `packages/desktop-client/postcss.config.cjs`                                   |
| Dashboard CSS entry / page bg   | `packages/desktop-client/src/style/finance-dashboard.css`                       |
| Card chrome                     | `packages/desktop-client/src/components/reports/dashboard/DashboardCard.tsx`    |
| KPI layout                      | `packages/desktop-client/src/components/reports/dashboard/KPI.tsx`              |
| Where the dashboard scope class is applied | `packages/desktop-client/src/components/reports/Overview.tsx`         |
