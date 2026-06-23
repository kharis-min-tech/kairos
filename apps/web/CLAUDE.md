# apps/web — Next.js 15 App Router rules

Pages live under `src/app/(auth)/` or `src/app/(dashboard)/` (route groups). Hooks live in `src/hooks/use-{module}.ts`. The HTTP client is the singleton `api` from `src/lib/api.ts`.

## File layout

```
src/app/(auth)/         public auth pages — login, signup, forgot/reset, verify
src/app/(dashboard)/    authenticated pages — dashboard, members, fellowships, ...
  layout.tsx              dashboard chrome (sidebar/bottom nav, auth guard)
  {module}/page.tsx       list/detail entry
  {module}/[id]/page.tsx  per-entity detail/edit
  {module}/_components/   page-local components (kept out of the route tree by underscore)

src/hooks/use-{module}.ts   TanStack Query hooks for that module
src/lib/api.ts              api singleton (api.fellowships.list(), api.auth.login(), ...)
src/lib/auth-store.ts       Zustand auth store (accessToken, refreshToken, user, activeRole)
src/stores/                 Other Zustand stores (outreach, souls)
src/components/             App-level components (NOT design system — those live in @kairos/ui)
```

## Hook pattern (the only pattern)

```ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateXRequest, UpdateXRequest, XListParams } from '@kairos/types';

export function useXs(params?: XListParams) {
  return useQuery({
    queryKey: ['xs', params],
    queryFn: async () => {
      const res = await api.xs.list(params);
      return res.data!;
    },
  });
}

export function useX(id: string) {
  return useQuery({
    queryKey: ['xs', id],
    queryFn: async () => (await api.xs.get(id)).data!,
    enabled: !!id,
  });
}

export function useCreateX() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateXRequest) => (await api.xs.create(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['xs'] }),
  });
}
```

Query keys: the module name as a stable string, plus params/id. Mutation `onSuccess` invalidates `['xs']` (the module key) — that's the contract. Don't get clever with granular invalidation.

## Pages

- **Server Components by default.** Only add `'use client'` when the file uses hooks, state, event handlers, or browser APIs. Pages that consume our hooks are almost always client components.
- **Forms**: React Hook Form + Zod resolver. Mirror the API schema in a frontend Zod schema so the two can drift independently when needed but stay in shape.
- **Loading + error states** are required for every `useQuery`-driven view. Skeleton loaders > spinners. Error messages must surface the API error message when present.
- **Route guards**: pages call `useCapabilities()` and gate render/redirect on `caps.has(cap, scope?)`. The dashboard layout still keeps a coarse `activeRole === 'admin'` check for the admin-only nav, but the fine-grained "can this user see this CTA / page" decisions live on capabilities. Admin-only routes (e.g. `/reports`, `/members/new`, `/admin/*`) check inside the page on mount as a second-level guard.
- **Mutations**: on success, route via `router.push(...)` or close a dialog — never set up a `setTimeout` to wait for the cache. TanStack Query's invalidation handles refresh.

## State, in order of preference

1. **Local `useState`** — first choice for component-scoped state.
2. **TanStack Query** — anything server-derived. Don't mirror server state into Zustand.
3. **Zustand** — auth, multi-page wizard state, cross-page UI state (drafts, filters).
4. **URL search params** — filters and pagination that need to be shareable/bookmarkable.

No Redux. No Jotai. No Context-as-state. If you reach for one of these, you're probably solving the wrong problem.

## Design system

- Import primitives from `@kairos/ui`: `Button`, `Input`, `Card`, `Dialog`, `Badge`, `Select`, `Table`, `Textarea`, `Label`, `NumberStepper`, `CustomSelect`, `DateSelect`, `TimeSelect`.
- **No `<input type="date">`** — `DateSelect` is the only date input. See `DESIGN.md §6`.
- **No native `<select>`** — `CustomSelect` is the only dropdown.
- **Modern Sanctuary palette** (see root `CLAUDE.md`): primary `#5D3FD3`, gold `#f8b537`, gradient `from-[#451ebb] to-[#5d3fd3]`. Use arbitrary Tailwind values — the design tokens haven't been swapped yet.
- **No new uses of the old palette** (`purple-700`, `purple-900`, `amber-400`, `#6D28D9`, `#D97706`). Migrate inline when touching a file; flag larger migrations for a `/gap-fix` pass.

## Auth flow

`auth-store.ts` holds `accessToken`, `refreshToken`, `user`, `activeRole`, `scope`. The api-client gets a callback that reads `accessToken` on every request and refreshes via `refreshToken` on 401. On terminal auth failure the store logs out and redirects to `/login`.

`activeRole` mirrors the JWT's `systemRole` (`admin` or `member`). It governs the coarse dashboard chrome; fine-grained CTAs use `useCapabilities()` which decodes grants out of the access-token payload. Login is single-step — no role selection — and there is no in-app role switcher.

## Tests

- Component tests use Vitest + React Testing Library, co-located. Prefer `getByRole` / `getByText`; reserve `getByTestId` for cases where the DOM has no accessible name.
- Mock the api-client (or the hook directly with `vi.mock`) — never let a test hit `http://localhost:3001`.
- Test the user-visible behavior, not implementation details. Form validation, error display, loading states, submit calls, mutation invalidation.

## Things commonly gotten wrong

- Calling `api.fellowships.list()` and forgetting `.data!` — the api-client returns the full envelope.
- Adding `'use client'` to a page that doesn't need it (Server Components are the default).
- Putting design-system primitives in `apps/web/src/components/` — they belong in `packages/ui`.
- Reaching for `useEffect` to refetch after a mutation — invalidate the query key instead.
- Hardcoding `http://localhost:3001` instead of `process.env.NEXT_PUBLIC_API_URL` (already wired in `src/lib/api.ts`).
- Mirroring server data into Zustand. The TanStack Query cache *is* the server state.
