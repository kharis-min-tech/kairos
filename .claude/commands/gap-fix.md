---
description: Multi-module gap sweep — identify and resolve gaps across types, schemas, routes, hooks, and UI in one coordinated pass.
argument-hint: <scope-or-area>
---

The user invoked `/gap-fix $ARGUMENTS`. `$ARGUMENTS` describes a scope — either a thematic area ("tailwind-palette", "branch-isolation tests", "missing typecheck errors") or a multi-module sweep ("branches+members+fellowships permission gaps").

This command replaces the old `.github/prompts/plan-gapFix-*.prompt.md` pattern. Unlike those committed plans, this command IS the parameterized template — gap analysis happens fresh each time.

## Method

1. **Scope clarification.** If `$ARGUMENTS` is too vague, ask the user one focused question to narrow it. Don't sprawl.

2. **Audit phase (read-only).**
   - Read all relevant CLAUDE.md files and module agent definitions for the scope.
   - Grep, glob, and `git log` to surface the gaps. Common patterns:
     - Route triplet violations: `apps/api/src/*/router.ts` routes without matching `packages/api-client/src/api.ts` methods or `apps/web/src/hooks/use-*.ts` hooks.
     - Missing branch-isolation tests in `service.test.ts` files.
     - Old-palette regressions: `purple-700`, `#6D28D9`, etc. in non-archived UI.
     - Drizzle tables not exported from `packages/database/src/index.ts`.
     - DTOs missing from `packages/types/src/api.ts`.
   - Produce a categorized punch list. Number every item.

3. **Surface the audit to the user** in a structured response:

```
# Gap audit: <scope>

## Phase 1 — Database & types
- [ ] G1.1: <gap> — <file>: <one-line fix>
...

## Phase 2 — API surface
- [ ] G2.1: ...

## Phase 3 — Frontend
- [ ] G3.1: ...

## Deferred (out of scope for this pass)
- <items with reason>
```

Ask the user to confirm scope before fixing.

4. **Fix phase.** Once confirmed, fix gaps in dependency order:
   - Schema/types first (`schema-author` if needed).
   - API surface (one `api-implementer` per affected module — can parallelize if write scopes are disjoint).
   - Frontend (one `web-implementer` per affected module).
   - Tests (one `test-author` for missing coverage).

   Default to sequential when modules share files. Default to parallel when they don't.

5. **Verification.** `npx turbo typecheck`, `npx turbo test`, `npx turbo lint`.

6. **Reviewer pass** over the full diff.

7. **Final summary** of fixed gaps, deferred items, verification status.

## Rules

- **Audit before fixing.** Don't start editing until the user confirms the audit's scope.
- **Don't expand scope mid-fix.** If new gaps emerge, list them as follow-ups; don't silently fix them.
- **Migrations are forward-only.** If a gap requires a destructive schema change, stop and ask.
- **Deferred items get explicit reasoning** — "out of MVP scope", "needs product decision", "blocked by X module".
- **Don't commit. Don't push. Don't open PRs.** That's the user's call.

## When NOT to use this

- A single-module change → use `/plan-feature` + `/implement-feature` instead.
- A purely cosmetic refactor (rename, format) → just do it directly, no `/gap-fix` machinery needed.
- An audit-only request → just produce the audit and stop after step 3.
