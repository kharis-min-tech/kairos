---
applyTo: "**/*.ts,**/*.tsx"
---

## TypeScript Conventions

- Use `type` imports for type-only references: `import type { X } from 'module'`.
- Prefer `interface` for object shapes and `type` for unions/intersections/utility types.
- Use const objects or string literal unions for enums; do not add TypeScript `enum`.
- Add explicit return types on exported functions when inference is not obvious at the API boundary.
- Use `unknown` over `any`; narrow with type guards.
- Prefer `??` over `||` for nullish defaults.
- Use optional chaining for nullable access.
- Keep shared contracts in `@kairos/types`; do not duplicate request/response/entity shapes in apps.
- Keep API route paths, API client methods, and frontend hooks aligned.
- Do not swallow async errors silently. If an email/side effect is intentionally non-blocking, keep the `.catch(() => {})` local and obvious.
