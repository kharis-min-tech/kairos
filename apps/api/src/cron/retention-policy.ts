import { logger } from '@kairos/utils';

/**
 * How long each category of personal data is kept, read from the environment.
 *
 * ── Why these are settings and not constants ──────────────────────────────
 *
 * Every number here is a decision for the church and its data protection
 * adviser, not for engineering. UK GDPR's storage limitation principle says
 * personal data may not be kept longer than necessary, and "necessary" is a
 * judgement about ministry and law. Putting the numbers in
 * `apps/api/wrangler.jsonc` means the answer can change when the adviser
 * gives one, without a code change, a review and a deploy of logic nobody
 * altered.
 *
 * ── The default is always "keep" ──────────────────────────────────────────
 *
 * Unset means NOTHING IS DELETED for that category. That is the fail-safe
 * direction, and it is deliberate: the cost of keeping data too long is a
 * compliance finding that can be fixed next week, and the cost of deleting it
 * too early is a safeguarding record that no longer exists. Those are not
 * symmetrical, so the default is not a middle value, it is off.
 *
 * Sign-in rows are the one exception and default to 90 days, because the
 * privacy notice already promises that in as many words and the promise
 * predates this file.
 *
 * ── Floors ────────────────────────────────────────────────────────────────
 *
 * Each category carries a minimum. A value below it is refused and logged
 * rather than applied, so a mistyped `3` where `300` was meant cannot empty a
 * table overnight. The floor is not a recommendation; it is the point below
 * which a number is more likely to be a typo than a decision.
 */

export interface RetentionPolicy {
  /** Sign-in success and failure audit rows. Published as 90 days. */
  signinDays: number;
  /**
   * Outreach contacts who never became members and have had no activity.
   * These are people with no account who may not know a record exists, which
   * makes this the category the adviser should answer first.
   */
  outreachContactDays: number | null;
  /** Completed or expired email change requests. They hold BOTH addresses. */
  emailChangeRequestDays: number | null;
  /** Spent or expired OAuth authorization codes. Operational residue. */
  oauthCodeDays: number | null;
}

/** Below these, a number is more likely a typo than a decision. */
const FLOORS = {
  RETENTION_SIGNIN_DAYS: 7,
  RETENTION_OUTREACH_CONTACT_DAYS: 30,
  RETENTION_EMAIL_CHANGE_DAYS: 7,
  RETENTION_OAUTH_CODE_DAYS: 1,
} as const;

/** The period the privacy notice publishes for sign-in logs. */
export const PUBLISHED_SIGNIN_DAYS = 90;

type EnvLike = Record<string, unknown> | undefined;

function read(env: EnvLike, key: string): string | undefined {
  if (env && typeof env === 'object') {
    const v = (env as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

/**
 * One setting, or null when it is absent, unparseable or below its floor.
 *
 * An unparseable value must not silently mean "delete everything" OR be
 * silently ignored, so it is ignored LOUDLY: the same shape as
 * `MFA_REQUIRED_FROM`, where a bad value means "not yet" and says so.
 */
function days(env: EnvLike, key: keyof typeof FLOORS): number | null {
  const raw = read(env, key);
  if (raw === undefined) return null;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    logger.error('retention.setting_invalid', {
      module: 'cron',
      key,
      value: raw,
      effect: 'ignored; this category will not be purged',
    });
    return null;
  }

  const floor = FLOORS[key];
  if (parsed < floor) {
    logger.error('retention.setting_below_floor', {
      module: 'cron',
      key,
      value: parsed,
      floor,
      effect: 'ignored; a value this small is treated as a mistake, not a decision',
    });
    return null;
  }

  return parsed;
}

export function readRetentionPolicy(env: EnvLike): RetentionPolicy {
  const signin = days(env, 'RETENTION_SIGNIN_DAYS') ?? PUBLISHED_SIGNIN_DAYS;

  // The privacy notice names 90 days. Diverging is allowed, because the
  // notice can be edited, but it must not happen quietly: a member reading
  // one number while the system enforces another is the transparency defect
  // this whole job exists to close.
  if (signin !== PUBLISHED_SIGNIN_DAYS) {
    logger.warn('retention.signin_differs_from_published', {
      module: 'cron',
      configured: signin,
      published: PUBLISHED_SIGNIN_DAYS,
      action: 'update the privacy notice to match, or change this back',
    });
  }

  return {
    signinDays: signin,
    outreachContactDays: days(env, 'RETENTION_OUTREACH_CONTACT_DAYS'),
    emailChangeRequestDays: days(env, 'RETENTION_EMAIL_CHANGE_DAYS'),
    oauthCodeDays: days(env, 'RETENTION_OAUTH_CODE_DAYS'),
  };
}
