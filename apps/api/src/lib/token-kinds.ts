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
 *
 * The value itself now lives in `@kairos/types`, because the web and mobile
 * sign-in screens need to recognise a pre-MFA token too and a hand-copied
 * string in three packages is a string that eventually disagrees with itself.
 * This module stays as the import site the middleware uses, for the reason
 * above.
 */

export { MFA_TOKEN_KIND } from '@kairos/types';
