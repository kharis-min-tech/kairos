import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const push = vi.fn();
const replace = vi.fn();
const mutateAsync = vi.fn();
const persistAuthSuccess = vi.fn();
let searchParamsString = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

vi.mock('@/hooks/use-auth', () => ({
  useLogin: () => ({ mutateAsync, isPending: false }),
  persistAuthSuccess: (args: unknown) => persistAuthSuccess(args),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ accessToken: null }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      oauth: {
        startUrl: (provider: string, returnTo?: string) =>
          `https://api.test/api/auth/oauth/${provider}/start${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
      },
    },
  },
}));

import LoginPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const originalLocation = window.location;

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  mutateAsync.mockReset();
  persistAuthSuccess.mockReset();
  searchParamsString = '';
  const assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, assign },
  });
});

const mockMember: Record<string, unknown> = {
  id: 'm-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  systemRole: 'member',
  mustChangePassword: false,
};

// ── Security regression ────────────────────────────────────

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

  it('renders email + password fields and a sign-in button', async () => {
    render(<LoginPage />, { wrapper });
    await waitFor(() => expect(screen.getByLabelText(/Email Address/i)).toBeDefined());
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeDefined();
  });
});

// ── Single-role login flow ─────────────────────────────────

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

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
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

    await waitFor(() => expect(push).toHaveBeenCalledWith('/welcome'));
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

    await waitFor(() => expect(push).toHaveBeenCalledWith('/change-password'));
  });
});

// ── Error display ──────────────────────────────────────────

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

// ── Preserved behavior ─────────────────────────────────────

describe('LoginPage — preserved behavior', () => {
  it('toggles password visibility via labelled button', async () => {
    render(<LoginPage />, { wrapper });
    const toggle = await screen.findByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();
  });
});

// ── OAuth SSO buttons (Phase 1 Better-Auth) ────────────────

describe('LoginPage — OAuth', () => {
  it('renders three SSO buttons for Google, Microsoft, and Apple', async () => {
    render(<LoginPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeDefined();
  });

  it('navigates to the API OAuth start URL when a provider button is clicked', async () => {
    render(<LoginPage />, { wrapper });
    const googleButton = await screen.findByRole('button', { name: /sign in with google/i });
    fireEvent.click(googleButton);
    expect(window.location.assign).toHaveBeenCalledWith(
      'https://api.test/api/auth/oauth/google/start?returnTo=%2Fdashboard',
    );

    const msButton = screen.getByRole('button', { name: /sign in with microsoft/i });
    fireEvent.click(msButton);
    expect(window.location.assign).toHaveBeenCalledWith(
      'https://api.test/api/auth/oauth/microsoft/start?returnTo=%2Fdashboard',
    );
  });

  it('renders the friendly error banner when ?oauth_error=state_mismatch is present', async () => {
    searchParamsString = 'oauth_error=state_mismatch';
    render(<LoginPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/session expired/i);
    });
  });

  it('falls back to the generic provider_error copy for an unknown slug', async () => {
    searchParamsString = 'oauth_error=totally_unknown';
    render(<LoginPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/provider returned an error/i);
    });
  });
});
