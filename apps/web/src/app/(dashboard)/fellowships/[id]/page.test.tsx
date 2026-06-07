import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'fellowship-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Recharts ESM imports break the test environment — stub everything we use.
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

let auth: { user: { id: string; systemRole: string }; activeRole: string } = {
  user: { id: 'admin-1', systemRole: 'admin' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof auth) => T) => (selector ? selector(auth) : (auth as unknown as T)),
}));

const baseFellowship = {
  id: 'fellowship-1',
  fellowshipName: 'Brixton K-Group A',
  branchId: 'b-1',
  branchName: 'Brixton',
  fellowshipType: 'K_GROUPS',
  description: 'A small group meeting in Brixton.',
  leaderId: null,
  coLeaderId: null,
  meetingSchedule: 'Every week on Monday at 7:00 PM',
  isActive: true,
};

let members: { memberId: string; memberFirstName: string; memberLastName: string; memberPhotoUrl: string | null; isActive: boolean }[] = [];
let joinRequests: { id: string; memberId: string; status: string }[] = [];

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowship: () => ({ data: baseFellowship, isLoading: false, error: null }),
  useFellowshipMembers: () => ({ data: members }),
  useFellowshipMeetings: () => ({ data: [] }),
  useRemoveFellowshipMember: () => ({ mutate: vi.fn() }),
  useAddFellowshipMember: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFellowship: () => ({ mutate: vi.fn(), isPending: false }),
  useAttendanceSummary: () => ({ data: [] }),
  useCreateMeeting: () => ({ mutate: vi.fn() }),
  useRecordAttendance: () => ({ mutate: vi.fn(), isPending: false }),
  useFellowshipJoinRequests: () => ({ data: joinRequests }),
  useCreateJoinRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useReviewJoinRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] }, isLoading: false }),
}));

import FellowshipDetailPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  members = [];
  joinRequests = [];
  auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
});

describe('FellowshipDetailPage — persona CTAs', () => {
  it('admin sees Edit and Deactivate', () => {
    auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<FellowshipDetailPage />, { wrapper });
    expect(screen.getByRole('link', { name: 'Edit' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Deactivate/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Request to Join/i })).toBeNull();
  });

  it('pastor sees Edit and Deactivate', () => {
    auth = { user: { id: 'p-1', systemRole: 'member' }, activeRole: 'pastor' };
    render(<FellowshipDetailPage />, { wrapper });
    expect(screen.getByRole('link', { name: 'Edit' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Deactivate/i })).toBeDefined();
  });

  it('non-member sees Request to Join (no Edit/Deactivate)', () => {
    auth = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    render(<FellowshipDetailPage />, { wrapper });
    expect(screen.getByRole('button', { name: /Request to Join/i })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Deactivate/i })).toBeNull();
  });

  it('non-member with pending request sees "Request Pending" badge instead of CTA', () => {
    auth = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    joinRequests = [{ id: 'r-1', memberId: 'm-1', status: 'pending' }];
    render(<FellowshipDetailPage />, { wrapper });
    expect(screen.getByText(/Request Pending/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Request to Join/i })).toBeNull();
  });

  it('member-of-fellowship does NOT see Request to Join', () => {
    auth = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    members = [{ memberId: 'm-1', memberFirstName: 'Tim', memberLastName: 'Minor', memberPhotoUrl: null, isActive: true }];
    render(<FellowshipDetailPage />, { wrapper });
    expect(screen.queryByRole('button', { name: /Request to Join/i })).toBeNull();
  });

  it('detail tab is rendered as role=tab with aria-selected', () => {
    auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<FellowshipDetailPage />, { wrapper });
    const detailsTab = screen.getByRole('tab', { name: 'Details' });
    expect(detailsTab.getAttribute('aria-selected')).toBe('true');
  });
});
