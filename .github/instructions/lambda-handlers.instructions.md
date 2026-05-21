---
applyTo: "apps/api/src/**/*.ts"
---

## Hono API Rules

- Current runtime routes are Hono routes mounted under `/api/*` in `apps/api/src/app.ts`.
- Each API module should keep thin routers, Zod schemas, service-layer business logic, and focused tests.
- Use `authMiddleware`, `requireRole`, and `getAuth` from `apps/api/src/middleware/auth.ts`.
- Validate input with `@hono/zod-validator` or existing Zod schema helpers.
- Use `successResponse` for success payloads and shared error classes from `@kairos/utils`.
- Import schemas/tables from `@kairos/database`; use the shared `db` from `apps/api/src/db.ts`.
- Static routes must be registered before `/:id` routes.
- List endpoints should support pagination/search/filter conventions where the module already does.
- Every non-admin branch-scoped query must filter to the caller's branch context.
- Lambda entry points are future deployment work. Do not add Lambda files unless the task explicitly asks for deployment packaging.
