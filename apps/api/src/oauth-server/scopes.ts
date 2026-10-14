/**
 * The scopes a client may request. Adding one later is cheap; taking one away
 * breaks every app already using it — so this list stays small on purpose.
 */
export const OAUTH_SCOPES = {
  openid: 'Sign you in',
  profile: 'Your name and home branch',
  email: 'Your email address',
  'kairos:grants': 'Your roles, and the branches, fellowships and departments they cover',
} as const;

export type OAuthScope = keyof typeof OAUTH_SCOPES;

export const OAUTH_SCOPE_LIST = Object.keys(OAUTH_SCOPES) as OAuthScope[];

export function isKnownScope(scope: string): scope is OAuthScope {
  return Object.prototype.hasOwnProperty.call(OAUTH_SCOPES, scope);
}

/** Splits a space-delimited scope string, dropping blanks and duplicates. */
export function parseScopes(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.split(/\s+/).filter(Boolean)));
}
