import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mockReplace = vi.fn();
const mockPersist = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/hooks/use-auth', () => ({
  persistAuthSuccess: (args: unknown) => mockPersist(args),
}));

import OAuthCallbackPage from './page';
import { useMfaChallengeStore } from '@/stores/mfa-challenge-store';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const originalLocation = window.location;

function setHash(hash: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      hash,
      pathname: '/oauth-callback',
    },
  });
}

beforeEach(() => {
  mockReplace.mockReset();
  mockPersist.mockReset();
  vi.stubGlobal('fetch', vi.fn());
  // Reset sessionStorage between tests.
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OAuthCallbackPage', () => {
  it('parses tokens from the URL fragment, hydrates the store, and routes to returnTo', async () => {
    const member = {
      id: 'm-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      systemRole: 'member',
    };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: member }),
    });

    setHash(
      '#accessToken=access-abc&refreshToken=refresh-def&method=google&returnTo=%2Fdashboard',
    );

    render(<OAuthCallbackPage />, { wrapper });

    await waitFor(() => expect(mockPersist).toHaveBeenCalledTimes(1));
    expect(mockPersist).toHaveBeenCalledWith({
      tokens: { accessToken: 'access-abc', refreshToken: 'refresh-def' },
      member,
      activeRole: 'member',
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    expect(window.sessionStorage.getItem('kairos.oauth_toast')).toBe('google');
  });

  it('redirects to /login?oauth_error=provider_error when tokens are missing', async () => {
    setHash('#method=google');
    render(<OAuthCallbackPage />, { wrapper });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/login?oauth_error=provider_error'),
    );
    expect(mockPersist).not.toHaveBeenCalled();
  });
  // `returnTo` comes out of the URL fragment, so it is attacker-supplied. It
  // used to be handed straight to `router.replace`, which follows an absolute
  // URL off-site — an open redirect at the point the user has just been told
  // the app is trustworthy, which is what makes it worth a phish.
  describe('returnTo is constrained to this origin', () => {
    const member = {
      id: 'm-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      systemRole: 'member',
    };

    beforeEach(() => {
      (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: member }),
      });
    });

    it.each([
      ['an absolute https URL', 'https://evil.test/phish'],
      ['a protocol-relative URL', '//evil.test/phish'],
      ['a backslash variant', '/\\evil.test/phish'],
      ['a javascript: URL', 'javascript:alert(1)'],
      ['a bare host', 'evil.test'],
    ])('sends %s to /dashboard instead', async (_label, returnTo) => {
      setHash(
        `#accessToken=a&refreshToken=r&returnTo=${encodeURIComponent(returnTo)}`,
      );
      render(<OAuthCallbackPage />, { wrapper });

      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
      expect(mockReplace).not.toHaveBeenCalledWith(returnTo);
    });

    it.each([
      ['a plain path', '/members'],
      ['a path with a query', '/members?page=2'],
      ['a path with a hash', '/members#list'],
    ])('still honours %s', async (_label, returnTo) => {
      setHash(
        `#accessToken=a&refreshToken=r&returnTo=${encodeURIComponent(returnTo)}`,
      );
      render(<OAuthCallbackPage />, { wrapper });

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(returnTo));
    });

    it('defaults to /dashboard when returnTo is absent', async () => {
      setHash('#accessToken=a&refreshToken=r');
      render(<OAuthCallbackPage />, { wrapper });
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    });
  });
});

/**
 * A privileged member signing in with Google gets a fragment with no session
 * in it, only a pre-MFA token. Before this branch existed the page read that
 * as a failed handshake and sent them to /login?oauth_error=provider_error,
 * which no amount of retrying could get past.
 */
describe('OAuthCallbackPage - second factor outstanding', () => {
  beforeEach(() => useMfaChallengeStore.getState().clear());

  it('routes to /mfa instead of reporting a provider error', async () => {
    setHash('#mfaToken=pre-mfa&mfaStage=challenge&returnTo=%2Fmembers');
    render(<OAuthCallbackPage />, { wrapper });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/mfa'));
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('hands the token, stage and destination to the challenge store', async () => {
    setHash('#mfaToken=pre-mfa&mfaStage=enrolment&returnTo=%2Fmembers');
    render(<OAuthCallbackPage />, { wrapper });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/mfa'));
    const state = useMfaChallengeStore.getState();
    expect(state.token).toBe('pre-mfa');
    expect(state.stage).toBe('enrolment');
    expect(state.returnTo).toBe('/members');
  });

  it('treats an unrecognised stage as a challenge rather than forcing re-enrolment', async () => {
    setHash('#mfaToken=pre-mfa&mfaStage=nonsense');
    render(<OAuthCallbackPage />, { wrapper });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/mfa'));
    expect(useMfaChallengeStore.getState().stage).toBe('challenge');
  });

  /**
   * The API sends mfaToken='' when there is no challenge, so an empty value
   * must not be mistaken for one.
   */
  it('ignores an empty mfaToken and falls through to the normal path', async () => {
    setHash('#mfaToken=&mfaStage=challenge');
    render(<OAuthCallbackPage />, { wrapper });

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/login?oauth_error=provider_error'),
    );
    expect(useMfaChallengeStore.getState().token).toBeNull();
  });
});
