---
description: Produce a phased plan for a Kairos feature, grounded in requirements/ and the current code. Does not implement.
argument-hint: <module> <description>
---

You are planning a feature for Kairos. The user invoked `/plan-feature $ARGUMENTS`. The first token of `$ARGUMENTS` is the module name (one of: `auth`, `branches`, `members`, `fellowships`, `departments`, `outreach`, `new-believers`, `reports`). The rest is a free-form description of what they want.

**Do not implement.** Produce a plan. The plan is an ephemeral artifact — don't write it to a file.

## Method

1. **Read the inputs**:
   - `AGENTS.md` and `CLAUDE.md` for invariants.
   - The relevant module-feature subagent in `.claude/agents/{module}-feature.md` — it lists the module's surface and invariants.
   - The relevant `requirements/` doc(s) — typically `mvp-scope.md`, `implementation-spec.md`, `data.md`, and `design.md`.
   - The current code in the affected paths (`apps/api/src/{module}/`, `apps/web/src/app/(dashboard)/{module}/`, `packages/database/src/schema/`).

2. **Identify deltas**:
   - What types are missing in `packages/types/`?
   - What schema/columns are missing in `packages/database/`?
   - What routes are missing in `apps/api/src/{module}/router.ts`?
   - What api-client methods are missing in `packages/api-client/src/api.ts`?
   - What hooks/pages are missing in `apps/web/`?
   - What design-system primitives are missing in `packages/ui/`?

3. **Produce the plan** as a structured response:

```
# Plan: <module> — <description>

## TL;DR
<2-3 sentences: what changes, why, and the user-visible outcome>

## Open questions / decisions
<List any product decisions the user must make before implementation — defer with crisp options, don't guess.>

## Phases

### Phase 1 — Schema & types  (only if needed)
- Migration: drizzle/NNNN_xxx.sql — <columns/tables>
- Drizzle: packages/database/src/schema/<files>
- Types: packages/types/src/{entities,api,enums}.ts — <additions>
- Owner: schema-author

### Phase 2 — API surface
- Routes: <list with method + path>
- Service functions: <list with signatures>
- Zod schemas: <list>
- api-client methods: api.<module>.<methods>
- Owner: api-implementer
- Tests required: <coverage matrix>

### Phase 3 — Frontend
- Pages: <paths>
- Hooks: <names>
- Forms: <RHF + Zod schema names>
- @kairos/ui primitives: <existing vs. needed-new>
- Owner: web-implementer (+ ui-component if new primitives)
- Tests required: <coverage>

### Phase 4 — Review & verification
- `npx turbo typecheck` + `npx turbo test` + `npx turbo lint`
- Browser smoke test: <golden path + edges>
- Owner: reviewer

## Parallelization
<Which phases or sub-tasks can run in parallel? Default is sequential unless write scopes are disjoint.>

## Out of scope
<Explicit list of nearby work this plan does NOT include.>

## Risks
<2-4 bullets: things that could go wrong or surprise. Be specific.>
```

## Rules

- **Ground every claim in the current code** — don't restate plans from old `.github/prompts/` files. Those are fossils.
- **Identify product decisions upfront.** If the user's description has ambiguity, surface it as an open question before phasing.
- **Don't write the plan to a file.** It's conversational. The user will redirect or accept; only THEN do they invoke `/implement-feature`.
- **Don't be exhaustive about obvious work.** "Update tests" doesn't need to repeat the whole TDD spec.
- **Be specific about file paths** — `apps/api/src/fellowships/service.ts` not "the fellowships service".
- **If the change is large**, suggest splitting into multiple `/implement-feature` invocations.

When the plan is presented, ask the user to confirm or redirect before proceeding to `/implement-feature`.
