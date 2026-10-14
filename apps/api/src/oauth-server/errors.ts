/**
 * RFC 6749 §5.2 error. The protocol endpoints answer in the spec's
 * `{ error, error_description }` shape, not the app's `successResponse`
 * envelope, because OAuth client libraries parse exactly that.
 */
export class OAuthError extends Error {
  constructor(
    public readonly error: string,
    public readonly description: string,
    public readonly status: 400 | 401 | 403 = 400,
  ) {
    super(description);
    this.name = 'OAuthError';
  }
}

/**
 * An authorization-request failure. `redirectable` says whether the
 * redirect_uri has been proven safe: if it hasn't, the user must be shown the
 * error on our page instead of being bounced to an unverified address (RFC
 * 6749 §4.1.2.1 — otherwise we are an open redirector).
 */
export class AuthorizeError extends OAuthError {
  constructor(
    error: string,
    description: string,
    public readonly redirectable: boolean,
  ) {
    super(error, description, 400);
    this.name = 'AuthorizeError';
  }
}

/** A rotated refresh token was presented again. Distinct so the router can audit it. */
export class TokenReuseError extends OAuthError {
  constructor(
    public readonly memberId: string,
    public readonly clientRowId: string,
  ) {
    super('invalid_grant', 'The refresh token is invalid or has expired.');
    this.name = 'TokenReuseError';
  }
}
