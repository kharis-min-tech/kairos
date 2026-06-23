import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

let authState: {
  user: { id: string; systemRole: string; homeBranchId?: string } | null;
  activeRole: string | null;
} = {
  user: { id: 'admin-1', systemRole: 'admin' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

vi.mock('@/hooks/use-departments', () => ({
  useCreateDepartment: () => ({ mutateAsync: vi.fn(), error: null }),
  useGlobalDepartments: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] } }),
}));

import NewDepartmentPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replace.mockClear();
});

describe('NewDepartmentPage — route guard', () => {
  it('admin sees the form', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<NewDepartmentPage />, { wrapper });
    expect(screen.getByRole('heading', { name: 'New Department' })).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });
  it('member is redirected to /departments', async () => {
    authState = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    render(<NewDepartmentPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/departments'));
  });
});
