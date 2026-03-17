---
applyTo: "packages/database/**/*.ts"
---

## Drizzle Schema Rules

- Table name: `pgTable('snake_case_plural', { ... })`
- Primary key: `id: uuid('id').defaultRandom().primaryKey()`
- Foreign keys: `columnId: uuid('column_id').notNull().references(() => parentTable.id)`
- Soft delete: `isActive: boolean('is_active').default(true).notNull()` — every table
- Timestamps: `createdAt: timestamp('created_at').defaultNow().notNull()` and `updatedAt: timestamp('updated_at').defaultNow().notNull()` — every table
- Column naming: snake_case in SQL (`branch_id`), Drizzle maps to camelCase in TypeScript (`branchId`)
- String columns: use `varchar('name', { length: N })` with explicit length, or `text()` for unbounded
- Money: `decimal('amount', { precision: 10, scale: 2 })` — never `float`
- Check constraints: add in the table's third argument for business rule validation
- Relations: define `tableNameRelations` using `relations()` in the same file
- Exports: every new table and relation MUST be added to `src/index.ts`
- Enums: use `varchar` + check constraint — not PostgreSQL `CREATE TYPE` enums
