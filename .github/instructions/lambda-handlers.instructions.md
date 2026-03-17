---
applyTo: "apps/api/src/**/*.ts"
---

## Lambda Handler Rules

- One handler per file: `export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>`
- Always wrap body in `try/catch` — catch calls `handleError(err)`
- Call `resolveAuthContext(event)` first (unless public endpoint)
- Call `enforceBranchAccess(ctx, branchId)` for any branch-scoped data access
- Validate input with `validateOrThrow(zodSchema, JSON.parse(event.body || '{}'))`
- Use `successResponse(data)` for 200, `createdResponse(data)` for 201
- Parse path params: `const { id } = event.pathParameters || {}`
- Parse query params: `const { page, limit, search } = event.queryStringParameters || {}`
- Get database: `const db = getDb()` — never create connections manually
- Import from `@kairos/utils` (auth, errors, responses, validation, db) and `@kairos/database` (schemas)
- Create logger per handler: `const logger = createLogger('domain-action')`
- List endpoints: support `page`, `limit`, `search`, `sortBy`, `sortOrder` query params
- Non-admin users MUST be filtered to their own branch — check `ctx.role` and `ctx.branchId`
