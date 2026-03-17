# Database — Drizzle ORM Schemas

## Schema Location

All schemas live in `src/schema/` and are re-exported from `src/index.ts`.

## Table Pattern

```typescript
import { pgTable, uuid, varchar, boolean, timestamp, integer, text, decimal, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

export const tableName = pgTable('table_name', {
  id: uuid('id').defaultRandom().primaryKey(),
  // columns: use snake_case SQL names, Drizzle auto-maps to camelCase in TS
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  check('name_not_empty', sql`length(${table.name}) > 0`),
]);
```

## Conventions

- **Primary key**: `uuid('id').defaultRandom().primaryKey()` — always UUID v4
- **Soft deletes**: `isActive: boolean('is_active').default(true).notNull()` — never hard delete
- **Timestamps**: Always include `createdAt` and `updatedAt`
- **Foreign keys**: Use `.references(() => parentTable.id)` with explicit column naming
- **Check constraints**: Validate data integrity at the database level
- **Enums**: Define as const objects in `@kairos/types/enums`, use `varchar` in schema with check constraints

## Relations

Define relations in the same file as the table:

```typescript
export const tableNameRelations = relations(tableName, ({ one, many }) => ({
  branch: one(branches, {
    fields: [tableName.branchId],
    references: [branches.id],
  }),
}));
```

## Existing Schemas

- `src/schema/core.ts` — regions, branches, members, branchLeadership
- `src/schema/attendance.ts` — services, serviceAttendance
- `src/schema/donations.ts` — donations

## Exports

All tables MUST be re-exported from `src/index.ts` for `@kairos/database` imports.

## Migrations

After schema changes:
```bash
cd packages/database
npx drizzle-kit generate  # Generate migration SQL in drizzle/
npx drizzle-kit push      # Apply to database (dev only)
```
