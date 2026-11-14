import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let authState: Record<string, unknown> = {};
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: typeof authState) => unknown) => (selector ? selector(authState) : authState),
    {
      getState: () => authState,
      persist: {
        hasHydrated: () => true,
        onFinishHydration: () => () => {},
      },
    },
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined }),
  useQueryClient: () => ({ clear: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: { members: { me: vi.fn() } },
}));
vi.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => <div /> }));
vi.mock('@/components/member-avatar', () => ({ MemberAvatar: () => <div /> }));
vi.mock('@/components/consent-banner', () => ({ ConsentBanner: () => <div /> }));

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

/**
 * Nav clusters are collapsed by default (2026-10-04), and only the cluster
 * holding the current route opens itself. These tests mock the pathname as
 * /dashboard — which is ungrouped — so a section has to be opened before its
 * links are in the DOM. Opening it is setup, not the thing under test: what's
 * asserted is still which links a given role may see.
 */
function openSection(label: string) {
  // The layout renders the sidebar twice — desktop rail and mobile drawer —
  // from one piece of state, so toggling either opens both.
  fireEvent.click(screen.getAllByRole('button', { name: label })[0]!);
}

describe('Dashboard nav — Attendance gating', () => {
  // Phase-1 attendance rebuild: write access is gated by Admin-dept membership at the page
  // level (via canRecord), so /attendance is now open to all roles in the sidebar — including
  // members, since Admin-dept members are systemRole='member' and need to reach the desk.
  // Members ALSO get a "My Attendance" entry for their personal view.

  it('shows Attendance to plain members (page-level canRecord gates the CTAs)', () => {
    authState = makeState('member');
    render(<DashboardLayout>{null}</DashboardLayout>);
    openSection('Gatherings');
    expect(screen.getAllByRole('link', { name: /^Attendance$/ }).length).toBeGreaterThan(0);
  });

  it('shows My Attendance to plain members (personal view)', () => {
    authState = makeState('member');
    render(<DashboardLayout>{null}</DashboardLayout>);
    openSection('For you');
    expect(screen.getAllByRole('link', { name: /My Attendance/ }).length).toBeGreaterThan(0);
  });

  it('shows Attendance to leaders', () => {
    authState = makeState('leader');
    render(<DashboardLayout>{null}</DashboardLayout>);
    openSection('Gatherings');
    expect(screen.getAllByRole('link', { name: /^Attendance$/ }).length).toBeGreaterThan(0);
  });

  it('shows Attendance to admins', () => {
    authState = makeState('admin');
    render(<DashboardLayout>{null}</DashboardLayout>);
    openSection('Gatherings');
    expect(screen.getAllByRole('link', { name: /^Attendance$/ }).length).toBeGreaterThan(0);
  });
});
