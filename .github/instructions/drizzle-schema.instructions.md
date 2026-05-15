---
applyTo: "packages/database/**/*.ts,packages/database/drizzle/**/*.sql"
---

## Drizzle And Migration Rules

- Table names are plural snake_case: `pgTable('branch_departments', { ... })`.
- Primary keys use UUIDs: `id: uuid('id').defaultRandom().primaryKey()`.
- Foreign key properties use camelCase and SQL columns use snake_case: `branchId: uuid('branch_id')`.
- Business entities should have `isActive`, `createdAt`, and `updatedAt` unless there is an established exception.
- Soft delete with `isActive`; do not hard-delete business history.
- Use `varchar(..., { length })` for bounded strings and `text()` for unbounded text.
- Use `decimal` for money; never `float`.
- Use `varchar` + check constraints for fixed values rather than PostgreSQL enum types.
- Define relations in the schema file or adjacent schema barrel following existing patterns.
- Export every new table/relation from `packages/database/src/index.ts` or the schema barrel used by the repo.
- Add SQL migrations under `packages/database/drizzle` for schema changes. Keep migrations idempotent where practical.
- Keep schema fields consistent with `packages/types/src/entities.ts`.
