import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';
import type { AuthSecrets } from '../lib/auth-secrets';

const TEST_SECRETS: AuthSecrets = {
  accessSecret: 'dev-secret-change-me',
  refreshSecret: 'dev-refresh-secret-change-me',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
};

vi.mock('../lib/grants', () => ({
  resolveGrants: async () => [],
  authHasAnyCapability: () => false,
  authHasCapability: () => false,
  DB_ROLE_NAME_TO_FUNCTIONAL: {},
}));

vi.mock('./mfa', () => ({
  mfaIsRequiredFor: () => false,
  hasConfirmedFactor: async () => false,
}));

import { refreshAccessToken } from './service';

/**
 * Session revocation.
 *
 * A refresh token carries the generation it was minted under. Bumping
 * `members.token_version` strands every token from an earlier generation,
 * which is how a password change or an administrator's factor reset actually
 * evicts somebody rather than only stopping their next sign-in.
 */

function createChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[] = [];
let selectCallIndex = 0;
const mockDb = { select: vi.fn() } as unknown as import('@kairos/database').Database;

function selectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function member(tokenVersion: number) {
  return [
    {
      id: 'm-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      systemRole: 'member',
      branchId: 'b-1',
      homeBranchId: 'b-1',
      secondaryBranchId: null,
      isAtSecondaryBranch: false,
      isActive: true,
      tokenVersion,
    },
  ];
}

/** A refresh token as the server mints them, at a chosen generation. */
async function refreshTokenAt(generation: number | undefined): Promise<string> {
  const key = new TextEncoder().encode(TEST_SECRETS.refreshSecret);
  const claims: Record<string, unknown> = { memberId: 'm-1', mfa: true };
  if (generation !== undefined) claims['tv'] = generation;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

beforeEach(() => {
  selectResults = [];
  selectCallIndex = 0;
});

describe('refreshAccessToken and the session generation', () => {
  it('accepts a token from the generation the member is on', async () => {
    selectSequence(member(3), [], []);
    const tokens = await refreshAccessToken(mockDb, await refreshTokenAt(3), TEST_SECRETS);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  /**
   * The point of the whole change. Before this, a token from any generation
   * kept working until it expired on its own, which on mobile is a year.
   */
  it('refuses a token from a generation that has been superseded', async () => {
    selectSequence(member(4), [], []);
    await expect(
      refreshAccessToken(mockDb, await refreshTokenAt(3), TEST_SECRETS),
    ).rejects.toThrow('Your session has ended. Please sign in again.');
  });

  it('refuses a token claiming a generation ahead of the member', async () => {
    selectSequence(member(1), [], []);
    await expect(
      refreshAccessToken(mockDb, await refreshTokenAt(2), TEST_SECRETS),
    ).rejects.toThrow('Your session has ended. Please sign in again.');
  });

  /**
   * Tokens minted before the column existed carry no generation claim. They
   * are read as generation zero, which is where every member starts, so
   * deploying this signs nobody out.
   */
  it('reads a token with no generation claim as generation zero', async () => {
    selectSequence(member(0), [], []);
    const tokens = await refreshAccessToken(mockDb, await refreshTokenAt(undefined), TEST_SECRETS);
    expect(tokens.accessToken).toBeTruthy();
  });

  it('refuses an unversioned token once the member has been revoked', async () => {
    selectSequence(member(1), [], []);
    await expect(
      refreshAccessToken(mockDb, await refreshTokenAt(undefined), TEST_SECRETS),
    ).rejects.toThrow('Your session has ended. Please sign in again.');
  });

  /** A rotated token must carry the current generation, not the old one. */
  it('mints the replacement at the member current generation', async () => {
    selectSequence(member(5), [], []);
    const tokens = await refreshAccessToken(mockDb, await refreshTokenAt(5), TEST_SECRETS);

    const payload = JSON.parse(
      Buffer.from(tokens.refreshToken.split('.')[1]!, 'base64').toString('utf8'),
    );
    expect(payload.tv).toBe(5);
  });

  /**
   * The revocation check runs before the grant and MFA work, so a revoked
   * session is refused without any of it being attempted.
   */
  it('refuses a deactivated member before the generation is even considered', async () => {
    selectSequence([], [], []);
    await expect(
      refreshAccessToken(mockDb, await refreshTokenAt(0), TEST_SECRETS),
    ).rejects.toThrow('Member not found or inactive');
  });

  it('does not mistake a non-numeric generation claim for zero', async () => {
    const key = new TextEncoder().encode(TEST_SECRETS.refreshSecret);
    const token = await new SignJWT({ memberId: 'm-1', mfa: true, tv: 'three' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(key);

    selectSequence(member(3), [], []);
    await expect(refreshAccessToken(mockDb, token, TEST_SECRETS)).rejects.toThrow(
      'Your session has ended. Please sign in again.',
    );
  });
});
