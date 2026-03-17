---
description: "Add a new Drizzle ORM table with migration. Input: table name, columns, relations."
mode: agent
agent: database
---

# Add Drizzle Migration

## Inputs
- **Table Name**: ${{TABLE_NAME}} (snake_case, plural)
- **Schema File**: `packages/database/src/schema/${{SCHEMA_FILE}}.ts`
- **Columns**: ${{COLUMNS}}
- **Relations**: ${{RELATIONS}}

## Steps

### 1. Add Entity Type
Add interface to `packages/types/src/entities.ts`:
```typescript
export interface ${{ENTITY_NAME}} {
  id: string;
  branchId: string;
  // ... camelCase fields matching Drizzle output
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Add Enums (if needed)
Add const objects to `packages/types/src/enums.ts`:
```typescript
export const ${{ENUM_NAME}} = { VALUE_ONE: 'value_one', VALUE_TWO: 'value_two' } as const;
```

### 3. Create/Update Schema
Add table to `packages/database/src/schema/${{SCHEMA_FILE}}.ts`:
- uuid primary key
- branch foreign key
- `isActive` soft delete flag
- `createdAt` + `updatedAt` timestamps
- Check constraints for business rules
- Relations to parent/child tables

### 4. Export from Index
Add new table and relations to `packages/database/src/index.ts`.

### 5. Generate Migration
```bash
cd packages/database && npx drizzle-kit generate
```

### 6. Review Migration SQL
Read the generated file in `packages/database/drizzle/` and verify:
- Table name is correct
- Column types match schema
- Foreign keys point to correct tables
- Indexes are appropriate
- No destructive changes to existing tables
