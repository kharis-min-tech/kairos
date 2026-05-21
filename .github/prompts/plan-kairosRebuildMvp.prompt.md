# Plan A Kairos Feature Slice

Use this prompt to plan a new feature or module in the current Kairos codebase.

## Context To Read

- `AGENTS.md`
- `DESIGN.md` if UI is involved
- Relevant files in `requirements/`
- Current module examples under `apps/api/src`, `packages/types/src`, `packages/api-client/src/api.ts`, `apps/web/src/hooks`, and `apps/web/src/app`

## Output

Create an implementation plan with:

1. Current-state findings from the codebase.
2. Product behavior and permissions.
3. Data model and migration impact.
4. API routes and service functions.
5. Shared types and API client methods.
6. Frontend hooks/pages/components.
7. Test plan.
8. Verification commands.
9. Parallelization plan with explicit write ownership.

## Parallelization Template

- Lane A: types/database. Owns `packages/types` and `packages/database`.
- Lane B: API module. Owns one `apps/api/src/{module}` folder.
- Lane C: client/hooks. Owns `packages/api-client/src/api.ts` and related hooks.
- Lane D: UI. Owns one route subtree or component cluster.
- Lane E: verification. Owns focused tests after contracts are stable.

Do not assign two writers to the same file. The orchestrator integrates and runs final checks.

## Decision Rules

- Current API prefix is `/api/*`.
- Branch isolation is mandatory for non-admin branch-scoped data.
- Soft delete with `isActive`.
- Prefer local-first implementation over future AWS-only requirements unless deployment is explicitly requested.
