import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { AuthTokens, OAuthProviderId } from '@kairos/types';
import { api } from './api-client';

// Required for `openAuthSessionAsync` on web / Expo Go to clear a completed
// auth session on module load. No-op on native builds — safe to always call.
WebBrowser.maybeCompleteAuthSession();

const CALLBACK_PATH = '/oauth-callback';
const CONFIRM_LINK_PATH = '/oauth-confirm-link';
const LOGIN_PATH = '/login';

/**
 * Discriminated union returned by `startOAuthFlow`. Every branch a caller
 * needs to handle after tapping "Continue with Google" is explicit.
 */
export type OAuthStartResult =
  | { kind: 'signed_in'; tokens: AuthTokens; method: OAuthProviderId }
  | {
      kind: 'confirm_link';
      confirmationToken: string;
      email: string;
      provider: OAuthProviderId;
    }
  | { kind: 'error'; slug: string }
  | { kind: 'cancelled' };

// The app's own scheme, not the website. iOS only returns an https URL from
// the sign-in browser to an app holding a `webcredentials` association; without
// one it refuses to start the session and the tap looks like a cancel.
const APP_SCHEME_PREFIX = 'kairos://';

function callbackUrl(): string {
  return `${APP_SCHEME_PREFIX}${CALLBACK_PATH.slice(1)}`;
}

/**
 * Kick off a Kairos-only Better-Auth OAuth flow: opens the system browser
 * (or in-app SFAuthenticationSession / Chrome Custom Tab) at the API's
 * `/api/auth/oauth/:provider/start`, then waits for the OS to route the
 * server's `kairos://oauth-callback#…` redirect back into the app.
 *
 * `returnTo` is threaded through to the API so the server can preserve
 * where in the app the user was before starting sign-in — defaults to
 * `/oauth-callback` (root re-entry).
 */
export async function startOAuthFlow(
  provider: OAuthProviderId,
  returnTo: string = CALLBACK_PATH,
): Promise<OAuthStartResult> {
  const startUrl = api.auth.oauth.startUrl(provider, returnTo, 'mobile');
  const redirectUrl = callbackUrl();

  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUrl, {
    // Ephemeral session keeps the sign-in cookies out of the shared
    // Safari cookie jar on iOS. On Android, ignored.
    preferEphemeralSession: true,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { kind: 'cancelled' };
  }
  if (result.type !== 'success' || !result.url) {
    return { kind: 'error', slug: 'browser_failed' };
  }

  return parseCallbackUrl(result.url, provider);
}

/**
 * Exported for testing + for a future `Linking.addEventListener('url', ...)`
 * cold-start handler if we ever route a callback URL when the app was not
 * the one to launch the browser.
 */
export function parseCallbackUrl(
  rawUrl: string,
  provider: OAuthProviderId,
): OAuthStartResult {
  // `Linking.parse` gives scheme + hostname + path + queryParams but drops
  // the URL fragment — the OAuth tokens land in the fragment on purpose so
  // they never appear in server access logs. Split raw for the hash.
  // The server ends app-started flows at `kairos://<path>`; read them the same
  // way as the https form so one set of path checks covers both.
  const normalized = rawUrl.startsWith(APP_SCHEME_PREFIX)
    ? `https://app.invalid/${rawUrl.slice(APP_SCHEME_PREFIX.length)}`
    : rawUrl;
  const parsed = Linking.parse(normalized);
  const path = normalizePath(parsed.path);

  if (path === CALLBACK_PATH) {
    const fragment = extractFragment(normalized);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const method = (params.get('method') as OAuthProviderId | null) ?? provider;
    if (accessToken && refreshToken) {
      return {
        kind: 'signed_in',
        tokens: { accessToken, refreshToken },
        method,
      };
    }
    return { kind: 'error', slug: 'callback_missing_tokens' };
  }

  if (path === CONFIRM_LINK_PATH) {
    const q = parsed.queryParams ?? {};
    const token = stringParam(q['token']);
    const email = stringParam(q['email']);
    const p = (stringParam(q['provider']) as OAuthProviderId) || provider;
    if (token && email) {
      return {
        kind: 'confirm_link',
        confirmationToken: token,
        email,
        provider: p,
      };
    }
    return { kind: 'error', slug: 'confirm_link_missing_params' };
  }

  if (path === LOGIN_PATH) {
    const q = parsed.queryParams ?? {};
    const slug = stringParam(q['oauth_error']) || 'provider_error';
    return { kind: 'error', slug };
  }

  return { kind: 'error', slug: 'unknown_callback' };
}

function normalizePath(input: string | null | undefined): string {
  if (!input) return '';
  const stripped = input.replace(/^\/+/, '').replace(/\/+$/, '');
  return stripped ? `/${stripped}` : '';
}

function extractFragment(url: string): string {
  const idx = url.indexOf('#');
  if (idx < 0) return '';
  return url.slice(idx + 1);
}

function stringParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

/**
 * Turn a server-side error slug (from `/login?oauth_error=…`) into a
 * user-facing message. Kept here so login + signup + connections screens
 * all read the same wording.
 */
export function mapOAuthErrorSlug(slug: string): string {
  switch (slug) {
    case 'state_mismatch':
      return 'Sign-in was interrupted. Please try again.';
    case 'token_exchange_failed':
    case 'id_token_invalid':
      return 'The sign-in provider rejected the request. Please try again.';
    case 'provider_error':
      return 'The sign-in provider returned an error.';
    case 'browser_failed':
      return 'Could not open the browser for sign-in.';
    case 'callback_missing_tokens':
      return 'Sign-in did not return tokens. Please try again.';
    case 'confirm_link_missing_params':
      return 'The account link request was malformed.';
    case 'unknown_callback':
      return 'Sign-in returned an unexpected response.';
    default:
      return 'Could not sign in.';
  }
}
