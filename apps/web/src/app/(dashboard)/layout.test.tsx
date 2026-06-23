import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let authState: Record<string, unknown> = {};
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: typeof authState) => unknown) => (selector ? selector(authState) : authState),
    { getState: () => authState },
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined }),
}));

vi.mock('@/lib/api', () => ({
  api: { members: { me: vi.fn() }, auth: { availableRoles: vi.fn() } },
}));
vi.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => <div /> }));
vi.mock('@/components/member-avatar', () => ({ MemberAvatar: () => <div /> }));

import DashboardLayout from './layout';

function makeState(role: string) {
  return {
    user: { firstName: 'Test', lastName: 'User' },
    logout: vi.fn(),
    activeRole: role,
    mustChangePassword: false,
    setUser: vi.fn(),
    accessToken: 'tok',
    availableRoles: [],
    setAvailableRoles: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard nav — Attendance gating', () => {
  // Phase-1 attendance rebuild: write access is gated by Admin-dept membership at the page
  // level (via canRecord), so /attendance is now open to all roles in the sidebar — including
  // members, since Admin-dept members are systemRole='member' and need to reach the desk.
  // Members ALSO get a "My Attendance" entry for their personal view.

  it('shows Attendance to plain members (page-level canRecord gates the CTAs)', () => {
    authState = makeState('member');
    render(<DashboardLayout>{null}</DashboardLayout>);
    expect(screen.getAllByRole('link', { name: /^Attendance$/ }).length).toBeGreaterThan(0);
  });

  it('shows My Attendance to plain members (personal view)', () => {
    authState = makeState('member');
    render(<DashboardLayout>{null}</DashboardLayout>);
    expect(screen.getAllByRole('link', { name: /My Attendance/ }).length).toBeGreaterThan(0);
  });

  it('shows Attendance to leaders', () => {
    authState = makeState('leader');
    render(<DashboardLayout>{null}</DashboardLayout>);
    expect(screen.getAllByRole('link', { name: /^Attendance$/ }).length).toBeGreaterThan(0);
  });

  it('shows Attendance to admins', () => {
    authState = makeState('admin');
    render(<DashboardLayout>{null}</DashboardLayout>);
    expect(screen.getAllByRole('link', { name: /^Attendance$/ }).length).toBeGreaterThan(0);
  });
});
