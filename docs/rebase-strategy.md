# Rebase strategy — keeping the fork synced

## Routine sync

```sh
make sync-upstream
```

This target is defined in the root `Makefile`. It runs:

1. `git diff-index --quiet HEAD --` — refuses to run if the working tree is dirty. **Do not bypass.** A dirty tree mid-rebase loses uncommitted work and makes conflict resolution ambiguous.
2. `git fetch upstream`
3. `git checkout main`
4. `git rebase upstream/master`
5. `git push --force-with-lease origin main` — `--force-with-lease` (not plain `--force`) protects against overwriting work someone else may have pushed to `origin/main`.

After it finishes, the deploy CI starts on the new `main`. Watch it at: https://github.com/KerryJones/actual/actions

## Expected conflict surfaces

These files are modified by both us and upstream. Expect mechanical conflicts:

### `packages/desktop-client/src/style/themes/light.ts` and `dark.ts`

- **Why**: upstream adds, renames, or removes color tokens.
- **Resolution**: keep our overridden values for tokens we explicitly customize (look for the `// FINANCE FORK:` header at the top of each file). Accept upstream's additions of any new tokens. If a token we override gets renamed upstream, rename it in our overrides too.

### `packages/desktop-client/src/index.tsx`

- **Why**: our one-line `import './style/finance-layout.css'` could collide if upstream restructures the entry point.
- **Resolution**: keep the import; place it near the other style imports.

### `packages/desktop-client/src/components/FinancesApp.tsx`

- **Why**: our `<div className="finance-content-wrapper">` wraps the post-sidebar content area. Upstream JSX changes around the sidebar/main split can collide.
- **Resolution**: re-apply the wrapper around the same logical content area. If the structure has changed substantially, re-read `docs/design.md` for intent, then re-apply.

### `packages/desktop-client/src/components/reports/getDashboardWidgetItems.ts`

- **Why**: both we and upstream add to the widget items list.
- **Resolution**: keep both upstream's new entries and ours. The list is order-insensitive — append our entries at the end.

### `packages/desktop-client/src/components/reports/Overview.tsx`

- **Why**: both we and upstream add cases to the widget-type dispatch AND to the inline add-widget menu items array.
- **Resolution**: keep both branches and both menu items. Our cases (`'month-over-month-card'`, `'ytd-category-card'`, `'subscriptions-card'`) follow the pattern of existing ones — re-apply after upstream's new dispatch arms land. The `MonthOverMonthCard` / `YTDCategoryCard` / `SubscriptionsCard` import lines must also survive — they are marked with `// FINANCE FORK:`.

### `packages/loot-core/src/types/models/dashboard.ts`

- **Why**: we added `MonthOverMonthWidget`, `YTDCategoryWidget`, `SubscriptionsWidget` to the `SpecializedWidget` union. Upstream changes to that union (adding more widget types) will collide.
- **Resolution**: keep all of upstream's additions and all of ours. The union order does not matter functionally.

### `packages/loot-core/src/server/dashboard/app.ts`

- **Why**: we extended the `isWidgetType` allowlist so our custom widgets persist. Upstream may add entries to the same allowlist.
- **Resolution**: keep both upstream's and our entries. The three fork entries are marked with a `// FINANCE FORK:` comment above them.

## Fork-only files (should NEVER conflict)

These exist only on our side, with filenames upstream doesn't use. If you ever see a conflict here, something is wrong (probably a misnamed upstream addition):

- `Dockerfile.finance`
- `.github/workflows/finance-deploy.yml`
- `Makefile`
- `packages/desktop-client/src/style/finance-layout.css`
- `packages/desktop-client/src/components/reports/reports/MonthOverMonthCard.tsx`
- `packages/desktop-client/src/components/reports/reports/YTDCategoryCard.tsx`
- `packages/desktop-client/src/components/reports/reports/SubscriptionsCard.tsx`
- `packages/desktop-client/src/components/reports/reports/CategoryComparisonCard.tsx`
- `packages/desktop-client/src/components/reports/CategoryComparisonList.tsx`
- `packages/desktop-client/src/components/reports/spreadsheets/month-over-month-spreadsheet.ts`
- `packages/desktop-client/src/components/reports/util-monthly-equivalent.ts`
- `docs/architecture.md`, `docs/design.md`, `docs/rebase-strategy.md`

## When a rebase fails badly

1. **Bail safely.** `git rebase --abort` puts you back where you started. Nothing is lost.
2. **Restart slowly.** Run `make sync-upstream` again and walk one conflict at a time. Read each conflict's surrounding context — don't auto-resolve from memory.
3. **Verify before pushing.** If Node is set up locally, `yarn build:browser --skip-translations` reproduces the CI's build step. A clean build is a strong signal the rebase is safe to force-push.
4. **If totally stuck**: hard-reset to `origin/main` (the last known-good remote) with `git reset --hard origin/main`, then try again after fetching the latest `upstream/master`. Lost local progress is recoverable from the reflog (`git reflog`).

## Upstream `Dockerfile.finance` COPY path drift

The CI build step we own is:

```dockerfile
COPY packages/desktop-client/build/ /usr/src/app/node_modules/@actual-app/web/build/
```

If upstream ever renames the package (`@actual-app/web` → something else), our COPY target breaks and the image build fails loudly at that step. The fix is to update the target path in `Dockerfile.finance` to match the new location inside `actualbudget/actual-server:latest`. Verify by `docker run --rm -it actualbudget/actual-server:latest ls /usr/src/app/node_modules/@actual-app`.

## When to update this doc

- Adding/removing a fork-only file: edit the "Fork-only files" list above.
- Adding/removing a modified upstream file: edit the "Expected conflict surfaces" list above.
- Changing what `make sync-upstream` does: edit the "Routine sync" section.
