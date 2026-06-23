import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { MemberWithBranch } from '@kairos/types';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

let authState: { user: { id: string; systemRole: string; homeBranchId: string } | null; activeRole: string | null } = {
  user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

let members: MemberWithBranch[] = [];

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: members, meta: { total: members.length, page: 1, totalPages: 1, limit: 20 } }, isLoading: false, error: null }),
  useDeactivateMember: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [] }),
}));

vi.mock('@/lib/api', () => ({
  api: { members: { exportCsv: vi.fn() } },
}));

import MembersPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const baseMember = {
  branchName: 'Central',
  photoUrl: null,
  email: 'a@b.com',
  phone: null,
  isActive: true,
  approvalStatus: 'approved' as const,
};

beforeEach(() => {
  replace.mockClear();
  members = [
    {
      ...baseMember,
      id: 'self-1',
      firstName: 'You',
      lastName: 'Self',
      systemRole: 'member' as const,
    } as MemberWithBranch,
    {
      ...baseMember,
      id: 'other-1',
      firstName: 'Other',
      lastName: 'Person',
      systemRole: 'member' as const,
      email: 'other@b.com',
      phone: '555-0102',
    } as MemberWithBranch,
  ];
});

describe('MembersPage — persona CTAs', () => {
  it('member is redirected away (Members not in their nav)', async () => {
    authState = { user: { id: 'self-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<MembersPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });
});

