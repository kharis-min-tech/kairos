import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
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

const setFilters = vi.fn();
vi.mock('@/stores/souls-store', () => ({
  useSoulsStore: () => ({
    souls: [],
    filters: {},
    loading: false,
    fetchSouls: vi.fn(),
    updateSoulStatus: vi.fn(),
    setFilters,
    updateSoulOptimistic: vi.fn(),
  }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApi: () => ({
    members: { list: vi.fn().mockResolvedValue({ success: true, data: { data: [] } }) },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [{ id: 'b-1', branchName: 'Brixton' }] }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: [{ id: 'f-1', fellowshipName: 'K-Group A' }] } }),
}));

vi.mock('@/hooks/use-departments', () => ({
  useDepartments: () => ({ data: { data: [{ id: 'd-1', departmentName: 'Worship', branchName: 'Brixton' }] } }),
}));

import SoulsKanbanPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  setFilters.mockClear();
});

describe('SoulsKanbanPage — persona filters', () => {
  it('member sees NO persona filters (their existing program/source filter handles it)', () => {
    authState = { user: { id: 'm-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<SoulsKanbanPage />, { wrapper });
    expect(screen.queryByText(/All Fellowships/i)).toBeNull();
    expect(screen.queryByText(/All Departments/i)).toBeNull();
    expect(screen.queryByText(/My Fellowships/i)).toBeNull();
    expect(screen.queryByText(/All Branches/i)).toBeNull();
  });
});
