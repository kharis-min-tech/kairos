# Kairos — Church Administration Platform

Multi-tenant SaaS for church management. Target: Easter 2026 launch.

## Tech Stack

- **Backend**: AWS Lambda (Node.js 20, TypeScript), API Gateway HTTP API v2
- **Database**: Aurora Serverless v2 (PostgreSQL 15), Drizzle ORM
- **Frontend**: Next.js 15 (React), Tailwind CSS, Shadcn/ui, TanStack Query, Zustand
- **Auth**: Cognito + Custom Authorizer Lambda (JWT)
- **Payments**: Stripe
- **Infrastructure**: AWS CDK (TypeScript), eu-west-2 (London)
- **Monorepo**: Turborepo with npm workspaces
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Monorepo Structure

```
apps/api/       → Lambda handlers (one file per endpoint)
apps/web/       → Next.js frontend
packages/types/     → Shared TypeScript types & enums (@kairos/types)
packages/database/  → Drizzle ORM schemas (@kairos/database)
packages/utils/     → Auth context, error handler, validator, logger, DB client (@kairos/utils)
packages/api-client/→ Typed HTTP client for frontend (@kairos/api-client)
packages/ui/        → Shared React components (@kairos/ui)
infrastructure/     → AWS CDK stacks
e2e/                → Playwright E2E tests
requirements/       → PRD, architecture, data model, design spec, implementation plan
```

## Conventions

- **Route alignment triplet**: Every endpoint requires three files in sync — Lambda handler in `apps/api/src/`, CDK route in `infrastructure/src/stacks/api-stack.ts`, API client method in `packages/api-client/src/api.ts`.
- **camelCase types**: All interfaces in `@kairos/types` use camelCase to match Drizzle ORM output.
- **Link-only navigation**: Next.js internal navigation uses `<Link>` — never plain `<a>` for internal routes.
- **Serverless-first**: No EC2, ECS, or Kubernetes. All compute is Lambda.
- **Branch isolation**: Non-admins see ONLY their branch data. Enforced via `enforceBranchAccess()` in every handler.
- **Soft deletes**: Use `is_active = false` — never hard delete records.
- **Imports**: Use `@kairos/*` package aliases (`@kairos/utils`, `@kairos/database`, `@kairos/types`, `@kairos/api-client`).

## TDD Mandate

All work follows strict test-driven development:
1. Write failing tests FIRST (Vitest for unit/integration, Playwright for E2E)
2. Implement the minimum code to pass tests
3. Refactor while tests stay green
4. Never commit code without corresponding tests

## Build & Test Commands

```bash
npx turbo build          # Build all packages
npx turbo test           # Run all Vitest tests
npx turbo lint           # Lint all packages
npx turbo dev            # Start dev servers
npx playwright test      # Run E2E tests
```

## Requirements

Detailed specs are in `requirements/`:
- [architecture.md](requirements/architecture.md) — C4 model, data flows, security layers
- [data.md](requirements/data.md) — 23-table schema, business rules, common queries
- [design.md](requirements/design.md) — Purple design system, 10 screen specs, component library
- [implementation-spec.md](requirements/implementation-spec.md) — 10-week timeline, task breakdown
- [mvp-scope.md](requirements/mvp-scope.md) — 13 MVP modules, acceptance criteria
- [software_spec.md](requirements/software_spec.md) — Full feature spec, department systems
- [stack.md](requirements/stack.md) — 31 technology decisions
