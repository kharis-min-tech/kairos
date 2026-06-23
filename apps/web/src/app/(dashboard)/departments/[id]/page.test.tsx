import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'dept-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

let auth: { user: { id: string; systemRole: string }; activeRole: string } = {
  user: { id: 'admin-1', systemRole: 'admin' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof auth) => T) => (selector ? selector(auth) : (auth as unknown as T)),
}));

const baseDept = {
  id: 'dept-1',
  branchId: 'b-1',
  branchName: 'Brixton',
  departmentId: 'd-1',
  departmentName: 'Worship',
  iconKey: null,
  leadMemberId: 'lead-1',
  leadFirstName: 'Lex',
  leadLastName: 'Lead',
  leadPhotoUrl: null,
  deputyMemberId: null,
  description: 'Singers + musicians',
  startDate: null,
  endDate: null,
  isActive: true,
  probationDays: 30,
  memberCount: 5,
  pendingJoinRequestCount: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

let members: { memberId: string; memberFirstName: string; memberLastName: string; memberPhotoUrl: string | null; isActive: boolean; joinDate: string; id: string }[] = [];
let joinRequests: { id: string; memberId: string; status: string }[] = [];

vi.mock('@/hooks/use-departments', () => ({
  useDepartment: () => ({ data: baseDept, isLoading: false, error: null }),
  useDepartmentMembers: () => ({ data: members }),
  useDepartmentJoinRequests: () => ({ data: joinRequests }),
  useAddDepartmentMember: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveDepartmentMember: () => ({ mutate: vi.fn() }),
  useCreateDepartmentJoinRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useRespondToDepartmentOffer: () => ({ mutate: vi.fn(), isPending: false }),
  useWithdrawDepartmentJoinRequest: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] } }),
}));

// Tabs that pull in extra hooks — stub them.
vi.mock('./_components/followups-tab', () => ({ FollowupsTab: () => null }));
vi.mock('./_components/uniform-tab', () => ({ UniformTab: () => null }));
vi.mock('./_components/rota-tab', () => ({ RotaTab: () => null }));
vi.mock('./_components/recruitment-tab', () => ({ RecruitmentTab: () => null }));
vi.mock('./_components/my-rota-tab', () => ({ MyRotaTab: () => null }));

import DepartmentDetailPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  members = [];
  joinRequests = [];
  auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
});

describe('DepartmentDetailPage — persona CTAs', () => {
  it('admin sees the Members tab (no Request to Join CTA)', () => {
    auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<DepartmentDetailPage />, { wrapper });
    expect(screen.getByRole('tab', { name: /Members/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Request to Join/i })).toBeNull();
  });
  it('non-member sees Request to Join + no privileged tabs', () => {
    auth = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    render(<DepartmentDetailPage />, { wrapper });
    expect(screen.getByRole('button', { name: /Request to Join/i })).toBeDefined();
    expect(screen.queryByRole('tab', { name: /Members/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Followups/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Rota/i })).toBeNull();
  });

  it('member-of-department sees the My Rota tab and NO Request to Join', () => {
    auth = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    members = [{ id: 'dm-1', memberId: 'm-1', memberFirstName: 'Me', memberLastName: 'Self', memberPhotoUrl: null, isActive: true, joinDate: '2026-01-01' }];
    render(<DepartmentDetailPage />, { wrapper });
    expect(screen.getByRole('tab', { name: 'My Rota' })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Request to Join/i })).toBeNull();
  });

  it('overview tab is rendered as role=tab with aria-selected', () => {
    auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<DepartmentDetailPage />, { wrapper });
    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');
  });
});
