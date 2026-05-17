# Actual Budget — Kerry's customization fork

This is Kerry's personal fork of [Actual Budget](https://github.com/actualbudget/actual), deployed to **finance.kerryjones.net**. Customizations focus on a Mercury-inspired visual restyle and custom dashboard cards for personal expense analysis. The companion deploy repo lives at `~/code/finance/` (docker-compose + Dokploy config).

## Rules

### Ownership & rebase safety

- **Rebase-safety is #1.** This fork rebases on `upstream/master` regularly. Confine modifications to designated files (see `docs/architecture.md`). Modifying random upstream files creates compounding rebase pain.
- **Never bypass `make sync-upstream`.** The dirty-tree guard exists for a reason.
- **Update docs after changes.** Touch the deploy pipeline → update `docs/architecture.md`. Touch the design system → update `docs/design.md`. Change the rebase workflow → update `docs/rebase-strategy.md`.

### Coding principles

**CONSISTENT > CANONICAL > SIMPLE**

1. **Consistent** — match existing patterns in the codebase first.
2. **Canonical** — use the standard/documented approach for Actual / React / Recharts.
3. **Simple** — prefer the simplest solution that works.

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
