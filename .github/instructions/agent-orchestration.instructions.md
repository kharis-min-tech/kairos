---
applyTo: "**"
---

## Agent Orchestration Rules

Use `AGENTS.md` as the canonical guide. When a task is large enough for parallel work, split by independent write ownership and keep one orchestrator responsible for integration.

Recommended lanes:

- Types/database: shared contracts, Drizzle schema, migrations, seeds.
- API module: one folder under `apps/api/src/{module}`.
- Client/hooks: `packages/api-client/src/api.ts` and related `apps/web/src/hooks`.
- UI route: one route subtree under `apps/web/src/app` or one component cluster.
- Verification: focused tests and typecheck after contracts are stable.

Parallelization rules:

- Define exact files each worker may edit.
- Do not assign two writers to the same file.
- Agree route paths and shared types before UI/API work diverges.
- Integrate through the route alignment triplet.
- Run targeted tests per lane, then broader verification after merge.
- If a requirement is unclear, document the decision point instead of letting separate workers invent incompatible behavior.
