/**
 * Token kinds that are signed with the access-token secret but are NOT
 * access tokens.
 *
 * They live here rather than in `auth/service.ts` so `middleware/auth.ts` can
 * refuse them without importing the whole auth service — which would drag the
 * mailer, the notifier and the audit writer into every authenticated request.
 *
 * A kind listed here must be refused by `authMiddleware`. `jwtVerify` cannot
 * tell these apart from a real access token, because they are signed with the
 * same secret; the `kind` check is the only thing that does.
 */

/** Issued between a correct password and a correct second-factor code. */
export const MFA_TOKEN_KIND = 'mfa-pending';
