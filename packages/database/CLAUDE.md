# packages/database — Drizzle schemas + migrations

Drizzle is the source of truth in TypeScript; raw SQL files in `drizzle/` are the source of truth in the database. The two must agree.

## Layout

```
src/
  schema/
    {table-kebab}.ts    one file per table (or tight cluster of related tables)
    index.ts            barrel that re-exports every table + relations
  index.ts              package entry — re-exports everything from src/schema + types
  reset.ts              drops + recreates schema (used by `db:fresh`)
  seed.ts               seed orchestrator
  seed-souls.ts         module-specific seed
drizzle/
  0001_initial.sql      raw SQL migrations, numbered. Hand-written or `drizzle-kit generate`d.
  0002_xxxxxxx.sql
  ...
```

## Table file conventions

```ts
import { pgTable, uuid, varchar, boolean, timestamp, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';

export const xs = pgTable('xs', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  name: varchar('name', { length: 150 }).notNull(),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const xsRelations = relations(xs, ({ one }) => ({
  branch: one(branches, { fields: [xs.branchId], references: [branches.id] }),
}));
```

## Rules

- **Table name in `pgTable(...)`**: snake_case, plural (`fellowship_meetings`, not `FellowshipMeeting`).
- **Primary key**: `uuid('id').defaultRandom().primaryKey()`. Always. Never serial. Never composite for entity tables (junction tables may use composite uniques, see `fellowship_join_requests`).
- **Foreign keys**: `uuid('foo_id').notNull().references(() => fooTable.id)`. `.notNull()` unless the relationship is genuinely optional. Add `.references(..., { onDelete: 'cascade' })` for child relations that don't survive parent deletion.
- **Soft delete**: every table has `isActive: boolean('is_active').notNull().default(true)`.
- **Timestamps**: every table has `createdAt` + `updatedAt`. Use `.notNull().defaultNow()` on both.
- **Snake_case in column names**, camelCase in TS field names. Drizzle maps between them.
- **String length**: always explicit on `varchar` — `varchar('name', { length: 150 })`. Use `text()` only for truly unbounded fields (notes, body content).
- **Money**: `decimal('amount', { precision: 10, scale: 2 })`. Never `real`, never `float`.
- **Enums**: `varchar` + zod-side enum, plus a Postgres CHECK constraint in the migration if the value must be enforced at the DB level. Don't use `CREATE TYPE ... AS ENUM` — they're a pain to migrate.
- **Relations**: define `xsRelations = relations(...)` in the same file. Export both.
- **Export everything** from `src/index.ts` — table, relations, inferred select/insert types.

## Migration workflow

1. **Add or modify the Drizzle table** in `src/schema/`.
2. **Write the SQL migration by hand** in `drizzle/NNNN_short_description.sql` — `drizzle-kit generate` is OK as a starting point but always review and edit, especially for additive changes on existing tables. Use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for idempotency.
3. **Add the table to `src/index.ts`** if it's new.
4. **Run `npx turbo db:fresh`** locally to validate the schema + migration agree.
5. **Test seeds still work** — if you add a non-nullable column without a default, the seed will break.

Migrations are numbered sequentially (0001, 0002, ...). Never reuse a number, never reorder. The `updated_at` trigger is created in `0001_initial.sql` — new tables that need it call `CREATE TRIGGER set_xxx_updated_at BEFORE UPDATE ON xxx FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`.

## Indexes

- All foreign-key columns should be indexed (Postgres does NOT auto-index FKs).
- `is_active` columns benefit from a partial index if the table is large: `CREATE INDEX ... ON xxx(branch_id) WHERE is_active = true;`
- Unique constraints that need to coexist with soft-delete use partial unique indexes: `CREATE UNIQUE INDEX ... ON members(email) WHERE is_active = true;`

## Things commonly gotten wrong

- Forgetting to export a new table from `src/index.ts` — the API code will compile but `@kairos/database` won't expose it.
- Writing the Drizzle schema and *not* writing the SQL migration (or vice versa).
- Using `text()` everywhere instead of `varchar(N)` — costs the DB query planner and breaks length-validation expectations downstream.
- Adding a `NOT NULL` column to an existing table without a `DEFAULT` — migration will fail on any row that exists.
- Hard-deleting in seed scripts on tables that other rows reference — use `db:fresh` for the wipe-and-rebuild flow.
