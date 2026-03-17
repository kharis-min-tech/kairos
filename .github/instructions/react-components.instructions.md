---
applyTo: "apps/web/**/*.tsx"
---

## React Component Rules

- Use function declarations for components: `export function Component() {}` — not arrow functions
- Props interface defined above the component, named `Props` or `ComponentNameProps`
- Use `cn()` from `@/lib/utils` for conditional class merging — never string concatenation
- Import Shadcn/ui components from `@/components/ui/*` — never recreate existing primitives
- Icons from `lucide-react` only
- Internal links use `<Link>` from `next/link` — never `<a>` for internal navigation
- All API data fetching goes through TanStack Query hooks in `src/hooks/` — never raw `fetch` in components
- Client state (modals, sidebar toggle) uses Zustand stores — never TanStack Query for UI state
- Forms use `react-hook-form` with `zodResolver` — never uncontrolled forms for data submission
- Show loading skeletons during data fetch, not spinners
- Handle error and empty states explicitly — never leave them unhandled
