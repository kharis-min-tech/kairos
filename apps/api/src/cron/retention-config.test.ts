import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readRetentionPolicy, PUBLISHED_SIGNIN_DAYS } from './retention-policy';

vi.mock('@kairos/utils', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } };
});

const { logger } = await import('@kairos/utils');
const errorLog = logger.error as unknown as ReturnType<typeof vi.fn>;

/**
 * The deployed numbers, checked against the code that reads them.
 *
 * `retention-policy.test.ts` proves the reader rejects a bad value. This file
 * proves the values we actually ship are not bad ones, which is a different
 * claim and the one that decides whether anything gets deleted in production.
 *
 * It exists because of a specific, already-observed failure mode: Wrangler env
 * blocks inherit nothing from top-level, so a setting added to one block and
 * not the other is silently absent in the environment that was missed. That
 * happened to MFA_REQUIRED_FROM. For a retention period the symptom is worse
 * than a missing feature and much quieter: the category simply never purges,
 * the job reports it in `unset`, and nobody reads the cron log until an auditor
 * asks why the privacy notice says one thing and the database says another.
 */

const CONFIG = fileURLToPath(new URL('../../wrangler.jsonc', import.meta.url));

/** Strip JSONC comments that sit outside string literals. */
function parseJsonc(src: string): unknown {
  let out = '';
  let inString = false;
  let escaped = false;
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const next = src[i + 1];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return JSON.parse(out);
}

interface WranglerConfig {
  vars: Record<string, string>;
  env: Record<string, { vars: Record<string, string> }>;
}

const config = parseJsonc(readFileSync(CONFIG, 'utf8')) as WranglerConfig;

const ENVIRONMENTS: ReadonlyArray<[string, Record<string, string>]> = [
  ['production', config.vars],
  ['staging', config.env['staging']!.vars],
];

const SETTINGS = [
  'RETENTION_SIGNIN_DAYS',
  'RETENTION_OUTREACH_CONTACT_DAYS',
  'RETENTION_EMAIL_CHANGE_DAYS',
  'RETENTION_OAUTH_CODE_DAYS',
] as const;

describe.each(ENVIRONMENTS)('%s retention settings', (_name, vars) => {
  it.each(SETTINGS)('declares %s', (key) => {
    expect(vars[key]).toBeDefined();
  });

  /**
   * A value below its floor, or a typo, is refused by the reader and logged.
   * Shipping one would leave the category unpurged while the config looked
   * populated, which is the most misleading of the possible states.
   */
  it('switches every category on, with no value refused', () => {
    errorLog.mockReset();
    const policy = readRetentionPolicy(vars);

    expect(policy.outreachContactDays).not.toBeNull();
    expect(policy.emailChangeRequestDays).not.toBeNull();
    expect(policy.oauthCodeDays).not.toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
  });

  /**
   * The privacy notice publishes a number to members. Diverging from it is
   * allowed, because the notice can be edited, but it must be a decision
   * someone made rather than a drift nobody noticed.
   */
  it('enforces the sign-in period the privacy notice publishes', () => {
    expect(readRetentionPolicy(vars).signinDays).toBe(PUBLISHED_SIGNIN_DAYS);
  });
});
