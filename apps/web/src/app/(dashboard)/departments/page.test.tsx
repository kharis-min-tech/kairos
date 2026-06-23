import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

vi.mock('@/hooks/use-departments', () => ({
  useDepartments: () => ({
    data: { data: [], meta: { total: 0, page: 1, totalPages: 1, limit: 20 } },
    isLoading: false,
    error: null,
  }),
  useDeactivateDepartment: () => ({ mutate: vi.fn(), isPending: false }),
  useGlobalDepartments: () => ({ data: [] }),
  useMyDepartments: () => ({ data: [] }),
  useMyDepartmentJoinRequests: () => ({ data: [] }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMyProfile: () => ({ data: null }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [] }),
}));

// MyDepartmentsView, MyOffersBanner, MyApplicationsList — keep them as no-ops
// so the test doesn't depend on their internals.
vi.mock('./_components/my-departments-view', () => ({
  MyDepartmentsView: () => null,
}));
vi.mock('./_components/my-offers-banner', () => ({
  MyOffersBanner: () => null,
}));
vi.mock('./_components/my-applications-list', () => ({
  MyApplicationsList: () => null,
}));

import DepartmentsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {});

describe('DepartmentsPage — persona CTAs', () => {
  it('admin sees + New Department', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' }, activeRole: 'admin' };
    render(<DepartmentsPage />, { wrapper });
    expect(screen.getByText(/\+ New Department/i)).toBeDefined();
  });
  it('member does NOT see + New Department', () => {
    authState = { user: { id: 'm-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<DepartmentsPage />, { wrapper });
    expect(screen.queryByText(/\+ New Department/i)).toBeNull();
  });
});
