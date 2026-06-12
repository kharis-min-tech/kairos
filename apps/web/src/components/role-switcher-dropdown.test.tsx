import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { RoleSwitcherDropdown } from './role-switcher-dropdown';
import { useAuthStore } from '@/lib/auth-store';
import type { RoleOption } from '@kairos/types';

const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      switchRole: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api';

const roles: RoleOption[] = [
  { activeRole: 'admin', displayLabel: 'System Admin', key: 'k-admin' },
  {
    activeRole: 'leader',
    scope: { kind: 'fellowship', id: 'f-1' },
    displayLabel: 'Fellowship Lead — Joy',
    key: 'k-lead-f1',
  },
  {
    activeRole: 'leader',
    scope: { kind: 'department', id: 'd-1' },
    displayLabel: 'Dept Lead — Ushering',
    key: 'k-dept-1',
  },
  { activeRole: 'member', displayLabel: 'Member', key: 'k-mem' },
];

/** Mint a JWT-shaped token whose payload carries a `scope` claim, so
 *  persistAuthSuccess (called on a successful switch) can decode it
 *  into the store and the next render re-renders against the new role. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  refreshMock.mockClear();
  useAuthStore.setState({
    accessToken: 'at-current',
    refreshToken: 'rt-current',
    user: null,
    activeRole: 'admin',
    scope: null,
    availableRoles: roles,
    mustChangePassword: false,
    branchSystemAdminBranchIds: [],
    branchDataAdminBranchIds: [],
  });
});

describe('RoleSwitcherDropdown', () => {
  it('renders plain label (no chevron, no button) when availableRoles.length <= 1', () => {
    useAuthStore.setState({
      availableRoles: [{ activeRole: 'member', displayLabel: 'Member', key: 'k-mem' }],
      activeRole: 'member',
    });

    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch role/i })).not.toBeInTheDocument();
  });

  it('falls back to a friendly default label when no RoleOption matches and the list is empty', () => {
    useAuthStore.setState({ availableRoles: [], activeRole: 'pastor' });

    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    expect(screen.getByText('Pastor')).toBeInTheDocument();
  });

  it('renders the dropdown trigger and shows the matching displayLabel for the current activeRole+scope', () => {
    useAuthStore.setState({
      activeRole: 'leader',
      scope: { kind: 'fellowship', id: 'f-1' },
    });

    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    const trigger = screen.getByRole('button', { name: /switch role/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Fellowship Lead — Joy');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('opens the menu on click and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    const trigger = screen.getByRole('button', { name: /switch role/i });
    await user.click(trigger);

    expect(screen.getByRole('menu', { name: /switch role/i })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitem')).toHaveLength(roles.length);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks the current role with aria-current="true"', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      activeRole: 'leader',
      scope: { kind: 'department', id: 'd-1' },
    });

    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /switch role/i }));

    const items = screen.getAllByRole('menuitem');
    const current = items.find((el) => el.getAttribute('aria-current') === 'true');
    expect(current).toBeTruthy();
    expect(current).toHaveTextContent('Dept Lead — Ushering');
  });

  it('calls api.auth.switchRole with the picked option, persists, and runs router.refresh()', async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.switchRole).mockResolvedValue({
      data: {
        tokens: {
          accessToken: fakeJwt({
            memberId: 'm-1',
            activeRole: 'leader',
            scope: { kind: 'fellowship', id: 'f-1' },
          }),
          refreshToken: 'rt-new',
        },
        member: {
          id: 'm-1',
          firstName: 'Jane',
          lastName: 'Doe',
          systemRole: 'member',
          mustChangePassword: false,
        } as never,
      },
    } as never);

    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /switch role/i }));
    await user.click(screen.getByRole('menuitem', { name: /Fellowship Lead — Joy/ }));

    await waitFor(() => {
      expect(api.auth.switchRole).toHaveBeenCalledWith({
        activeRole: 'leader',
        scope: { kind: 'fellowship', id: 'f-1' },
        key: 'k-lead-f1',
      });
    });

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.activeRole).toBe('leader');
      expect(state.scope).toEqual({ kind: 'fellowship', id: 'f-1' });
      expect(state.refreshToken).toBe('rt-new');
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    // Menu closes after success.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('keeps prior auth state and shows an inline error when the switch fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.switchRole).mockRejectedValue(new Error('Role selection is invalid'));

    const before = useAuthStore.getState();

    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /switch role/i }));
    await user.click(screen.getByRole('menuitem', { name: /Fellowship Lead — Joy/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Role selection is invalid');
    });

    const after = useAuthStore.getState();
    expect(after.activeRole).toBe(before.activeRole);
    expect(after.scope).toBe(before.scope);
    expect(after.accessToken).toBe(before.accessToken);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('opens via keyboard (Enter) and lets ArrowDown move focus to the next item', async () => {
    const user = userEvent.setup();
    render(<RoleSwitcherDropdown />, { wrapper: createWrapper() });

    const trigger = screen.getByRole('button', { name: /switch role/i });
    trigger.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Open seeds focus on the current option (System Admin, idx 0). One
    // ArrowDown moves to the second option.
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(document.activeElement).toHaveTextContent('Fellowship Lead — Joy');
    });
  });
});
