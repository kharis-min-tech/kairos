---
description: "Create TanStack Query hooks for a domain. Input: domain name, API methods to wrap."
mode: agent
agent: frontend-ui
---

# Implement API Hook

## Inputs
- **Domain**: ${{DOMAIN}} (e.g., members, donations, attendance)
- **API Methods**: ${{API_METHODS}} (e.g., list, get, create, update, delete)

## Steps

### 1. Verify API Client Methods Exist
Check that `packages/api-client/src/api.ts` has the methods for this domain.
If not, they need to be added first (with the corresponding Lambda handlers).

### 2. Write Hook Tests
Create `apps/web/src/__tests__/use-${{DOMAIN}}.test.tsx`:
- Query hooks return data on success
- Query hooks handle loading state
- Query hooks handle error state
- Mutation hooks call correct API method
- Mutation hooks invalidate queries on success

### 3. Run Tests — Confirm They Fail
```bash
cd apps/web && npx vitest run src/__tests__/use-${{DOMAIN}}.test.tsx
```

### 4. Implement Hooks
Create `apps/web/src/hooks/use-${{DOMAIN}}.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@kairos/api-client';

export const ${{DOMAIN}}Keys = {
  all: ['${{DOMAIN}}'] as const,
  lists: () => [...${{DOMAIN}}Keys.all, 'list'] as const,
  list: (filters: object) => [...${{DOMAIN}}Keys.lists(), filters] as const,
  details: () => [...${{DOMAIN}}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${{DOMAIN}}Keys.details(), id] as const,
};

// One useQuery hook per read endpoint
// One useMutation hook per write endpoint
// Always invalidate related queries on mutation success
```

### 5. Run Tests — Confirm They Pass
```bash
cd apps/web && npx vitest run src/__tests__/use-${{DOMAIN}}.test.tsx
```
