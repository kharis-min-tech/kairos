# Web — Next.js Frontend

## Design System

- **Primary purple**: `hsl(262.1 83.3% 57.8%)` — all design tokens use the purple palette
- **Components**: Shadcn/ui — import from `@/components/ui/*`
- **Icons**: Lucide React
- **Typography**: Inter font (loaded in root layout)
- **Styling**: Tailwind CSS with `cn()` from `@/lib/utils` for class merging

## Component Pattern

```tsx
import { cn } from '@/lib/utils';

interface Props {
  // typed props
}

export function ComponentName({ prop }: Props) {
  return (
    <div className={cn('base-classes', conditionalClass && 'active-class')}>
      {/* content */}
    </div>
  );
}
```

## Data Fetching — TanStack Query

All API data flows through hooks in `src/hooks/`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@kairos/api-client';

// Query key factory (one per domain)
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: object) => [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
};

// Read hook
export function useMembers(filters) {
  return useQuery({
    queryKey: memberKeys.list(filters),
    queryFn: () => api.members.list(filters),
  });
}

// Mutation hook
export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.members.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.lists() }),
  });
}
```

## State Management

- **Server state**: TanStack Query (all API data)
- **Client state**: Zustand (UI state only — modals, sidebar, filters)
- **Forms**: react-hook-form + zod resolvers

## Providers

Root layout wraps `<Providers>` which includes:
- `QueryClientProvider` (TanStack Query)
- `AuthProvider` (Cognito auth context)
- `NotificationProvider` (WebSocket push)
- `Toaster` (Shadcn toast notifications)

## Navigation

- Use `<Link>` from `next/link` — NEVER `<a>` for internal routes
- Use `useRouter()` only for programmatic navigation after mutations

## Figma Integration

When implementing designs from Figma, use the Figma MCP server (`com.figma.mcp`):
1. `get_design_context` to extract component structure
2. Map Figma components to existing Shadcn/ui primitives
3. Use existing design tokens — do not introduce new color values

## Testing

- Test file: co-located at `src/**/__tests__/*.test.tsx` or alongside component
- Vitest config: `happy-dom` environment, `@` path alias
- Setup: `@testing-library/jest-dom/vitest` for DOM matchers
- Use `@testing-library/react` for render/screen/fireEvent
- Mock API hooks — not the fetch layer
