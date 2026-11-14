# apps/api — Hono API rules

Three files per module, always: `router.ts`, `service.ts`, `schemas.ts`. Tests sit next to source: `router.test.ts`, `service.test.ts`. Mounted in `app.ts` at `/api/{module}`.

## File responsibilities

**`schemas.ts`** — Zod schemas for request bodies, query params, and shared discriminated unions. One schema per route shape. Use `.partial()` to derive update schemas from create schemas. Export schema types where the service needs to consume them.

**`service.ts`** — Business logic, Drizzle queries, authorization helpers, side effects (email, etc.). Functions accept `(db, auth, ...args)` so they're trivially unit-testable. Throw typed errors from `@kairos/utils`; never return `{error, data}` tuples.

**`router.ts`** — Hono router. Mounts middleware (`authMiddleware`, `requireCapability`/`requireAnyCapability`), validates with `zValidator`, calls a service function, wraps the result in `successResponse(...)`. Routers must stay thin — no business logic.

## Patterns to copy

### Router scaffold

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireCapability, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import { createXSchema, /* ... */ } from './schemas';
import { listX, getX, createX, /* ... */ } from './service';

export const xRouter = new Hono();
xRouter.use('*', authMiddleware);

xRouter.get('/', zValidator('query', listXQuerySchema), async (c) => {
  const auth = getAuth(c);
  const result = await listX(db, auth, c.req.valid('query'));
  return c.json(successResponse(result));
});

// Scope-bound gate: closure reads the body and tells requireCapability
// which branch the write targets, so a BranchAdmin grant for branch A
// can't be used to write to branch B.
xRouter.post(
  '/',
  zValidator('json', createXSchema),
  requireCapability('branch:write', (c) => ({ kind: 'branch', id: c.req.valid('json').branchId })),
  async (c) => {
    const auth = getAuth(c);
    const created = await createX(db, auth, c.req.valid('json'));
    return c.json(successResponse(created), 201);
  },
);
```

### Service shape

```ts
import { eq, and } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { xs } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError } from '@kairos/utils';

function enforceBranchScope(auth: AuthContext, branchId?: string) {
  // System admin bypasses scope checks. Everyone else needs an explicit grant
  // for the target branch.
  if (auth.systemRole === 'admin') return;
  if (branchId && !authHasCapability(auth, 'branch:write', { kind: 'branch', id: branchId })) {
    throw new ForbiddenError('You cannot access X in this branch');
  }
}

export async function listX(db: Database, auth: AuthContext, query: ListXQuery) {
  const conditions = [eq(xs.isActive, true)];
  // Non-admins see only the branches their grants cover. Use the
  // capability check rather than systemRole — `authHasCapability` walks
  // the grants and returns true for any branch the caller can read.
  if (auth.systemRole !== 'admin') {
    conditions.push(eq(xs.branchId, auth.branchId));
  } else if (query.branchId) {
    conditions.push(eq(xs.branchId, query.branchId));
  }
  // pagination via (query.page - 1) * query.limit
  // ...
}
```

## Rules

- **Wire the route in `app.ts`** the moment the router exists. The triplet (`router → api-client → hook`) is not complete until the router is mounted.
- **Public routes** live in `app.ts` directly (e.g. `/api/public/branches`). Anything under a `xxxRouter.use('*', authMiddleware)` is authenticated.
- **Order static paths before `/:id`** in the router, otherwise `/import`, `/export`, `/me` get caught by the param.
- **Branch-scoped reads** filter by `auth.branchId` for non-admins. Define `enforceBranchScope` locally in the service file (not imported) — it varies enough per module that DRY here hurts. Cross-branch reach comes from grants, checked via `authHasCapability(auth, cap, scope)`.
- **Leader writes** in fellowships/departments use a local `enforceLeaderOrAbove(auth, entity)` helper. Look at `fellowships/service.ts` for the pattern.
- **Pagination contract**: `page` (1-indexed), `limit`, `search`, `sortBy`, `sortOrder`. Return `{ items, total, page, limit }` shaped via `paginatedResponse`. Keep parameter names consistent across modules.
- **Email side effects** go through `@kairos/utils` mailer functions. The local mailer logs the Ethereal preview URL — don't roll your own SMTP.
- **`getDb()` doesn't exist here** — the singleton is `db` from `apps/api/src/db.ts`. Import that.
- **Listing endpoints** that join across tables: use Drizzle `leftJoin` and select specific columns. Don't `SELECT *` and reshape in JS.
- **Mutations always return the affected entity** (or list for batch ops), shaped consistently with the list endpoint.
- **Gate on capabilities, not role names.** `requireCapability('cap', scopeFn?)` and `requireAnyCapability(...caps)` are the standard gates. Adding a new capability means extending the `Capability` union and `RoleCapabilities` map in `@kairos/types/rbac`.
- **`requireRole(...)` is not gone**, despite what this file used to say. It survives on the handful of genuinely platform-admin routes as `requireRole('admin')`, which is correct, because `admin` is a real `systemRole`. **Never pass it a name that is not one.** `requireRole('admin', 'pastor', 'leader', 'member')` guarded `/api/reports/*` for a long time and passed for every authenticated caller — `systemRole` collapsed to `'admin' | 'member'` and both were in the list. A gate that reads as a gate and is not will eventually be trusted.
- **Permission rejections are 403, not 401.** Every "Insufficient permissions" throw in `middleware/auth.ts` uses `ForbiddenError`. This matters beyond pedantry: the api-client refreshes the token on 401 and logs out on terminal auth failure, so throwing 401 at someone who merely lacks a grant can bounce them to `/login` instead of telling them they have no access. 401 is reserved for a missing, malformed or expired token.

## Tests

- `service.test.ts` mocks the Drizzle `db` object. Test happy path + each error path (NotFound, Forbidden, Conflict, Validation) + branch isolation for each non-admin role + soft-delete behavior.
- `router.test.ts` tests via a mocked service. Asserts on status codes, response shape, and that the right middleware combination ran (`requireCapability` rejections produce 403; missing auth produces 401).
- Write the failing test first. Then the service. Then wire the router. Don't reverse this order.

## Things commonly gotten wrong

- New routes mounted as `/v1/auth/...` — wrong, it's `/api/auth/...` in `app.ts`.
- Using `getAuthContext` (doesn't exist) instead of `getAuth(c)`.
- Forgetting `authMiddleware` and shipping an unauthenticated read endpoint.
- Putting validation in the service — validation belongs in `schemas.ts` and is enforced by `zValidator`.
- Returning Drizzle row objects directly when the type contract calls for a DTO. Map at the service boundary.
