import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const replace = vi.fn();
const decide = vi.fn();
let searchParamsString = '';
let accessToken: string | null = 'at';
let contextResult: { data?: unknown; isLoading?: boolean; isError?: boolean; error?: Error } = {};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ accessToken, user: { email: 'grace@kharis.org' }, logout: vi.fn() }),
}));

vi.mock('@/hooks/use-oauth-server', () => ({
  useAuthorizeContext: () => contextResult,
  useAuthorizeDecision: () => ({
    mutate: (vars: unknown, opts?: { onSuccess?: (r: unknown) => void }) => {
      decide(vars);
      opts?.onSuccess?.({ status: 'ok', redirectTo: 'https://analytics.example.org/cb?code=c1&state=s1' });
    },
    isPending: false,
  }),
}));

import OAuthAuthorizePage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const okContext = {
  status: 'ok',
  client: {
    name: 'Kharis Analytics',
    description: 'Dashboards for leadership',
    logoUrl: null,
    homepageUrl: null,
    privacyUrl: 'https://analytics.example.org/privacy',
    termsUrl: null,
    isTrusted: false,
  },
  scopes: [
    { scope: 'openid', description: 'Sign you in' },
    { scope: 'email', description: 'Your email address' },
  ],
  skipConsent: false,
  redirectHost: 'analytics.example.org',
};

const hrefAssign = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  replace.mockReset();
  decide.mockReset();
  hrefAssign.mockReset();
  accessToken = 'at';
  searchParamsString = 'client_id=kc_1&redirect_uri=https%3A%2F%2Fanalytics.example.org%2Fcb&scope=openid+email&state=s1&code_challenge=x&code_challenge_method=S256';
  contextResult = { data: okContext };
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, replace: hrefAssign },
  });
});

describe('OAuth consent page', () => {
  it('sends a signed-out visitor to sign in and then back to this exact request', () => {
    accessToken = null;
    render(<OAuthAuthorizePage />, { wrapper });
    expect(replace).toHaveBeenCalledWith(
      `/login?returnTo=${encodeURIComponent(`/oauth/authorize?${searchParamsString}`)}`,
    );
  });

  it('tells the member who is asking, what they will see, and where they will land', () => {
    render(<OAuthAuthorizePage />, { wrapper });
    expect(screen.getByRole('heading', { name: /Kharis Analytics wants to sign you in/i })).toBeDefined();
    expect(screen.getByText('Sign you in')).toBeDefined();
    expect(screen.getByText('Your email address')).toBeDefined();
    expect(screen.getByText('analytics.example.org')).toBeDefined();
    expect(screen.getByText('grace@kharis.org')).toBeDefined();
    expect(screen.getByRole('link', { name: /Privacy policy/i }).getAttribute('href')).toBe('https://analytics.example.org/privacy');
  });

  it('continues to the app with approve=true', async () => {
    render(<OAuthAuthorizePage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Continue to Kharis Analytics/i }));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ approve: true }));
    expect(hrefAssign).toHaveBeenCalledWith('https://analytics.example.org/cb?code=c1&state=s1');
  });

  it('declines with approve=false', async () => {
    render(<OAuthAuthorizePage />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ approve: false }));
  });

  it('goes straight through, once, when no screen is needed', async () => {
    contextResult = { data: { ...okContext, skipConsent: true } };
    render(<OAuthAuthorizePage />, { wrapper });
    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ approve: true }));
    expect(screen.queryByRole('button', { name: /Continue to/i })).toBeNull();
  });

  it('shows the problem — and never redirects — when the app itself is unverified', () => {
    contextResult = {
      data: { status: 'error', error: 'invalid_request', description: 'redirect_uri is not registered', redirectTo: null },
    };
    render(<OAuthAuthorizePage />, { wrapper });
    expect(screen.getByRole('alert').textContent).toMatch(/incomplete or invalid/i);
    expect(hrefAssign).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Continue to/i })).toBeNull();
  });

  it('reports a verified-but-bad request back to the app', async () => {
    contextResult = {
      data: { status: 'error', error: 'invalid_scope', description: 'nope', redirectTo: 'https://analytics.example.org/cb?error=invalid_scope' },
    };
    render(<OAuthAuthorizePage />, { wrapper });
    await waitFor(() => expect(hrefAssign).toHaveBeenCalledWith('https://analytics.example.org/cb?error=invalid_scope'));
  });

  it('says there is nothing to approve when opened without a request', () => {
    searchParamsString = '';
    contextResult = {};
    render(<OAuthAuthorizePage />, { wrapper });
    expect(screen.getByText(/Nothing to approve/i)).toBeDefined();
  });
});
