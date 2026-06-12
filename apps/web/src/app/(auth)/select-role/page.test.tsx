import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const finalizeMutateAsync = vi.fn();
vi.mock('@/hooks/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-auth')>('@/hooks/use-auth');
  return {
    ...actual,
    useFinalizeRole: () => ({ mutateAsync: finalizeMutateAsync, isPending: false }),
    persistAuthSuccess: vi.fn(),
  };
});

import SelectRolePage from './page';
import { useRoleSelectionStore } from '@/lib/role-selection-store';
import { persistAuthSuccess } from '@/hooks/use-auth';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockMember: Record<string, unknown> = {
  id: 'm-1',
  firstName: 'Sarah',
  lastName: 'Williams',
  email: 'sarah@example.com',
  systemRole: 'admin',
  mustChangePassword: false,
};

function seedStash() {
  useRoleSelectionStore.getState().setRoleSelection({
    sessionToken: 'sess-xyz',
    availableRoles: [
      { activeRole: 'admin', scope: { kind: 'branch', id: 'b-1' }, displayLabel: 'Branch System Admin — London', key: 'k-admin' },
      { activeRole: 'leader', scope: { kind: 'department', id: 'd-1' }, displayLabel: 'Admin Dept Lead — London', key: 'k-lead' },
      { activeRole: 'member', displayLabel: 'Member — London', key: 'k-mem' },
    ],
  });
}

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  finalizeMutateAsync.mockReset();
  vi.mocked(persistAuthSuccess).mockReset();
  useRoleSelectionStore.getState().clearRoleSelection();
});

describe('SelectRolePage — empty stash', () => {
  it('redirects to /login when no sessionToken is present', () => {
    render(<SelectRolePage />, { wrapper });
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('renders nothing when stash is empty (avoids flash)', () => {
    const { container } = render(<SelectRolePage />, { wrapper });
    expect(container.textContent).toBe('');
  });
});

describe('SelectRolePage — rendering', () => {
  it('renders one button per availableRoles entry with displayLabel', () => {
    seedStash();
    render(<SelectRolePage />, { wrapper });

    expect(screen.getByRole('button', { name: /Continue as Branch System Admin — London/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue as Admin Dept Lead — London/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue as Member — London/ })).toBeDefined();
  });

  it('shows the "Back to login" link', () => {
    seedStash();
    render(<SelectRolePage />, { wrapper });
    expect(screen.getByRole('link', { name: /Back to login/i })).toBeDefined();
  });
});

describe('SelectRolePage — finalize flow', () => {
  it('calls finalizeRole with sessionToken + activeRole + scope + key', async () => {
    seedStash();
    finalizeMutateAsync.mockResolvedValue({
      tokens: { accessToken: 'at2', refreshToken: 'rt2' },
      member: mockMember,
      isFirstLogin: false,
    });

    render(<SelectRolePage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Continue as Branch System Admin — London/ }));

    await vi.waitFor(() =>
      expect(finalizeMutateAsync).toHaveBeenCalledWith({
        sessionToken: 'sess-xyz',
        activeRole: 'admin',
        scope: { kind: 'branch', id: 'b-1' },
        key: 'k-admin',
      }),
    );
  });

  it('persists tokens with the picked activeRole and routes to /dashboard on success', async () => {
    seedStash();
    finalizeMutateAsync.mockResolvedValue({
      tokens: { accessToken: 'at2', refreshToken: 'rt2' },
      member: mockMember,
      isFirstLogin: false,
    });

    render(<SelectRolePage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Continue as Admin Dept Lead — London/ }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(persistAuthSuccess).toHaveBeenCalledWith({
      tokens: { accessToken: 'at2', refreshToken: 'rt2' },
      member: mockMember,
      activeRole: 'leader',
    });
    // Stash is cleared after successful finalize.
    expect(useRoleSelectionStore.getState().sessionToken).toBeNull();
  });

  it('routes to /welcome on first login', async () => {
    seedStash();
    finalizeMutateAsync.mockResolvedValue({
      tokens: { accessToken: 'at2', refreshToken: 'rt2' },
      member: mockMember,
      isFirstLogin: true,
    });

    render(<SelectRolePage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Continue as Member — London/ }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/welcome'));
  });

  it('routes to /change-password when mustChangePassword is true', async () => {
    seedStash();
    finalizeMutateAsync.mockResolvedValue({
      tokens: { accessToken: 'at2', refreshToken: 'rt2' },
      member: { ...mockMember, mustChangePassword: true },
      isFirstLogin: false,
    });

    render(<SelectRolePage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Continue as Member — London/ }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/change-password'));
  });
});

describe('SelectRolePage — error path', () => {
  it('shows the error message when finalize rejects (e.g. expired session)', async () => {
    seedStash();
    finalizeMutateAsync.mockRejectedValue(new Error('Session token expired'));

    render(<SelectRolePage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Continue as Branch System Admin — London/ }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Session token expired');
    expect(push).not.toHaveBeenCalled();
    // Stash stays in place so the user can try a different role without
    // bouncing back through /login.
    expect(useRoleSelectionStore.getState().sessionToken).toBe('sess-xyz');
  });

  it('keeps the back-to-login link available and clears the stash when clicked', async () => {
    seedStash();
    render(<SelectRolePage />, { wrapper });
    await userEvent.click(screen.getByRole('link', { name: /Back to login/i }));
    expect(useRoleSelectionStore.getState().sessionToken).toBeNull();
  });
});
