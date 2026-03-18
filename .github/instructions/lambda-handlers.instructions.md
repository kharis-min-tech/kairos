---
applyTo: "apps/api/src/**/*.ts"
---

## Hono API Handler Rules

- Each module gets its own Hono router file: `apps/api/src/{module}/router.ts`
- Root app mounts module routers: `app.route('/v1/auth', authRouter)`
- Always wrap route handlers in try/catch — catch calls error handler middleware
- Call `getAuthContext(c)` first (unless public endpoint) to extract JWT claims
- Call `enforceBranchAccess(ctx, branchId)` for any branch-scoped data access
- Validate input with `@hono/zod-validator` middleware or `validateOrThrow(zodSchema, body)`
- Use `successResponse(data)` for 200, `createdResponse(data)` for 201
- Get database: `getDb()` — never create connections manually
- Import from `@kairos/utils` (auth, errors, responses, validation, db) and `@kairos/database` (schemas)
- Create logger per module: `const logger = createLogger('auth')`
- List endpoints: support `page`, `limit`, `search`, `sortBy`, `sortOrder` query params
- Non-admin users MUST be filtered to their own branch — check `ctx.role` and `ctx.branchId`
- Lambda entry points: `apps/api/src/{module}/lambda.ts` exports `handle(moduleApp)` for future AWS deployment
