---
description: "Create a new API endpoint with TDD. Input: domain name, action, HTTP method, path, request/response shape."
mode: agent
agent: backend-api
---

# Implement API Endpoint

## Inputs
- **Domain**: ${{DOMAIN}} (e.g., members, donations, attendance)
- **Action**: ${{ACTION}} (e.g., create, list, get, update, delete)
- **Method**: ${{HTTP_METHOD}} (GET, POST, PUT, PATCH, DELETE)
- **Path**: ${{API_PATH}} (e.g., /v1/members)

## Steps

### 1. Write Tests First
Create `apps/api/src/${{DOMAIN}}/${{DOMAIN}}-${{ACTION}}.test.ts` with tests for:
- Happy path (correct status code and response shape)
- Validation error (invalid/missing fields)
- Auth failure (missing/invalid token)
- Branch isolation (non-admin accessing another branch)
- Not found (if applicable)
- Duplicate/conflict (if applicable)

### 2. Run Tests — Confirm They Fail
```bash
cd apps/api && npx vitest run src/${{DOMAIN}}/${{DOMAIN}}-${{ACTION}}.test.ts
```

### 3. Implement Handler
Create `apps/api/src/${{DOMAIN}}/${{DOMAIN}}-${{ACTION}}.ts` following the handler pattern:
- `resolveAuthContext(event)` for auth
- `validateOrThrow(schema, body)` for input validation
- `enforceBranchAccess(ctx, branchId)` for branch isolation
- Business logic with Drizzle queries
- `successResponse(data)` or `createdResponse(data)`
- `handleError(err)` in catch block

### 4. Run Tests — Confirm They Pass
```bash
cd apps/api && npx vitest run src/${{DOMAIN}}/${{DOMAIN}}-${{ACTION}}.test.ts
```

### 5. Add CDK Route
Add to `infrastructure/src/stacks/api-stack.ts`:
```typescript
route('${{DOMAIN}}${{ACTION}}', '${{DOMAIN}}/${{DOMAIN}}-${{ACTION}}.ts', HttpMethod.${{HTTP_METHOD}}, '${{API_PATH}}');
```

### 6. Add API Client Method
Add to `packages/api-client/src/api.ts` in the appropriate domain section.

### 7. Add Zod Schema (if POST/PUT/PATCH)
Add validation schema to `packages/utils/src/validator/schemas.ts`.
