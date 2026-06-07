import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { MemberWithBranch } from '@kairos/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
  it('admin sees Add Member, Import CSV, Export CSV, Safeguarding, Approval Queue', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' }, activeRole: 'admin' };
    render(<MembersPage />, { wrapper });
    expect(screen.getByText(/Add Member/i)).toBeDefined();
    expect(screen.getByText(/Import CSV/i)).toBeDefined();
    expect(screen.getByText(/Export CSV/i)).toBeDefined();
    expect(screen.getByText(/Safeguarding review/i)).toBeDefined();
    expect(screen.getByText(/Approval Queue/i)).toBeDefined();
  });

  it('pastor sees Add/Import/Export and Safeguarding but NOT Approval Queue', () => {
    authState = { user: { id: 'p-1', systemRole: 'pastor', homeBranchId: 'b-1' }, activeRole: 'pastor' };
    render(<MembersPage />, { wrapper });
    expect(screen.getByText(/Add Member/i)).toBeDefined();
    expect(screen.getByText(/Import CSV/i)).toBeDefined();
    expect(screen.getByText(/Export CSV/i)).toBeDefined();
    expect(screen.getByText(/Safeguarding review/i)).toBeDefined();
    expect(screen.queryByText(/Approval Queue/i)).toBeNull();
  });

  it('leader sees only Safeguarding review (no add/import/export/approval)', () => {
    authState = { user: { id: 'l-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'leader' };
    render(<MembersPage />, { wrapper });
    expect(screen.queryByText(/Add Member/i)).toBeNull();
    expect(screen.queryByText(/Import CSV/i)).toBeNull();
    expect(screen.queryByText(/Export CSV/i)).toBeNull();
    expect(screen.queryByText(/Approval Queue/i)).toBeNull();
    expect(screen.getByText(/Safeguarding review/i)).toBeDefined();
  });

  it('member sees no management CTAs', () => {
    authState = { user: { id: 'self-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<MembersPage />, { wrapper });
    expect(screen.queryByText(/Add Member/i)).toBeNull();
    expect(screen.queryByText(/Import CSV/i)).toBeNull();
    expect(screen.queryByText(/Export CSV/i)).toBeNull();
    expect(screen.queryByText(/Approval Queue/i)).toBeNull();
    expect(screen.queryByText(/Safeguarding review/i)).toBeNull();
  });
});

describe('MembersPage — member-persona redaction', () => {
  it('redacts other-member email, phone, role and Deactivate button for members', () => {
    authState = { user: { id: 'self-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<MembersPage />, { wrapper });
    // Self card shows nothing extra anyway (no management) but other person's email/phone hidden
    expect(screen.queryByText('other@b.com')).toBeNull();
    expect(screen.queryByText('555-0102')).toBeNull();
    expect(screen.queryAllByText(/Deactivate/i)).toHaveLength(0);
  });

  it('shows full details for non-member viewers', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' }, activeRole: 'admin' };
    render(<MembersPage />, { wrapper });
    expect(screen.getByText('other@b.com')).toBeDefined();
    expect(screen.getByText('555-0102')).toBeDefined();
  });
});
