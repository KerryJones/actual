# Architecture — fork model and deploy pipeline

## Fork identity

This is a fork of [`actualbudget/actual`](https://github.com/actualbudget/actual). Upstream is the source of truth for everything except the deliberate customizations enumerated below. The fork's goal is to layer those customizations as minimally as possible so `git rebase upstream/master` stays mechanical.

- **Origin** (fork remote): `https://github.com/KerryJones/actual.git`
- **Upstream** (source of truth): `https://github.com/actualbudget/actual.git`
- **Working branch**: `main` (renamed from upstream's `master`).
- **In-progress branches**: cut from `main`, merged back to `main`.

## Deploy pipeline

`git push origin main` → GitHub Actions builds → image lands in GHCR → Dokploy webhook fires → VPS pulls and redeploys → live at **finance.kerryjones.net**. End-to-end about 3–5 minutes.

```
~/code/actual                          (this fork)
    │  git push origin main
    ▼
GitHub Actions: .github/workflows/finance-deploy.yml
    │  - actions/checkout
    │  - ./.github/actions/setup            (upstream's setup action)
    │  - yarn build:browser --skip-translations
    │  - docker build -f Dockerfile.finance
    │  - docker push ghcr.io/kerryjones/finance-actual:latest
    │  - curl -X POST $DOKPLOY_WEBHOOK_URL
    ▼
Dokploy on Digital Ocean VPS
    │  - docker pull ghcr.io/kerryjones/finance-actual:latest
    │  - docker compose up -d            (compose file from ~/code/finance)
    ▼
finance.kerryjones.net  (port 5006, SSL via Let's Encrypt)
```

### Companion repo

`~/code/finance/` holds the production `docker-compose.yml` and Dokploy reads from that repo. **Do not put deploy config in this fork.** The split exists so the fork stays focused on Actual customization while infra config lives separately.

## What is customized

Keep this list current as work proceeds. Files outside this list should not be modified without strong reason.

### Fork-only files (zero upstream conflict surface)
- `Dockerfile.finance` — 2-line custom image (`FROM actualbudget/actual-server:latest` + `COPY` of built browser bundle). **Do not rename** — would conflict with future upstream renames.
- `.github/workflows/finance-deploy.yml` — fork-only CI pipeline.
- `Makefile` — wraps the `sync-upstream` workflow.
- `packages/desktop-client/src/style/finance-layout.css` — layout + typography overrides not exposed as theme tokens.
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
- `packages/desktop-client/src/style/themes/light.ts` — token overrides, marked with `// FINANCE FORK:` header.
- `packages/desktop-client/src/style/themes/dark.ts` — same.
- `packages/desktop-client/src/index.tsx` — single new import line for `finance-layout.css`.
- `packages/desktop-client/src/components/FinancesApp.tsx` — wraps post-sidebar content in `<div className="finance-content-wrapper">`.
- `packages/desktop-client/src/components/reports/getDashboardWidgetItems.ts` — extends `DashboardWidgetMenuName` and registers the new widget items.
- `packages/desktop-client/src/components/reports/Overview.tsx` — imports the three custom card components, adds dispatch branches, and extends the add-widget inline menu.
- `packages/loot-core/src/types/models/dashboard.ts` — adds `MonthOverMonthWidget`, `YTDCategoryWidget`, `SubscriptionsWidget` to the `SpecializedWidget` union so `widget.type` narrows in `Overview.tsx`.
- `packages/loot-core/src/server/dashboard/app.ts` — extends the `isWidgetType` runtime allowlist so the persistence layer accepts the new widget types.

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
