---
applyTo: "**/*.ts"
---

## TypeScript Conventions

- Use `type` imports for type-only references: `import type { X } from 'module'`
- Prefer `interface` for object shapes, `type` for unions/intersections/utility types
- Use const objects for enums (not TypeScript `enum`): `export const Status = { ACTIVE: 'active', INACTIVE: 'inactive' } as const`
- Explicit return types on exported functions
- Use `unknown` over `any` — narrow with type guards
- Prefer `??` over `||` for nullish defaults
- Use optional chaining `?.` for nullable access
- All shared types go in `@kairos/types`, not duplicated locally
- Async functions should have proper error handling — never swallow errors silently
