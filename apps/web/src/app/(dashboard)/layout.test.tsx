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

vi.mock('@/lib/api', () => ({ api: { members: { me: vi.fn() } } }));
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
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard nav — Attendance gating', () => {
  it('hides Attendance from plain members', () => {
    authState = makeState('member');
    render(<DashboardLayout>{null}</DashboardLayout>);
    expect(screen.queryByRole('link', { name: /Attendance/ })).not.toBeInTheDocument();
  });

  it('shows Attendance to leaders', () => {
    authState = makeState('leader');
    render(<DashboardLayout>{null}</DashboardLayout>);
    expect(screen.getAllByRole('link', { name: /Attendance/ }).length).toBeGreaterThan(0);
  });

  it('shows Attendance to admins', () => {
    authState = makeState('admin');
    render(<DashboardLayout>{null}</DashboardLayout>);
    expect(screen.getAllByRole('link', { name: /Attendance/ }).length).toBeGreaterThan(0);
  });
});
