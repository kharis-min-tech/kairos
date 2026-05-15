---
description: Run multiple module-feature agents concurrently when their write scopes are disjoint. Use when building several independent modules in one session.
argument-hint: <module-a> <module-b> [<module-c> ...]
---

The user invoked `/parallel-module-build $ARGUMENTS`. Each token is a module name. They've decided the modules' work is independent enough to parallelize.

## Verify the parallel-safety claim first

Before dispatching anything, confirm these write scopes don't collide:

- **Shared files** that multiple module agents commonly touch: `packages/api-client/src/api.ts`, `packages/types/src/api.ts`, `packages/types/src/entities.ts`, `packages/types/src/enums.ts`, `apps/api/src/app.ts`. If multiple modules need to edit these in the same run, you have a write conflict.
- **Shared schemas**: if two modules want to add a column to `members` or `branches`, they collide.
- **Shared UI primitives**: if two modules need a new `packages/ui` primitive each, they can be parallel; if they need the same one, sequential.

If a collision exists, EITHER:
1. Pre-author the shared file's changes yourself (or via a `schema-author` / `ui-component` dispatch) BEFORE fanning out, so each module agent only reads it.
2. Tell the user it's not safe to parallelize and propose sequential `/implement-feature` calls instead.

## Method

1. **Per module, gather scope.** For each module in `$ARGUMENTS`, ensure you have a clear plan (from prior `/plan-feature` runs in the same conversation, or by reading the conversation context). If any module lacks a plan, stop and direct the user to `/plan-feature` first.

2. **Pre-author shared files** if needed (per above).

3. **Dispatch all module agents in a single message.** Use one Agent tool call per module, with `subagent_type: "{module}-feature"` and `run_in_background: true`. Each prompt is self-contained.

4. **Wait for all to complete.** Don't poll — the runtime notifies on completion.

5. **Aggregate handoff reports.** Per module, show the handoff summary.

6. **Run verification across the union of touched workspaces**:
   - `npx turbo typecheck`
   - `npx turbo test`
   - `npx turbo lint`

7. **Dispatch `reviewer`** ONCE, scoped to the full branch diff. The reviewer audits all modules together.

8. **Final summary** with per-module status + global verification + reviewer punch list.

## Rules

- **Default to NO parallelization** if you're unsure about scope collisions. Sequential `/implement-feature` is safer.
- **One reviewer pass at the end**, not per-module — the reviewer's value is finding cross-module inconsistencies.
- **If one module fails**, the others may still succeed — surface partial completion clearly. Don't roll back working modules.
- **Don't commit.** Stop at "ready for review per module".

## When NOT to use this

- Modules that share a parent migration (e.g. both touching `members`) — sequence them.
- A first-time scaffold of multiple modules — sequence the first two so any new pattern surfaces in one place before being replicated.
- When the user is exploring — small sequential changes give them control points.
