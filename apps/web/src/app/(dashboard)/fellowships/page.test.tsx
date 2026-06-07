import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// next/dynamic for FellowshipMap — return a no-op component
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

let authState: {
  user: { id: string; systemRole: string; homeBranchId?: string } | null;
  activeRole: string | null;
} = {
  user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({
    data: { data: [], meta: { total: 0, page: 1, totalPages: 1, limit: 20 } },
    isLoading: false,
    error: null,
  }),
  useDeleteFellowship: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMyProfile: () => ({ data: null }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [] }),
}));

import FellowshipsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {});

describe('FellowshipsPage — persona CTAs', () => {
  it('admin sees + New Fellowship and the branch filter', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' }, activeRole: 'admin' };
    render(<FellowshipsPage />, { wrapper });
    expect(screen.getByText(/\+ New Fellowship/i)).toBeDefined();
    expect(screen.getByText(/All Branches/i)).toBeDefined();
  });

  it('pastor sees + New Fellowship but no branch filter', () => {
    authState = { user: { id: 'p-1', systemRole: 'pastor', homeBranchId: 'b-1' }, activeRole: 'pastor' };
    render(<FellowshipsPage />, { wrapper });
    expect(screen.getByText(/\+ New Fellowship/i)).toBeDefined();
    expect(screen.queryByText(/All Branches/i)).toBeNull();
  });

  it('leader does NOT see + New Fellowship', () => {
    authState = { user: { id: 'l-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'leader' };
    render(<FellowshipsPage />, { wrapper });
    expect(screen.queryByText(/\+ New Fellowship/i)).toBeNull();
  });

  it('member does NOT see + New Fellowship', () => {
    authState = { user: { id: 'm-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<FellowshipsPage />, { wrapper });
    expect(screen.queryByText(/\+ New Fellowship/i)).toBeNull();
  });
});
