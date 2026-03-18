---
applyTo: "apps/web/**/*.tsx"
---

## React Component Rules

- Use function components with TypeScript interfaces for props
- Co-locate component tests: `ComponentName.test.tsx` beside `ComponentName.tsx`
- Use `'use client'` directive only when component uses hooks or browser APIs
- Server Components by default in Next.js App Router
- Shadcn/ui components from `@kairos/ui` — never install shadcn/ui in apps/web directly
- Tailwind CSS for styling — no CSS modules or styled-components
- Use `Link` from `next/link` for navigation — never `<a>` tags for internal routes
- Forms: React Hook Form + Zod resolver for validation
- State: Zustand for global state, React state for local component state
- Data fetching: TanStack Query (useQuery/useMutation) wrapping `@kairos/api-client` methods
- Color palette: Purple #6D28D9 (primary), Gold #D97706 (accent), Emerald #059669 (success), Rose #E11D48 (error)
