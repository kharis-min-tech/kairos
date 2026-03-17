# API — Lambda Handlers

Every API endpoint is a single Lambda handler in `src/<domain>/<domain>-<action>.ts`.

## Handler Pattern

```typescript
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { resolveAuthContext, enforceBranchAccess, handleError, successResponse, createdResponse, validateOrThrow, getDb, createLogger } from '@kairos/utils';
import { someTable } from '@kairos/database';
import type { SomeEntity } from '@kairos/types';

const logger = createLogger('domain-action');

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    enforceBranchAccess(ctx, targetBranchId);

    const body = validateOrThrow(schema, JSON.parse(event.body || '{}'));

    const db = getDb();
    // ... business logic using Drizzle queries ...

    return successResponse(result);    // 200
    // or: return createdResponse(result);  // 201
  } catch (err) {
    return handleError(err);
  }
};
```

## Auth Flow

1. Custom Authorizer (`src/auth/authorizer.ts`) validates Cognito JWT, always returns `isAuthorized: true` (CORS safety)
2. Route handler calls `resolveAuthContext(event)` → looks up member by Cognito sub in database → returns `AuthContext`
3. `enforceBranchAccess(ctx, branchId)` throws `ForbiddenError` if non-admin tries to access another branch's data
4. Public endpoints (register, login) skip auth via `skipAuth: true` in CDK route config

## Error Classes

Import from `@kairos/utils`:
- `BadRequestError` — invalid input
- `UnauthorizedError` — no valid auth
- `ForbiddenError` — insufficient permissions
- `NotFoundError` — resource not found
- `ConflictError` — duplicate resource
- `ValidationFailedError` — zod validation failure (auto-thrown by `validateOrThrow`)

## Existing Domains

`src/admin/`, `src/analytics/`, `src/attendance/`, `src/auth/`, `src/branches/`, `src/departments/`, `src/donations/`, `src/fellowships/`, `src/forms/`, `src/members/`, `src/notifications/`, `src/outreach/`, `src/reports/`, `src/websocket/`

## List Endpoint Pattern

Paginated list handlers follow this pattern:
- Parse `page`, `limit`, `search`, `sortBy`, `sortOrder` from `event.queryStringParameters`
- Non-admin users automatically filter by `ctx.branchId`
- Search uses `ilike` on name/email/phone
- Return `{ data, total, page, limit, totalPages }`

## Route Alignment

When creating/modifying a handler, ALSO update:
1. CDK route in `infrastructure/src/stacks/api-stack.ts` — use the `route()` helper
2. API client method in `packages/api-client/src/api.ts`

## Testing

- Test file: co-located at `src/<domain>/<domain>-<action>.test.ts`
- Mock `@kairos/utils` (getDb, resolveAuthContext, etc.) using `vi.mock()`
- Test: happy path, validation errors, auth failures, branch isolation, not found, duplicates
- Vitest config: `node` environment, `@kairos/*` path aliases
