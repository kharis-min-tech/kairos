import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

let authState: { user: { homeBranchId?: string } | null; activeRole: string | null } = {
  user: { homeBranchId: 'b-1' },
  activeRole: 'pastor',
};
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranch: () => ({ data: null, isLoading: true }),
  useBranchLeadership: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [], meta: { total: 0 } } }),
}));

import MyBranchPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('MyBranchPage — pastor-or-admin route guard', () => {
  it.skip('TODO Phase 5: allows pastor (no redirect)', async () => {
    authState = { user: { homeBranchId: 'b-1' }, activeRole: 'pastor' };
    replace.mockClear();
    render(<MyBranchPage />, { wrapper });
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
  });

  it('allows admin (no redirect — they may inspect any branch)', async () => {
    authState = { user: { homeBranchId: 'b-1' }, activeRole: 'admin' };
    replace.mockClear();
    render(<MyBranchPage />, { wrapper });
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects leader to /', async () => {
    authState = { user: { homeBranchId: 'b-1' }, activeRole: 'leader' };
    replace.mockClear();
    render(<MyBranchPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('redirects member to /', async () => {
    authState = { user: { homeBranchId: 'b-1' }, activeRole: 'member' };
    replace.mockClear();
    render(<MyBranchPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });
});
