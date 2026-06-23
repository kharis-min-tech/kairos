import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as UseAuthModule from '@/hooks/use-auth';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const mutateAsync = vi.fn();
vi.mock('@/hooks/use-auth', async () => {
  const actual = await vi.importActual<typeof UseAuthModule>('@/hooks/use-auth');
  return {
    ...actual,
    useLogin: () => ({ mutateAsync, isPending: false }),
    persistAuthSuccess: vi.fn(),
  };
});

import LoginPage from './page';
import { persistAuthSuccess } from '@/hooks/use-auth';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  vi.mocked(persistAuthSuccess).mockReset();
});

const mockMember: Record<string, unknown> = {
  id: 'm-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  systemRole: 'member',
  mustChangePassword: false,
};

describe('LoginPage — security regression', () => {
  it('does NOT render role tabs before credentials are supplied', () => {
    render(<LoginPage />, { wrapper });
    // Phase 2: the 4-tab role strip is gone (leaked permission tiers).
    expect(screen.queryByRole('tab', { name: 'Member' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Leader' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Pastor' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Admin' })).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('renders email + password fields and a sign-in button', () => {
    render(<LoginPage />, { wrapper });
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeDefined();
  });
});

describe('LoginPage — single-role flow', () => {
  it('persists and routes to /dashboard on plain success', async () => {
    mutateAsync.mockResolvedValue({
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      member: mockMember,
      isFirstLogin: false,
    });

    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByLabelText(/Email Address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(mutateAsync).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'pass123' });
    expect(persistAuthSuccess).toHaveBeenCalledWith({
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      member: mockMember,
      activeRole: 'member',
    });
  });

  it('routes to /welcome on first login', async () => {
    mutateAsync.mockResolvedValue({
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      member: mockMember,
      isFirstLogin: true,
    });

    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByLabelText(/Email Address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/welcome'));
  });

  it('routes to /change-password when mustChangePassword is true', async () => {
    mutateAsync.mockResolvedValue({
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      member: { ...mockMember, mustChangePassword: true },
      isFirstLogin: false,
    });

    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByLabelText(/Email Address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/change-password'));
  });
});

// RBAC Phase 5a: the multi-role flow is removed. Login always returns
// tokens directly; capabilities derive from grants on the access token.

describe('LoginPage — error display', () => {
  it('shows the API error message in the alert region', async () => {
    mutateAsync.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByLabelText(/Email Address/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Invalid credentials');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('LoginPage — preserved behavior', () => {
  it('toggles password visibility via labelled button', async () => {
    render(<LoginPage />, { wrapper });
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();
  });

  it('disables OAuth buttons with "coming soon" labels', () => {
    render(<LoginPage />, { wrapper });
    const google = screen.getByRole('button', { name: /Google.*coming soon/i });
    const apple = screen.getByRole('button', { name: /Apple ID.*coming soon/i });
    expect(google).toBeDisabled();
    expect(apple).toBeDisabled();
  });

  // The stale-stash clearing test was removed in Phase 5a — the role-
  // selection store no longer exists.
});
