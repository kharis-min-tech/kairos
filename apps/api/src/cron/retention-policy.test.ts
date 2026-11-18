import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUBLISHED_SIGNIN_DAYS, readRetentionPolicy } from './retention-policy';

vi.mock('@kairos/utils', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } };
});

const { logger } = await import('@kairos/utils');
const errorLog = logger.error as unknown as ReturnType<typeof vi.fn>;
const warnLog = logger.warn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  errorLog.mockReset();
  warnLog.mockReset();
});

/**
 * Every number here deletes somebody's personal data on a schedule, so the
 * behaviour that matters is what happens when a number is absent, wrong, or
 * a typo. Those are the cases a test earns its keep on.
 */

describe('readRetentionPolicy — the default is keep', () => {
  it('purges nothing but sign-in rows when nothing is configured', () => {
    const policy = readRetentionPolicy({});
    expect(policy.outreachContactDays).toBeNull();
    expect(policy.emailChangeRequestDays).toBeNull();
    expect(policy.oauthCodeDays).toBeNull();
  });

  /**
   * Sign-in rows are the exception, because the privacy notice already
   * promises 90 days and that promise predates any of this configuration.
   */
  it('keeps the published 90 days for sign-in rows with no setting', () => {
    expect(readRetentionPolicy({}).signinDays).toBe(PUBLISHED_SIGNIN_DAYS);
  });

  it('reads a configured period', () => {
    const policy = readRetentionPolicy({ RETENTION_OUTREACH_CONTACT_DAYS: '365' });
    expect(policy.outreachContactDays).toBe(365);
  });
});

describe('readRetentionPolicy — a bad value never deletes more', () => {
  it.each([
    ['not a number', 'soon'],
    ['empty', ''],
    ['zero', '0'],
    ['negative', '-30'],
    ['fractional', '30.5'],
  ])('ignores a %s value and leaves the category unpurged', (_label, value) => {
    const policy = readRetentionPolicy({ RETENTION_OUTREACH_CONTACT_DAYS: value });
    expect(policy.outreachContactDays).toBeNull();
  });

  it('says so loudly rather than ignoring it quietly', () => {
    readRetentionPolicy({ RETENTION_OUTREACH_CONTACT_DAYS: 'soon' });
    expect(errorLog).toHaveBeenCalled();
    expect(errorLog.mock.calls[0]![0]).toBe('retention.setting_invalid');
  });

  /**
   * The failure this guards against is a mistyped 3 where 300 was meant.
   * Without a floor that empties a table overnight, and the first anyone
   * knows is that the data has gone.
   */
  it('refuses a period below the floor for its category', () => {
    const policy = readRetentionPolicy({ RETENTION_OUTREACH_CONTACT_DAYS: '3' });
    expect(policy.outreachContactDays).toBeNull();
    expect(errorLog.mock.calls[0]![0]).toBe('retention.setting_below_floor');
  });

  it('accepts a period exactly on the floor', () => {
    expect(readRetentionPolicy({ RETENTION_OUTREACH_CONTACT_DAYS: '30' }).outreachContactDays).toBe(30);
  });

  it('falls back to the published period when the sign-in setting is nonsense', () => {
    expect(readRetentionPolicy({ RETENTION_SIGNIN_DAYS: 'ninety' }).signinDays).toBe(
      PUBLISHED_SIGNIN_DAYS,
    );
  });
});

describe('readRetentionPolicy — the published number and the enforced one', () => {
  /**
   * A member reading 90 days in the privacy notice while the system enforces
   * 30 is the transparency defect this whole job exists to close. Diverging
   * is allowed, because the notice can be edited. Diverging quietly is not.
   */
  it('warns when the configured sign-in period differs from the published one', () => {
    const policy = readRetentionPolicy({ RETENTION_SIGNIN_DAYS: '30' });
    expect(policy.signinDays).toBe(30);
    expect(warnLog).toHaveBeenCalled();
    expect(warnLog.mock.calls[0]![0]).toBe('retention.signin_differs_from_published');
  });

  it('stays quiet when it matches', () => {
    readRetentionPolicy({ RETENTION_SIGNIN_DAYS: '90' });
    expect(warnLog).not.toHaveBeenCalled();
  });
});

describe('readRetentionPolicy — where settings come from', () => {
  it('prefers the Worker environment over a stray process variable', () => {
    process.env['RETENTION_OAUTH_CODE_DAYS'] = '99';
    try {
      expect(readRetentionPolicy({ RETENTION_OAUTH_CODE_DAYS: '7' }).oauthCodeDays).toBe(7);
    } finally {
      delete process.env['RETENTION_OAUTH_CODE_DAYS'];
    }
  });

  it('falls back to process.env for local development', () => {
    process.env['RETENTION_OAUTH_CODE_DAYS'] = '7';
    try {
      expect(readRetentionPolicy({}).oauthCodeDays).toBe(7);
    } finally {
      delete process.env['RETENTION_OAUTH_CODE_DAYS'];
    }
  });
});
