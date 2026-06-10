# Actual Budget — Kerry's customization fork

This is Kerry's personal fork of [Actual Budget](https://github.com/actualbudget/actual), deployed to **finance.kerryjones.net**. Customizations focus on a Mercury-inspired visual restyle and custom dashboard cards for personal expense analysis. The companion deploy repo lives at `~/code/finance/` (docker-compose + Dokploy config).

## Rules

### Ownership & rebase safety

- **Rebase-safety is #1.** This fork rebases on `upstream/master` regularly. Confine modifications to designated files (see `docs/architecture.md`). Modifying random upstream files creates compounding rebase pain.
- **Never bypass `make sync-upstream`.** The dirty-tree guard exists for a reason.
- **Always keep `docs/` current. Non-negotiable.** Every change ships with its doc update in the SAME commit — never as a follow-up, never deferred, never gated on user approval. Touch the deploy pipeline → update `docs/architecture.md`. Touch the design system → update `docs/design.md`. Change the rebase workflow, add a new conflict-prone file, or learn a new resolution recipe → update `docs/rebase-strategy.md`. Add or remove a customized file → update the file maps in both `docs/architecture.md` and `docs/rebase-strategy.md`. If you find yourself thinking "I should mention this to the user before updating the doc" — stop, update the doc, then mention it.

### Coding principles

**CONSISTENT > CANONICAL > SIMPLE**

1. **Consistent** — match existing patterns in the codebase first.
2. **Canonical** — use the standard/documented approach for Actual / React / Recharts.
3. **Simple** — prefer the simplest solution that works.

### Design system — one token source

**Every color, border, background, and text color in the dashboard reads from Mercury theme tokens (`theme.*` in JS, `var(--color-*)` in CSS). Never hardcode.**

- Single source of truth: `packages/desktop-client/src/style/themes/dark.ts` and `themes/light.ts`. Change a value there → every card on the page restyles.
- Forbidden in any `.tsx` under `components/reports/reports/` (or any future fork card directory): `text-slate-*`, `bg-slate-*`, `border-slate-*`, `text-rose-*`, `text-emerald-*`, any hex/rgba literal, any color-bearing Tailwind class.
- Permitted: `theme.pageTextDark`, `theme.pageTextLight`, `theme.pageTextSubdued`, `theme.numberPositive`, `theme.numberNegative`, `theme.tableBackground`, `theme.cardBackground`, etc. via `import { theme } from '@actual-app/components/theme'`.
- Tailwind in this fork exists only for (a) Tremor's chart components and (b) mechanical layout utilities (`flex`, `gap-*`, `text-xs`, `tabular-nums`). Not for chrome.
- If you need a color that doesn't have a token, add the token in `themes/dark.ts` + `themes/light.ts` first, then reference it. Do not bypass.
- See `docs/design.md` for the full rule + token map.

### Communication

- **Research before guessing.** Read the relevant `docs/` file before starting any non-trivial task.
- **Never guess or fabricate.** If you don't know how something works, say "I don't know." This is the #1 rule.
- **No sycophancy.** State what you think directly. Push back when you have good reason.
- **Take words at face value.** Respond to what the user actually said.

### Tool usage

- Prefer Claude Code tools (Read, Edit, Write, Glob, Grep) over Bash equivalents.
- **No compound Bash commands** (pipes, `cd && ...`, chained commands).
- **No git commits/pushes without explicit user permission.**
- **No Claude attribution in commit messages.**
- **Commit messages as plain text** — no quotes, backticks, or code fences.

### Memory discipline

- Do NOT save architecture, file paths, code patterns, or project structure to MEMORY.md.
- MEMORY.md is only for user preferences and feedback.

## Reference docs

| File                      | Contents                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| `docs/architecture.md`    | Fork-vs-upstream model, deploy pipeline, file map of customizations |
| `docs/design.md`          | Mercury-inspired design language, tokens, layout principles         |
| `docs/rebase-strategy.md` | Upstream sync workflow, expected conflict surfaces, recovery        |

Upstream's own guidance lives in `AGENTS.md` (workspace conventions) and `CODE_REVIEW_GUIDELINES.md`. Read those for Actual-wide patterns; read `docs/` for fork-specific rules that override them.

@AGENTS.md
@.github/agents/pr-and-commit-rules.md
