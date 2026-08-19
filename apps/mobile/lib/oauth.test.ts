import * as WebBrowserImport from 'expo-web-browser';
import { mapOAuthErrorSlug, parseCallbackUrl, startOAuthFlow } from './oauth';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// Minimal Linking stub — we only need `parse`. Mirrors the shape
// expo-linking returns on native (fragment is dropped from `path`; that's
// the whole reason the OAuth flow parses it out of the raw URL itself).
jest.mock('expo-linking', () => ({
  parse: jest.fn((url: string) => {
    const noFragment = url.split('#')[0]!;
    const [prefix, query] = noFragment.split('?');
    const [, hostAndPath] = (prefix ?? '').split('://');
    const [, ...pathParts] = (hostAndPath ?? '').split('/');
    const path = pathParts.join('/');
    const queryParams: Record<string, string> = {};
    if (query) {
      for (const pair of query.split('&')) {
        const [k, v] = pair.split('=');
        if (k) queryParams[k] = decodeURIComponent(v ?? '');
      }
    }
    return { scheme: null, hostname: null, path, queryParams };
  }),
}));

// The oauth module imports the api-client (heavy — pulls in @kairos/api-client,
// core, types). Stub it so tests don't need every dependency wired.
jest.mock('@/lib/api-client', () => ({
  api: {
    auth: {
      oauth: {
        startUrl: (provider: string, returnTo?: string) =>
          `https://api.example/api/auth/oauth/${provider}/start${
            returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
          }`,
      },
    },
  },
}));

jest.mock('@/lib/config', () => ({
  apiBaseUrl: 'https://api.example',
  frontendBaseUrl: 'https://frontend.example',
  mapboxPublicToken: undefined,
}));

const WebBrowser = WebBrowserImport as unknown as {
  openAuthSessionAsync: jest.Mock;
  maybeCompleteAuthSession: jest.Mock;
};

describe('parseCallbackUrl', () => {
  it('parses the success fragment into tokens + method', () => {
    const r = parseCallbackUrl(
      'https://frontend.example/oauth-callback#accessToken=A1&refreshToken=R1&method=google',
      'google',
    );
    expect(r).toEqual({
      kind: 'signed_in',
      tokens: { accessToken: 'A1', refreshToken: 'R1' },
      method: 'google',
    });
  });

  it('reports callback_missing_tokens if the fragment is empty', () => {
    const r = parseCallbackUrl(
      'https://frontend.example/oauth-callback',
      'microsoft',
    );
    expect(r).toEqual({ kind: 'error', slug: 'callback_missing_tokens' });
  });

  it('parses the confirm-link path into token + email + provider', () => {
    const r = parseCallbackUrl(
      'https://frontend.example/oauth-confirm-link?token=CT&email=a%40b.com&provider=microsoft',
      'google',
    );
    expect(r).toEqual({
      kind: 'confirm_link',
      confirmationToken: 'CT',
      email: 'a@b.com',
      provider: 'microsoft',
    });
  });

  it('parses server-side error slug from /login?oauth_error=…', () => {
    const r = parseCallbackUrl(
      'https://frontend.example/login?oauth_error=state_mismatch',
      'apple',
    );
    expect(r).toEqual({ kind: 'error', slug: 'state_mismatch' });
  });

  it('returns unknown_callback for unrecognised paths', () => {
    const r = parseCallbackUrl(
      'https://frontend.example/nowhere',
      'google',
    );
    expect(r).toEqual({ kind: 'error', slug: 'unknown_callback' });
  });
});

describe('startOAuthFlow', () => {
  beforeEach(() => {
    WebBrowser.openAuthSessionAsync.mockReset();
  });

  it('returns cancelled when the user closes the browser', async () => {
    WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    await expect(startOAuthFlow('google')).resolves.toEqual({
      kind: 'cancelled',
    });
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://api.example/api/auth/oauth/google/start?returnTo=%2Foauth-callback',
      'https://frontend.example/oauth-callback',
      expect.objectContaining({ preferEphemeralSession: true }),
    );
  });

  it('parses signed_in tokens from a successful redirect', async () => {
    WebBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'https://frontend.example/oauth-callback#accessToken=AAA&refreshToken=BBB&method=google',
    });
    await expect(startOAuthFlow('google')).resolves.toEqual({
      kind: 'signed_in',
      tokens: { accessToken: 'AAA', refreshToken: 'BBB' },
      method: 'google',
    });
  });

  it('routes to confirm_link when the API redirected to /oauth-confirm-link', async () => {
    WebBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'https://frontend.example/oauth-confirm-link?token=T1&email=x%40y.co&provider=apple',
    });
    await expect(startOAuthFlow('apple')).resolves.toEqual({
      kind: 'confirm_link',
      confirmationToken: 'T1',
      email: 'x@y.co',
      provider: 'apple',
    });
  });

  it('surfaces server-side error slugs', async () => {
    WebBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'https://frontend.example/login?oauth_error=token_exchange_failed',
    });
    await expect(startOAuthFlow('microsoft')).resolves.toEqual({
      kind: 'error',
      slug: 'token_exchange_failed',
    });
  });
});

describe('mapOAuthErrorSlug', () => {
  it('maps known slugs to friendly wording', () => {
    expect(mapOAuthErrorSlug('state_mismatch')).toMatch(/interrupted/i);
    expect(mapOAuthErrorSlug('token_exchange_failed')).toMatch(/rejected/i);
    expect(mapOAuthErrorSlug('id_token_invalid')).toMatch(/rejected/i);
    expect(mapOAuthErrorSlug('provider_error')).toMatch(/provider/i);
    expect(mapOAuthErrorSlug('browser_failed')).toMatch(/browser/i);
    expect(mapOAuthErrorSlug('callback_missing_tokens')).toMatch(/tokens/i);
    expect(mapOAuthErrorSlug('confirm_link_missing_params')).toMatch(/malformed/i);
  });

  it('falls back to a generic message for unknown slugs', () => {
    expect(mapOAuthErrorSlug('what_is_this')).toBe('Could not sign in.');
  });
});
