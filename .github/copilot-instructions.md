# Kairos Coding Instructions

Use the top-level docs as the source of truth:

- `AGENTS.md` for architecture, repo workflow, backend/frontend patterns, tests, and agent orchestration.
- `DESIGN.md` for UI design rules.
- `requirements/` for product requirements and historical context.

## Current Runtime

- Local-first monorepo: Turborepo + npm workspaces.
- API: Hono mounted under `/api/*` in `apps/api/src/app.ts`.
- Web: Next.js App Router in `apps/web`.
- Database: Drizzle + PostgreSQL in `packages/database`.
- Auth: bcrypt + jsonwebtoken local flow with `activeRole`, approval status, and branch context.

Treat older Cognito, CDK, Lambda, S3, and AWS language as future deployment context unless the task explicitly targets deployment.

## Feature Contract

Keep the alignment chain intact:

1. `packages/types/src` shared request/response/entity contracts.
2. `packages/database/src/schema` and `packages/database/drizzle` if persistence changes.
3. `apps/api/src/{module}` schemas, services, routers, and tests.
4. `packages/api-client/src/api.ts`.
5. `apps/web/src/hooks`.
6. `apps/web/src/app` or `apps/web/src/components`.

## Non-Negotiables

- Preserve branch isolation for every non-admin branch-scoped query.
- Use `isActive` soft deletes for business entities.
- Validate route input with Zod.
- Keep routers thin and services responsible for business rules.
- Use shared errors and `successResponse`.
- Use `DateSelect` for dates and shared select components for dropdowns.
- Follow TDD for behavior changes.

## Parallel Work

When using parallel agents, split by file ownership and dependencies:

- types/database
- one API module
- api-client/hooks
- one frontend route subtree
- focused tests/verification

The orchestrator owns integration and final verification.
