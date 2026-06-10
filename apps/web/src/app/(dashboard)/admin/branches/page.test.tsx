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
  useBranches: () => ({ data: [], isLoading: false, error: null }),
  useRegions: () => ({ data: [] }),
  useDeleteBranch: () => ({ mutate: vi.fn(), isPending: false }),
}));

import BranchesPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('BranchesPage — admin route guard', () => {
  it('allows admin (no redirect)', async () => {
    activeRole = 'admin';
    replace.mockClear();
    render(<BranchesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects pastor to /', async () => {
    activeRole = 'pastor';
    replace.mockClear();
    render(<BranchesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('redirects leader to /', async () => {
    activeRole = 'leader';
    replace.mockClear();
    render(<BranchesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('redirects member to /', async () => {
    activeRole = 'member';
    replace.mockClear();
    render(<BranchesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });
});
