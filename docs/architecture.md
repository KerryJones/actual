# Architecture — fork model and deploy pipeline

## Fork identity

This is a fork of [`actualbudget/actual`](https://github.com/actualbudget/actual). Upstream is the source of truth for everything except the deliberate customizations enumerated below. The fork's goal is to layer those customizations as minimally as possible so `git rebase upstream/master` stays mechanical.

- **Origin** (fork remote): `https://github.com/KerryJones/actual.git`
- **Upstream** (source of truth): `https://github.com/actualbudget/actual.git`
- **Working branch**: `main` (renamed from upstream's `master`).
- **In-progress branches**: cut from `main`, merged back to `main`.

## Deploy pipeline

`git push origin main` → GitHub Actions builds and pushes two image tags (`:latest` and `:sha-<short>`) → CI then commits the new SHA tag into the finance repo's `docker-compose.yml` → Dokploy auto-deploys on that finance-repo push → live at **finance.kerryjones.net**. End-to-end about 3–5 minutes.

The SHA-tag indirection is what makes Dokploy actually recreate the container: `docker compose up -d` only recreates when the service definition changes, not when a moving tag's digest changes. Bumping the image tag in compose forces a real config change every deploy.

```
~/code/actual                          (this fork)
    │  git push origin main
    ▼
GitHub Actions: .github/workflows/finance-deploy.yml
    │  - actions/checkout
    │  - ./.github/actions/setup            (upstream's setup action)
    │  - yarn build:browser --skip-translations
    │  - docker build -f Dockerfile.finance
    │  - docker push :latest AND :sha-<short>     (one buildx invocation)
    │  - actions/checkout KerryJones/finance      (via FINANCE_REPO_PAT)
    │  - yq rewrite finance/docker-compose.yml image → sha-<short>
    │  - git commit + push finance repo
    ▼
Dokploy on Digital Ocean VPS  (auto-deploy on finance-repo push)
    │  - git pull KerryJones/finance
    │  - docker compose up -d            (image tag changed → recreate)
    ▼
finance.kerryjones.net  (port 5006, SSL via Let's Encrypt)
```

### Companion repo

`~/code/finance/` holds the production `docker-compose.yml` and Dokploy reads from that repo. **Do not put deploy config in this fork.** The split exists so the fork stays focused on Actual customization while infra config lives separately. The `image:` tag in that compose file is rewritten by CI on every deploy — never edit the SHA by hand.

## What is customized

Keep this list current as work proceeds. Files outside this list should not be modified without strong reason.

### Fork-only files (zero upstream conflict surface)

- `Dockerfile.finance` — 2-line custom image (`FROM actualbudget/actual-server:latest` + `COPY` of built browser bundle). **Do not rename** — would conflict with future upstream renames.
- `.github/workflows/finance-deploy.yml` — fork-only CI pipeline.
- `Makefile` — wraps the `sync-upstream` workflow.
- `packages/desktop-client/postcss.config.cjs` — PostCSS pipeline (Tailwind + Autoprefixer) for the dashboard primitives. Picked up by Vite at the project root.
- `packages/desktop-client/tailwind.config.cjs` — Tailwind config scoped to the dashboard. Preflight is OFF so it does not touch Actual's inline-style codebase. Safelists slate / violet / indigo / rose for Tremor's runtime class generation. **Color values here are not the source of truth — Mercury tokens in `themes/dark.ts` / `themes/light.ts` are.** See `docs/design.md`.
- `packages/desktop-client/src/style/finance-layout.css` — layout + typography overrides not exposed as theme tokens.
- `packages/desktop-client/src/style/finance-dashboard.css` — Tailwind + Tremor entry (`@tailwind base/components/utilities`) plus a minimal `.finance-dashboard-scope` rule (sets `color-scheme: dark` and `min-height: 100%`). No background or color values — those come from Mercury tokens. Tailwind is currently unused after the Phase 3 YTD refactor; kept for likely Phase 2 chart needs.
- `packages/desktop-client/src/components/reports/spreadsheets/ytd-flow-spreadsheet.ts` — YTD income/expense sum query. On-budget only, uses `category.is_income` filter for consistency with `month-over-month-spreadsheet`.
- `packages/desktop-client/src/components/reports/reports/YTDFlowCard.tsx` — shared shell for the two YTD hero numbers. Matches upstream `SummaryCard` structure: `ReportCard` → header `View` (`ReportCardName` + `DateRange`) → centered `SummaryNumber`. Parameterized by `kind: 'income' | 'expense'`; expense is sign-flipped to negative so `SummaryNumber` colors it via `reportsNumberNegative`. Supports rename via `meta.name`.
- `packages/desktop-client/src/components/reports/reports/TotalIncomeYTDCard.tsx` — thin wrapper, `kind='income'`.
- `packages/desktop-client/src/components/reports/reports/TotalExpensesYTDCard.tsx` — thin wrapper, `kind='expense'`.
- `packages/desktop-client/src/components/reports/reports/MonthOverMonthCard.tsx` — custom dashboard card (Phase 2). Thin wrapper around `CategoryComparisonCard`.
- `packages/desktop-client/src/components/reports/reports/YTDCategoryCard.tsx` — custom dashboard card (Phase 2). Thin wrapper around `CategoryComparisonCard`.
- `packages/desktop-client/src/components/reports/reports/SubscriptionsCard.tsx` — custom dashboard card (Phase 2).
- `packages/desktop-client/src/components/reports/reports/CategoryComparisonCard.tsx` — shared card shell for the two per-category comparison cards.
- `packages/desktop-client/src/components/reports/CategoryComparisonList.tsx` — shared list/bar UI used inside the comparison card.
- `packages/desktop-client/src/components/reports/spreadsheets/month-over-month-spreadsheet.ts` — custom data query (Phase 2).
- `packages/desktop-client/src/components/reports/util-monthly-equivalent.ts` — helper for normalizing recurring schedule amounts to monthly (Phase 2).
- `docs/architecture.md`, `docs/design.md`, `docs/rebase-strategy.md` — this fork's documentation.

### Modified upstream files (will conflict during rebases)

- `CLAUDE.md` — fork-only behavioral rules + `@AGENTS.md` include.
- `packages/desktop-client/package.json` — adds Tailwind v3, Tremor, PostCSS, Autoprefixer, Headless UI for the Phase 0 dashboard foundation. Otherwise inherits upstream verbatim.
- `packages/desktop-client/src/style/themes/light.ts` — token overrides, marked with `// FINANCE FORK:` header.
- `packages/desktop-client/src/style/themes/dark.ts` — same.
- `packages/desktop-client/src/index.tsx` — single new import line for `finance-layout.css`.
- `packages/desktop-client/src/components/FinancesApp.tsx` — wraps post-sidebar content in `<div className="finance-content-wrapper">`.
- `packages/desktop-client/src/components/reports/getDashboardWidgetItems.ts` — extends `DashboardWidgetMenuName` and registers the new widget items.
- `packages/desktop-client/src/components/reports/Overview.tsx` — imports `finance-dashboard.css` (route-scoped so it only ships on `/reports`), imports the custom card components, adds dispatch branches, extends the add-widget inline menu, and wraps the dashboard scope with `className="finance-dashboard-scope"`.
- `packages/desktop-client/src/hooks/useFeatureFlag.ts` — flips the `sankeyReport` default to `true` so the Sankey card is addable from the dashboard menu without a per-user settings toggle (Phase 1).
- `packages/loot-core/src/types/models/dashboard.ts` — adds the fork's widget types to the `SpecializedWidget` union so `widget.type` narrows in `Overview.tsx`.
- `packages/loot-core/src/server/dashboard/app.ts` — extends the `isWidgetType` runtime allowlist so the persistence layer accepts the fork's widget types.

### What is NOT customized (and should not be without strong reason)

- Everything else, especially:
  - `packages/loot-core/` — core data logic, sync layer, query engine. We inherit this verbatim, with two narrow exceptions: the widget-type union (`types/models/dashboard.ts`) and the widget-type allowlist (`server/dashboard/app.ts`) both grew three entries so our custom dashboard cards can persist. Touch nothing else in loot-core without strong reason.
  - `packages/sync-server/` — server bits. We inherit them via the `FROM actualbudget/actual-server:latest` line in `Dockerfile.finance` and never fork the package itself.

## Branch model

- `main` is the fork's primary working branch.
- `upstream/master` is the source for upstream changes; we rebase onto it via `make sync-upstream`.
- Feature branches cut from `main`, merged back to `main`, then trigger the deploy on push.

## Image registry and runtime

- **Image**: `ghcr.io/kerryjones/finance-actual:latest`
- **Base**: `actualbudget/actual-server:latest` (we layer our built browser bundle on top via `Dockerfile.finance`).
- **Port**: 5006 (Actual Server default).
- **Data**: SQLite database in a Docker volume named `actual-data` (defined in the companion repo's `docker-compose.yml`).
- **Bank sync**: SimpleFIN Bridge ($15/year), configured at runtime in the Actual UI.

## When to update this doc

- Adding a new file to "what's customized": add it to the appropriate list above.
- Renaming `Dockerfile.finance` or the workflow file: update both this doc and `docs/rebase-strategy.md`.
- Changing how Dokploy is triggered or how the image is built: update the pipeline diagram.
- Changing the image-tagging scheme (e.g. dropping `:sha-<short>` or moving to digest pinning): update the pipeline diagram and the companion-repo note about CI rewriting the `image:` tag.
