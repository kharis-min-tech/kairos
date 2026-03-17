# Feature Spec Template

Use this template when writing feature specifications for the Kairos platform.

---

# Feature: [Feature Name]

## Overview

[One paragraph: what this feature does, who uses it, and why it matters.]

## Requirements Reference

- `requirements/mvp-scope.md` — Section: [X]
- `requirements/software_spec.md` — Section: [X]
- `requirements/data.md` — Tables: [X]

## Data Model

### New Tables

| Table | Schema File | Key Columns |
|-------|-------------|-------------|
| `table_name` | `packages/database/src/schema/file.ts` | branchId, name, status, isActive |

### New Types

```typescript
// packages/types/src/entities.ts
export interface EntityName {
  id: string;
  branchId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### New Enums

```typescript
// packages/types/src/enums.ts
export const StatusType = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
```

## API Endpoints

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/v1/resources` | `domain/domain-list.ts` | Yes | List with pagination |
| GET | `/v1/resources/:id` | `domain/domain-get.ts` | Yes | Get by ID |
| POST | `/v1/resources` | `domain/domain-create.ts` | Yes | Create new |
| PUT | `/v1/resources/:id` | `domain/domain-update.ts` | Yes | Update existing |
| DELETE | `/v1/resources/:id` | `domain/domain-delete.ts` | Yes | Soft delete |

### Request/Response Shapes

```typescript
// POST /v1/resources
// Request
{ name: string; description?: string; branchId: string; }

// Response (201)
{ id: string; name: string; ... }

// GET /v1/resources?page=1&limit=20&search=term
// Response (200)
{ data: Entity[]; total: number; page: number; limit: number; totalPages: number; }
```

## Frontend

### Pages

| Route | Page Component | Data Hooks |
|-------|---------------|------------|
| `/dashboard/resources` | `ResourceListPage` | `useResourceList` |
| `/dashboard/resources/:id` | `ResourceDetailPage` | `useResource` |
| `/dashboard/resources/new` | `ResourceCreatePage` | `useCreateResource` |

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ResourceTable` | `components/resources/` | Data table with sort/filter |
| `ResourceForm` | `components/resources/` | Create/edit form |
| `ResourceCard` | `components/resources/` | Summary card for detail view |

### Hooks

| Hook | File | API Method |
|------|------|------------|
| `useResourceList` | `hooks/use-resources.ts` | `api.resources.list` |
| `useResource` | `hooks/use-resources.ts` | `api.resources.get` |
| `useCreateResource` | `hooks/use-resources.ts` | `api.resources.create` |

## Test Plan

### Unit Tests — API Handlers
For each handler:
- [ ] Returns correct status code and body on success
- [ ] Returns 400 for invalid input
- [ ] Returns 403 when accessing another branch's data (non-admin)
- [ ] Returns 404 for non-existent resource
- [ ] Returns 409 for duplicate (if applicable)

### Unit Tests — Components
- [ ] Renders with data
- [ ] Shows loading skeleton
- [ ] Shows error message
- [ ] Shows empty state
- [ ] Form validation works
- [ ] Submit calls mutation

### E2E Tests
- [ ] User can view resource list
- [ ] User can create a new resource
- [ ] User can view resource details
- [ ] User can edit a resource
- [ ] User can soft-delete a resource

## Implementation Order

1. Entity type + enum in `packages/types/`
2. Drizzle schema + migration in `packages/database/`
3. Zod validation schema in `packages/utils/`
4. **Tests** for handlers → implement handlers in `apps/api/`
5. CDK routes in `infrastructure/`
6. API client methods in `packages/api-client/`
7. TanStack Query hooks in `apps/web/src/hooks/`
8. **Tests** for components → implement components in `apps/web/`
9. E2E test in `e2e/`

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Branch isolation enforced (non-admin cannot access other branches)
- [ ] Pagination works with correct totals
- [ ] Search filters results correctly
- [ ] Soft delete sets `isActive = false` (no hard delete)
- [ ] Route alignment triplet complete (handler + CDK + API client)
