import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Context } from 'hono';
import { requireSecret, readSetting } from './secret-env';

/**
 * These tests have to lie about the environment to be worth anything.
 *
 * Under Vitest, `isLocalOrTest()` is always true, so the dev fallback is
 * always reachable and a test written naively would prove nothing about the
 * behaviour that matters. `asDeployed` strips the two signals the helper trusts
 * so the assertions run against the deployed code path.
 */
const ORIGINAL = { vitest: process.env['VITEST'], nodeEnv: process.env['NODE_ENV'] };

function asDeployed() {
  delete process.env['VITEST'];
  // A deployed Worker reports either nothing or 'production' here. Neither is
  // on the allowlist, and 'production' is the more dangerous of the two to get
  // wrong, so use it.
  process.env['NODE_ENV'] = 'production';
}

function ctx(env: Record<string, unknown>): Context {
  return { env } as unknown as Context;
}

beforeEach(() => {
  process.env['VITEST'] = ORIGINAL.vitest ?? 'true';
  if (ORIGINAL.nodeEnv === undefined) delete process.env['NODE_ENV'];
  else process.env['NODE_ENV'] = ORIGINAL.nodeEnv;
  delete process.env['TEST_ONLY_SECRET'];
});

afterEach(() => {
  if (ORIGINAL.vitest === undefined) delete process.env['VITEST'];
  else process.env['VITEST'] = ORIGINAL.vitest;
  if (ORIGINAL.nodeEnv === undefined) delete process.env['NODE_ENV'];
  else process.env['NODE_ENV'] = ORIGINAL.nodeEnv;
  delete process.env['TEST_ONLY_SECRET'];
});

describe('requireSecret', () => {
  it('prefers the Worker binding over process.env', () => {
    process.env['TEST_ONLY_SECRET'] = 'from-process';
    expect(requireSecret(ctx({ TEST_ONLY_SECRET: 'from-binding' }), 'TEST_ONLY_SECRET', 'dev')).toBe(
      'from-binding',
    );
  });

  it('falls back to process.env when the context carries no binding', () => {
    process.env['TEST_ONLY_SECRET'] = 'from-process';
    expect(requireSecret(ctx({}), 'TEST_ONLY_SECRET', 'dev')).toBe('from-process');
  });

  it('returns the dev default under the test runner', () => {
    expect(requireSecret(undefined, 'TEST_ONLY_SECRET', 'dev-default')).toBe('dev-default');
  });

  it('returns the dev default in local development', () => {
    delete process.env['VITEST'];
    process.env['NODE_ENV'] = 'development';
    expect(requireSecret(undefined, 'TEST_ONLY_SECRET', 'dev-default')).toBe('dev-default');
  });

  // The whole point of the module.
  it('throws rather than return the dev default in a deployed environment', () => {
    asDeployed();
    expect(() => requireSecret(undefined, 'TEST_ONLY_SECRET', 'dev-default')).toThrow(
      /TEST_ONLY_SECRET is not set/,
    );
  });

  it('never leaks the dev default into the error message', () => {
    asDeployed();
    let message = '';
    try {
      requireSecret(undefined, 'TEST_ONLY_SECRET', 'super-secret-dev-default');
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain('super-secret-dev-default');
  });

  it('still resolves from the binding in a deployed environment', () => {
    asDeployed();
    expect(requireSecret(ctx({ TEST_ONLY_SECRET: 'real' }), 'TEST_ONLY_SECRET', 'dev')).toBe('real');
  });

  it('treats an empty string as absent, so a blank secret fails closed', () => {
    asDeployed();
    expect(() => requireSecret(ctx({ TEST_ONLY_SECRET: '' }), 'TEST_ONLY_SECRET', 'dev')).toThrow(
      /TEST_ONLY_SECRET is not set/,
    );
  });
});

describe('readSetting', () => {
  it('defaults in a deployed environment, because an expiry is not a secret', () => {
    asDeployed();
    expect(readSetting(undefined, 'TEST_ONLY_SECRET', '15m')).toBe('15m');
  });
});

describe('the secrets that must fail closed', () => {
  it.each([
    ['JWT_SECRET', 'dev-secret-change-me'],
    ['JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'],
    ['SELF_CHECK_IN_QR_SECRET', 'dev-self-check-in-qr-secret'],
  ])('%s does not fall back to its committed default once deployed', (key, committedDefault) => {
    asDeployed();
    expect(() => requireSecret(ctx({}), key, committedDefault)).toThrow();
  });
});
