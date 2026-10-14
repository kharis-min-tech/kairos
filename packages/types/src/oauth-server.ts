/**
 * Wire types for Kairos acting as an OAuth2 / OpenID Connect authorization
 * server (Better-Auth Phase 2). The protocol endpoints themselves
 * (/token, /userinfo, …) speak RFC shapes and are not modelled here; these are
 * the first-party surfaces: the consent screen, the member's connected apps
 * and the admin client registry.
 */

export type OAuthClientType = 'confidential' | 'public';

export interface OAuthScopeInfo {
  scope: string;
  description: string;
}

/** Scopes a client may be allowed. Mirrors apps/api/src/oauth-server/scopes.ts. */
export const OAUTH_SERVER_SCOPES: readonly OAuthScopeInfo[] = [
  { scope: 'openid', description: 'Sign you in' },
  { scope: 'profile', description: 'Your name and home branch' },
  { scope: 'email', description: 'Your email address' },
  { scope: 'kairos:grants', description: 'Your roles, and the branches, fellowships and departments they cover' },
];

export interface OAuthClientSummary {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  homepageUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  clientType: OAuthClientType;
  redirectUris: string[];
  allowedScopes: string[];
  isTrusted: boolean;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  grantCount?: number;
  hasPreviousSecret: boolean;
}

export interface CreateOAuthClientRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  homepageUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  clientType: OAuthClientType;
  redirectUris: string[];
  allowedScopes: string[];
  isTrusted?: boolean;
}

export type UpdateOAuthClientRequest = Partial<Omit<CreateOAuthClientRequest, 'clientType'>> & {
  isActive?: boolean;
};

/** The secret is returned exactly once, here, and never again. */
export interface OAuthClientWithSecret {
  client: OAuthClientSummary;
  clientSecret: string | null;
}

export interface OAuthClientGrantRow {
  grantId: string;
  memberId: string;
  memberName: string;
  email: string;
  scopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
}

export interface OAuthClientActivityRow {
  id: string;
  action: string;
  outcome: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** What the consent screen is shown about the app asking to sign the member in. */
export interface OAuthAuthorizeContext {
  status: 'ok';
  client: {
    name: string;
    description: string | null;
    logoUrl: string | null;
    homepageUrl: string | null;
    privacyUrl: string | null;
    termsUrl: string | null;
    isTrusted: boolean;
  };
  scopes: OAuthScopeInfo[];
  /** Trusted client, or the member already approved these scopes: no screen needed. */
  skipConsent: boolean;
  /** Where the member will be sent, shown so they can spot a lookalike. */
  redirectHost: string;
}

/**
 * A failed authorization request. `redirectTo` is set only when the client and
 * redirect_uri were verified, so it is safe to bounce the member back with the
 * error; otherwise the page shows the error itself.
 */
export interface OAuthAuthorizeError {
  status: 'error';
  error: string;
  description: string;
  redirectTo: string | null;
}

export type OAuthAuthorizeContextResponse = OAuthAuthorizeContext | OAuthAuthorizeError;

export interface OAuthAuthorizeParams {
  response_type?: string;
  client_id: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  nonce?: string;
}

export type OAuthAuthorizeDecisionResponse =
  | { status: 'ok'; redirectTo: string }
  | OAuthAuthorizeError;

/** An app the signed-in member has authorised. */
export interface OAuthAppConnection {
  grantId: string;
  clientName: string;
  clientLogoUrl: string | null;
  clientHomepageUrl: string | null;
  scopes: OAuthScopeInfo[];
  connectedAt: string;
  lastUsedAt: string | null;
}
