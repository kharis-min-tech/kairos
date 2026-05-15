---
applyTo: "apps/web/**/*.tsx"
---

## React And UI Rules

- Server Components by default. Add `'use client'` only for hooks, browser APIs, state, or event handlers.
- Use function components with TypeScript interfaces for non-trivial props.
- Use `@kairos/ui` components before creating local primitives.
- Use Tailwind classes; do not add CSS modules or styled-components.
- Use `Link` from `next/link` for internal navigation.
- Forms use React Hook Form + Zod resolver.
- Remote data uses TanStack Query hooks wrapping `@kairos/api-client`.
- Global auth state uses `apps/web/src/lib/auth-store.ts`.
- Use `DateSelect` for all date selection.
- Use `CustomSelect` or shared select primitives; do not add native `<select>` for new UI.
- Respect `DESIGN.md`: purple/gold palette, dark purple headers instead of navy, tonal surfaces, compact radii, no nested cards.
- New role-gated UI must use `activeRole` and match API authorization rules.
