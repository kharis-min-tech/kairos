import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

let activeRole: string | null = 'admin';
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: { activeRole: string | null }) => T) =>
    selector ? selector({ activeRole }) : ({ activeRole } as unknown as T),
}));

vi.mock('@/hooks/use-branches', () => ({
  useRegions: () => ({ data: [], isLoading: false }),
  useCreateRegion: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

import RegionsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('RegionsPage — admin route guard', () => {
  it('allows admin (no redirect)', async () => {
    activeRole = 'admin';
    replace.mockClear();
    render(<RegionsPage />, { wrapper });
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects non-admin to /', async () => {
    for (const role of ['pastor', 'leader', 'member']) {
      activeRole = role;
      replace.mockClear();
      render(<RegionsPage />, { wrapper });
      await Promise.resolve();
      expect(replace).toHaveBeenCalledWith('/');
    }
  });
});
