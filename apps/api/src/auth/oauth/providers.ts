import type { OAuthEnv } from './env';
import { buildAppleClientSecret } from './apple-secret';

export type ProviderId = 'google' | 'microsoft' | 'apple';

/**
 * Microsoft Consumer (personal MSA) tenant ID. Any other tid is a
 * work/school (Entra ID) tenant.
 */
const MSFT_MSA_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

export interface ProviderConfig {
  id: ProviderId;
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  /**
   * Expected `iss` claim on the ID token. For providers with a single stable
   * issuer this is a literal string. Microsoft uses a per-tenant issuer, so
   * we compare via `issuerMatches` below.
   */
  issuer: string;
  scopes: string;
  usePkce: boolean;
  isEmailVerified: (claims: Record<string, unknown>) => boolean;
  /**
   * Optional custom issuer check for providers that don't hand back a single
   * literal `iss` (Microsoft). Defaults to strict equality with `issuer`.
   */
  issuerMatches?: (iss: string) => boolean;
  getClientId: (env: OAuthEnv) => string | undefined;
  getClientSecret: (env: OAuthEnv) => Promise<string | undefined>;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  google: {
    id: 'google',
    displayName: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuer: 'https://accounts.google.com',
    scopes: 'openid email profile',
    usePkce: true,
    isEmailVerified: (claims) => claims['email_verified'] === true,
    getClientId: (env) => env.GOOGLE_CLIENT_ID,
    getClientSecret: async (env) => env.GOOGLE_CLIENT_SECRET,
  },
  microsoft: {
    id: 'microsoft',
    displayName: 'Microsoft',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    jwksUrl: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    // The literal `issuer` is a placeholder used only when `issuerMatches`
    // is absent — for Microsoft `issuerMatches` below is the source of truth.
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    scopes: 'openid email profile User.Read',
    usePkce: true,
    // Multi-tenant + personal MSA nuance:
    //   • Work/school (Entra ID) IDs: `email` claim is only issued when a
    //     valid enterprise-verified email exists on the account, so its
    //     presence is a proxy for "verified". If the tenant is NOT the
    //     personal MSA tenant, treat as verified.
    //   • Personal MSA: `preferred_username` mirrors the account's primary
    //     email; if `email` matches `preferred_username` we accept it as
    //     verified (documented MSA behavior — MSA emails must be verified
    //     to be listed as primary).
    isEmailVerified: (claims) => {
      const email = typeof claims['email'] === 'string' ? (claims['email'] as string).toLowerCase() : null;
      const preferred = typeof claims['preferred_username'] === 'string'
        ? (claims['preferred_username'] as string).toLowerCase()
        : null;
      const tid = typeof claims['tid'] === 'string' ? (claims['tid'] as string) : null;
      if (!email) return false;
      if (tid && tid !== MSFT_MSA_TENANT) return true;
      if (email === preferred) return true;
      return false;
    },
    issuerMatches: (iss) => {
      // Tenant-specific issuers look like:
      //   https://login.microsoftonline.com/{tid}/v2.0
      // where {tid} is a UUID. Guard against path traversal / extra segments.
      return /^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]{8,}\/v2\.0$/i.test(iss);
    },
    getClientId: (env) => env.MICROSOFT_CLIENT_ID,
    getClientSecret: async (env) => env.MICROSOFT_CLIENT_SECRET,
  },
  apple: {
    id: 'apple',
    displayName: 'Apple',
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    issuer: 'https://appleid.apple.com',
    scopes: 'openid email name',
    usePkce: true,
    // Apple sends the flag as a string ("true"/"false"); occasionally the
    // ID token contains a real boolean. Cover both.
    isEmailVerified: (claims) => claims['email_verified'] === 'true' || claims['email_verified'] === true,
    getClientId: (env) => env.APPLE_CLIENT_ID,
    // Apple's client_secret is a JIT ES256 JWT — see apple-secret.ts.
    getClientSecret: async (env) => {
      if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
        return undefined;
      }
      return buildAppleClientSecret(env);
    },
  },
};

export function isProviderId(id: string): id is ProviderId {
  return id === 'google' || id === 'microsoft' || id === 'apple';
}
