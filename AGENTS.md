# Kairos Agent Guide

This is the working guide for coding agents in this repository. Keep it aligned with the actual codebase, not with old planning artifacts.

## Source Of Truth

Read these before substantial work:

- `AGENTS.md` - engineering conventions, repo shape, and agent workflow.
- `DESIGN.md` - UI design system and interaction rules.
- `requirements/` - product requirements, scope, architecture, and implementation notes. Treat older AWS/Cognito language as future-deployment context unless the current code already uses it.
- `README.md` - local setup and commands.

If these conflict with running code, inspect the implementation and update the docs as part of the change.

## Current Architecture

- Monorepo: Turborepo + npm workspaces.
- Frontend: Next.js 15 App Router, React 19, Tailwind, shared `@kairos/ui`, TanStack Query, Zustand.
- Backend: Hono API on Node for local development, structured so module routers can later map to Lambda.
- Database: PostgreSQL 15 locally via Docker, Drizzle ORM schemas and migrations in `packages/database`.
- Auth: local bcrypt + jsonwebtoken, refresh tokens, approval status, active role context. Cognito is a future deployment swap, not current runtime code.
- Testing: Vitest, React Testing Library, strict TDD for behavior changes.

## Product Surface

The original rebuild MVP focused on Auth, Branches, Members, and Fellowships. The current codebase also includes Departments, Reports/Analytics, Outreach Programs, Souls Pipeline, New Believers, rota, and uniform workflows. Do not assume a four-module-only app when planning navigation, permissions, or shared types.

Authorization model (RBAC rebuild, 2026-06):

- `systemRole` collapsed to two values: `admin` (global) and `member` (everyone else).
- Real authority comes from **functional grants** in `member_roles`: `BranchAdmin`, `BranchDataAdmin`, `FellowshipLeader`, `DepartmentLeader`, `DepartmentDeputy`, `SafeguardingLead`, `NewBelieversMentor`, `NewBelieversTeacher`. Each grant pairs a role bundle with a `scope_kind` + `scope_id` (branch / fellowship / department).
- Capabilities (`branch:write`, `fellowship:write`, `safeguarding:read`, …) are computed from grants at request time. Gate code with `requireCapability(cap, scopeFn?)` on the API and `useCapabilities().has(cap, scope?)` in the web app.
- `pastor` is now a display-only honorific (`members.honorific`) — not a permission carrier. A "Pastor" who only leads a fellowship sees only fellowship-leader things.
- There is no in-app role switcher and no login-then-select-role step; login mints one token whose `grants[]` claim drives all UI affordances.

## Workspace Map

```text
apps/api/          Hono API server, module routers, services, schemas, tests
apps/web/          Next.js App Router frontend
packages/types/    Shared entity, enum, and API contract types
packages/database/ Drizzle schemas, migrations, seeds, reset scripts
packages/utils/    Shared auth, responses, errors, mailer, logger utilities
packages/api-client/ Typed HTTP client used by the frontend
packages/ui/       Shared UI components and Tailwind globals
requirements/      Product and architecture requirements
.github/instructions/ Scoped coding-agent instructions
.github/prompts/   Reusable planning/implementation prompts
```

## Route Alignment Triplet

Feature work should preserve this chain:

1. Hono route and service in `apps/api/src/{module}`.
2. Shared request/response/entity types in `packages/types/src`.
3. API client method in `packages/api-client/src/api.ts`.
4. Frontend hook in `apps/web/src/hooks`.
5. Page/component usage in `apps/web/src/app` or `apps/web/src/components`.

Current API routes are mounted under `/api/*` in `apps/api/src/app.ts`, not `/v1/*`.

## Backend Patterns

- Module folders usually contain `schemas.ts`, `service.ts`, `router.ts`, and focused tests.
- Use `zValidator` or Zod schemas at route boundaries.
- Use `authMiddleware`, `requireCapability`, `requireAnyCapability`, and `getAuth` from `apps/api/src/middleware/auth.ts`. Service files use the inline helpers `enforceBranchScope(auth, branchId?)` and `enforceLeaderOrAbove(auth, entity)`. The legacy `requireRole(...)` is gone — gate on capabilities, not role names.
- Use shared errors from `@kairos/utils` and return via `successResponse`.
- Keep business rules in services; keep routers thin.
- Register static routes like `/import`, `/export`, `/roles`, and `/me` before `/:id` routes.
- Use Drizzle query builders and parameterized SQL helpers. Avoid string-built SQL.
- Get the database from `apps/api/src/db.ts`; do not create ad hoc database clients in feature code.

## Data Rules

- UUID primary keys in Drizzle.
- SQL columns are snake_case; TypeScript fields are camelCase.
- Use `isActive` soft deletes. Do not hard-delete business records unless a requirement explicitly calls for it.
- Every branch-scoped non-admin query must filter by the caller's branch context.
- Members can have home and active secondary branch context; inspect existing service logic before adding branch filters.
- Use `varchar` + check constraints for fixed values unless the existing table already uses a different pattern.
- Timestamps use `createdAt` and `updatedAt`.
- Migrations live in `packages/database/drizzle`; schema definitions live in `packages/database/src/schema`.

## Frontend Patterns

- Server Components by default. Add `'use client'` only for hooks, browser APIs, local state, or event handlers.
- Use `@kairos/ui` components and local design conventions before introducing new primitives.
- Forms use React Hook Form + Zod.
- Remote data uses TanStack Query hooks that wrap `@kairos/api-client`.
- Auth state lives in `apps/web/src/lib/auth-store.ts`.
- Use `DateSelect` for date picking and `CustomSelect`/shared select components for dropdowns.
- Route guards should be role-aware and should respect `activeRole`.
- Prefer lucide icons for new controls when available; match existing inline icon style only when touching a local cluster that already uses it.

## Testing Expectations

- For behavior changes, write or update failing tests first.
- Backend tests should cover happy path, validation, authorization, branch isolation, and soft-delete behavior where relevant.
- Frontend tests should focus on visible behavior and user interactions.
- Co-locate tests beside source.
- Mock database and HTTP boundaries in unit tests; use Docker PostgreSQL only for intentional integration tests.

## Useful Commands

```bash
docker compose up -d
npm install
npx turbo db:fresh
npx turbo dev
npx turbo test
npx turbo typecheck
npx turbo lint
npx turbo build
```

Targeted examples:

```bash
npm run test --workspace=@kairos/api
npm run test --workspace=@kairos/web
npm run typecheck --workspace=@kairos/api
npm run typecheck --workspace=@kairos/web
```

## Agent Orchestration

Use one orchestrator and parallel workers only when the work naturally splits into independent write scopes. The orchestrator owns the plan, dependency graph, integration, and final verification.

Good parallel lanes:

- Types/database lane: `packages/types`, `packages/database`.
- API lane: one module under `apps/api/src/{module}`.
- Client/hooks lane: `packages/api-client` plus related `apps/web/src/hooks`.
- UI lane: one route subtree or component cluster in `apps/web/src`.
- Test/verification lane: focused tests after implementation contracts are known.

Rules for parallel work:

- Assign explicit file ownership before workers start.
- Do not let two workers edit the same file unless one is only reviewing.
- Start with contracts: types, schemas, route shapes, and permissions.
- Integrate through the route alignment triplet.
- Run targeted tests per lane, then a broader typecheck/test pass after integration.
- Record unresolved product decisions in the final summary instead of encoding guesses into docs.

## Pulling Requirements Into Work

Before implementing a feature, check the relevant files in `requirements/`. The older requirements include future AWS, Cognito, S3, donations, and notification scope. For the current local-first app, implement only what is present in the active code path or explicitly requested.
