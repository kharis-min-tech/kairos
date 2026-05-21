# Plan Backend API Work

Use this prompt for backend-first changes.

## Inspect First

- `apps/api/src/app.ts` for route mounts.
- Existing module closest to the feature.
- `packages/types/src/api.ts` and `packages/types/src/entities.ts`.
- `packages/database/src/schema` and migrations if persistence changes.
- `packages/api-client/src/api.ts` for the consumer contract.

## Required Plan Shape

1. Route paths and methods under `/api/*`.
2. Auth and role rules.
3. Branch isolation rules.
4. Zod request/query schemas.
5. Service functions and business rules.
6. Database reads/writes and transaction needs.
7. Shared type changes.
8. API client changes.
9. Tests to write first.
10. Verification commands.

## Backend Standards

- Routers stay thin.
- Services own business logic.
- Use shared error classes and `successResponse`.
- Register static routes before `/:id`.
- Do not create ad hoc database clients.
- Preserve `isActive` soft-delete behavior.

## Parallel Work

Backend work can split into:

- Types/database contract.
- One API module implementation.
- API client update.
- Tests for the touched module.

Only split after route shapes and shared types are agreed.
