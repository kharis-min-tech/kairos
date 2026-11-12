import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { members } from '@kairos/database';
import { successResponse, UnauthorizedError, verifyPassword } from '@kairos/utils';
import { db } from '../db';
import { authMiddleware, getAuth } from '../middleware/auth';
import { getAuthSecrets } from '../lib/auth-secrets';
import { getMfaKey } from '../lib/mfa-key';
import { readSetting } from '../lib/secret-env';
import { resolveGrants } from '../lib/grants';
import {
  beginEnrolment,
  confirmEnrolment,
  disableMfa,
  getMfaState,
  regenerateBackupCodes,
  verifySecondFactor,
} from './mfa';
import { issueAuthenticatedSession, verifyMfaToken } from './service';

/**
 * The MFA endpoints.
 *
 * Deliberately does NOT mount `authMiddleware` on `*`. Two of these routes
 * are reachable with a pre-MFA token — which `authMiddleware` refuses, and
 * must keep refusing — so each route states which kind of caller it accepts
 * rather than inheriting one blanket answer.
 */
export const mfaRouter = new Hono();

const codeSchema = z.object({
  // Wide on purpose: this accepts a 6-digit TOTP code OR a formatted backup
  // code, and the service decides which. Validating the shape tightly here
  // would reject backup codes at the door.
  code: z.string().min(6).max(32),
});

const passwordSchema = z.object({ currentPassword: z.string().min(1) });

function issuer(c: Parameters<typeof readSetting>[0]): string {
  return readSetting(c, 'MFA_ISSUER', 'Kairos');
}

async function loadMember(memberId: string) {
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) throw new UnauthorizedError('Please sign in again.');
  return member;
}

/** Bearer token from the header, whatever kind it is. */
function bearer(c: { req: { header: (n: string) => string | undefined } }): string {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Please sign in again.');
  return header.slice(7);
}

/**
 * Where a privileged member stands: enrolled, half-enrolled, or nothing yet.
 * Full access token only — this is an informational read for the settings
 * screen, not part of the sign-in flow.
 */
mfaRouter.get('/status', authMiddleware, async (c) => {
  const auth = getAuth(c);
  const state = await getMfaState(db, auth.memberId, auth.systemRole, auth.grants ?? []);
  return c.json(successResponse(state));
});

/**
 * Start enrolment. Accepts EITHER a full session (someone turning MFA on from
 * settings) or a pre-MFA token at the `enrolment` stage (someone the cutover
 * has caught and who cannot get a full session until they finish).
 */
mfaRouter.post('/enrol', async (c) => {
  const secrets = getAuthSecrets(c);
  const token = bearer(c);

  let memberId: string;
  try {
    const pre = await verifyMfaToken(token, secrets);
    if (pre.stage !== 'enrolment') {
      throw new UnauthorizedError('Finish signing in with your authenticator.');
    }
    memberId = pre.memberId;
  } catch {
    // Not a pre-MFA token, so it must be a real session.
    await authMiddleware(c, async () => {});
    memberId = getAuth(c).memberId;
  }

  const member = await loadMember(memberId);
  const result = await beginEnrolment(db, await getMfaKey(c), {
    memberId,
    email: member.email,
    issuer: issuer(c),
  });
  return c.json(successResponse(result));
});

/**
 * Finish enrolment by proving the authenticator works.
 *
 * Returns the backup codes, shown once and never again, and — when the caller
 * was mid-sign-in — the session they were held out of. Finishing enrolment
 * IS proving a factor, so sending them back to the login screen to type a
 * second code thirty seconds later would be ceremony, not security.
 */
mfaRouter.post('/confirm', zValidator('json', codeSchema), async (c) => {
  const secrets = getAuthSecrets(c);
  const token = bearer(c);
  const { code } = c.req.valid('json');

  let memberId: string;
  let wasMidSignIn = false;
  try {
    const pre = await verifyMfaToken(token, secrets);
    if (pre.stage !== 'enrolment') {
      throw new UnauthorizedError('Finish signing in with your authenticator.');
    }
    memberId = pre.memberId;
    wasMidSignIn = true;
  } catch {
    await authMiddleware(c, async () => {});
    memberId = getAuth(c).memberId;
  }

  const result = await confirmEnrolment(db, await getMfaKey(c), memberId, code);

  if (!wasMidSignIn) return c.json(successResponse(result));

  const member = await loadMember(memberId);
  const session = await issueAuthenticatedSession(db, member, secrets, {
    mfaSatisfied: true,
    c,
  });
  return c.json(successResponse({ ...result, ...session }));
});

/**
 * Exchange a pre-MFA token and a code for a real session.
 *
 * No `authMiddleware`: the caller has no session yet, which is the point.
 */
mfaRouter.post('/verify', zValidator('json', codeSchema), async (c) => {
  const secrets = getAuthSecrets(c);
  const pre = await verifyMfaToken(bearer(c), secrets);
  if (pre.stage !== 'challenge') {
    throw new UnauthorizedError('Set up an authenticator before signing in.');
  }

  const result = await verifySecondFactor(db, await getMfaKey(c), pre.memberId, c.req.valid('json').code);
  const member = await loadMember(pre.memberId);
  const session = await issueAuthenticatedSession(db, member, secrets, {
    mfaSatisfied: true,
    c,
  });
  return c.json(successResponse({ ...session, mfaMethod: result.method, backupCodesRemaining: result.backupCodesRemaining }));
});

/**
 * Turn the factor off, or replace it.
 *
 * Re-asks for the password. Removing a second factor from a session that is
 * already open is precisely what someone who has borrowed that session wants
 * to do, and the whole point of the factor is that the password alone is not
 * enough — so the password alone should not be enough to remove it either.
 * It is the best available check short of asking for a current code, which a
 * member with a broken phone cannot produce and who is the main honest caller
 * here.
 */
mfaRouter.post('/disable', authMiddleware, zValidator('json', passwordSchema), async (c) => {
  const auth = getAuth(c);
  const member = await loadMember(auth.memberId);
  const ok = await verifyPassword(c.req.valid('json').currentPassword, member.passwordHash);
  if (!ok) throw new UnauthorizedError('That password is not correct.');

  await disableMfa(db, auth.memberId);

  // Says plainly whether they are now out of compliance, so the UI can nag
  // rather than let a leader quietly drop their factor and hear nothing.
  const grants = await resolveGrants(db, auth.memberId);
  const state = await getMfaState(db, auth.memberId, auth.systemRole, grants);
  return c.json(successResponse(state, 'Your authenticator has been removed.'));
});

/** Fresh backup codes, voiding the old set. Password-gated for the same reason. */
mfaRouter.post('/backup-codes', authMiddleware, zValidator('json', passwordSchema), async (c) => {
  const auth = getAuth(c);
  const member = await loadMember(auth.memberId);
  const ok = await verifyPassword(c.req.valid('json').currentPassword, member.passwordHash);
  if (!ok) throw new UnauthorizedError('That password is not correct.');

  const result = await regenerateBackupCodes(db, auth.memberId);
  return c.json(successResponse(result));
});
