/**
 * Enforcement: the half that decides whether the second factor is real.
 *
 * `mfa.test.ts` proves the factor works against real SQL. This proves the
 * sign-in path actually consults it — at login, at refresh, and in the
 * middleware — because a factor nothing checks is a screen, not a control.
 *
 * The storage layer is stubbed here on purpose. What is under test is the
 * DECISION, and a test that has to enrol a member through real Postgres to
 * assert "the biometric refresh path is not exempt" buries the point.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import type { AuthSecrets } from '../lib/auth-secrets';
import type { Grant } from '@kairos/types';

const TEST_SECRETS: AuthSecrets = {
  accessSecret: 'dev-secret-change-me',
  refreshSecret: 'dev-refresh-secret-change-me',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '365d',
};

const MEMBER_ID = '550e8400-e29b-41d4-a716-446655440000';
const BRANCH_ID = '660e8400-e29b-41d4-a716-446655440066';

const LEADER_GRANT = {
  role: 'FellowshipLeader',
  scope: { kind: 'fellowship', id: 'fel-1' },
  branchId: BRANCH_ID,
} as unknown as Grant;

const baseMember = {
  id: MEMBER_ID,
  email: 'grace@kharis.org',
  firstName: 'Grace',
  lastName: 'Okafor',
  systemRole: 'member',
  homeBranchId: BRANCH_ID,
  secondaryBranchId: null,
  isAtSecondaryBranch: false,
  isActive: true,
  approvalStatus: 'approved',
  emailVerified: true,
  mustChangePassword: false,
  mustCompleteProfile: false,
  dateOfBirth: '1990-01-01',
  memberType: 'adult',
} as never;

// Controlled per test.
let enrolled = false;
let grants: Grant[] = [];

vi.mock('./mfa', async () => {
  const actual = await vi.importActual<typeof import('./mfa')>('./mfa');
  return {
    ...actual,
    hasConfirmedFactor: vi.fn(async () => enrolled),
  };
});

vi.mock('../lib/grants', () => ({
  resolveGrants: vi.fn(async () => grants),
  authHasCapability: vi.fn(() => false),
  authHasAnyCapability: vi.fn(() => false),
}));

const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const mockDb = { select: mockSelect, update: mockUpdate } as never;

/**
 * Same shape as `service.test.ts`: the first `select()` answers the member
 * lookup, and every later one resolves empty through whichever chain the
 * caller happens to use. `resolveBranchAdminAuthority` builds
 * `.from().innerJoin().where()` and awaits that directly, so the stand-in
 * has to be thenable as well as chainable.
 */
function selectReturns(rows: unknown[]): void {
  // One chain for every query. `.limit()` is only reached by the member
  // lookup in refreshAccessToken, so it answers with the member;
  // `resolveBranchAdminAuthority` awaits `.where()` directly and gets an
  // empty list. Nothing here needs to tell the queries apart.
  mockSelect.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) {
      chain[method] = () => chain;
    }
    chain['limit'] = async () => rows;
    chain['then'] = (resolve: (v: unknown) => unknown) => resolve([]);
    return chain;
  });
  mockUpdate.mockReturnValue({ set: () => ({ where: async () => undefined }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  enrolled = false;
  grants = [];
  selectReturns([baseMember]);
  delete process.env['MFA_REQUIRED_FROM'];
});

async function refreshTokenFor(mfa: boolean | undefined): Promise<string> {
  const payload: Record<string, unknown> = { memberId: MEMBER_ID };
  if (mfa !== undefined) payload['mfa'] = mfa;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(new TextEncoder().encode(TEST_SECRETS.refreshSecret));
}

describe('issueAuthenticatedSession — who gets challenged', () => {
  it('signs an ordinary member straight in', async () => {
    const { issueAuthenticatedSession } = await import('./service');
    const result = await issueAuthenticatedSession(mockDb, baseMember, TEST_SECRETS);
    expect(result.tokens).toBeDefined();
    expect(result.mfa).toBeUndefined();
  });

  it('withholds the session from an enrolled leader until they produce a code', async () => {
    grants = [LEADER_GRANT];
    enrolled = true;
    const { issueAuthenticatedSession } = await import('./service');
    const result = await issueAuthenticatedSession(mockDb, baseMember, TEST_SECRETS);

    // The important half: NO usable tokens come back. A response that
    // included them alongside a challenge would make the challenge advisory.
    expect(result.tokens).toBeUndefined();
    expect(result.mfa?.stage).toBe('challenge');
  });

  it('challenges a system admin even with no grants at all', async () => {
    enrolled = true;
    const { issueAuthenticatedSession } = await import('./service');
    const result = await issueAuthenticatedSession(
      mockDb,
      { ...(baseMember as object), systemRole: 'admin' } as never,
      TEST_SECRETS,
    );
    expect(result.tokens).toBeUndefined();
  });

  it('signs in a leader who has no factor yet, and says so', async () => {
    // On the day this ships nobody is enrolled. Blocking here would lock
    // every leader out of the system at once.
    grants = [LEADER_GRANT];
    enrolled = false;
    const { issueAuthenticatedSession } = await import('./service');
    const result = await issueAuthenticatedSession(mockDb, baseMember, TEST_SECRETS);
    expect(result.tokens).toBeDefined();
    expect(result.mfaSetupRecommended).toBe(true);
  });

  it('stamps that grace session as NOT having passed a factor', async () => {
    // It must not inherit a pass. If they enrol tomorrow, this token has to
    // stop working, because it was minted before the factor existed.
    grants = [LEADER_GRANT];
    const { issueAuthenticatedSession } = await import('./service');
    const result = await issueAuthenticatedSession(mockDb, baseMember, TEST_SECRETS);
    const { payload } = await jwtVerify(
      result.tokens?.refreshToken as string,
      new TextEncoder().encode(TEST_SECRETS.refreshSecret),
    );
    expect(payload['mfa']).toBe(false);
  });

  it('stops granting grace once MFA_REQUIRED_FROM has passed', async () => {
    process.env['MFA_REQUIRED_FROM'] = '2020-01-01';
    grants = [LEADER_GRANT];
    const { issueAuthenticatedSession } = await import('./service');
    const result = await issueAuthenticatedSession(mockDb, baseMember, TEST_SECRETS);
    expect(result.tokens).toBeUndefined();
    expect(result.mfa?.stage).toBe('enrolment');
  });

  it('treats an unparseable MFA_REQUIRED_FROM as not yet, not as now', async () => {
    // A typo in a setting must not lock the church out of its own system.
    process.env['MFA_REQUIRED_FROM'] = 'next Tuesday';
    grants = [LEADER_GRANT];
    const { issueAuthenticatedSession } = await import('./service');
    const result = await issueAuthenticatedSession(mockDb, baseMember, TEST_SECRETS);
    expect(result.tokens).toBeDefined();
  });
});

describe('refreshAccessToken — the biometric path is not exempt', () => {
  it('refuses a refresh token that never passed a factor, for an enrolled leader', async () => {
    // THE test. On mobile this token is sealed behind the keychain for a
    // year and mints access tokens with no password and no code. Enforcing
    // only at login would exempt mobile from MFA for twelve months.
    grants = [LEADER_GRANT];
    enrolled = true;
    const { refreshAccessToken } = await import('./service');
    await expect(
      refreshAccessToken(mockDb, await refreshTokenFor(false), TEST_SECRETS),
    ).rejects.toThrow(/sign in again/i);
  });

  it('refuses a token minted before MFA existed, which carries no claim', async () => {
    grants = [LEADER_GRANT];
    enrolled = true;
    const { refreshAccessToken } = await import('./service');
    await expect(
      refreshAccessToken(mockDb, await refreshTokenFor(undefined), TEST_SECRETS),
    ).rejects.toThrow(/sign in again/i);
  });

  it('allows one that did pass a factor', async () => {
    grants = [LEADER_GRANT];
    enrolled = true;
    const { refreshAccessToken } = await import('./service');
    const tokens = await refreshAccessToken(mockDb, await refreshTokenFor(true), TEST_SECRETS);
    expect(tokens.accessToken).toBeDefined();
  });

  it('does not strand a leader who has no factor to produce', async () => {
    grants = [LEADER_GRANT];
    enrolled = false;
    const { refreshAccessToken } = await import('./service');
    await expect(
      refreshAccessToken(mockDb, await refreshTokenFor(false), TEST_SECRETS),
    ).resolves.toBeDefined();
  });

  it('leaves an ordinary member alone', async () => {
    const { refreshAccessToken } = await import('./service');
    await expect(
      refreshAccessToken(mockDb, await refreshTokenFor(undefined), TEST_SECRETS),
    ).resolves.toBeDefined();
  });

  it('carries the claim forward rather than re-asserting it', async () => {
    // Rotation must not launder a session into a stronger one than the
    // sign-in that created it.
    const { refreshAccessToken } = await import('./service');
    const rotated = await refreshAccessToken(mockDb, await refreshTokenFor(false), TEST_SECRETS);
    const { payload } = await jwtVerify(
      rotated.refreshToken,
      new TextEncoder().encode(TEST_SECRETS.refreshSecret),
    );
    expect(payload['mfa']).toBe(false);
  });
});

describe('the pre-MFA token grants nothing', () => {
  it('is refused by authMiddleware like any other non-access token', async () => {
    const { signMfaToken } = await import('./service');
    const { authMiddleware } = await import('../middleware/auth');
    const token = await signMfaToken(MEMBER_ID, 'challenge', TEST_SECRETS);

    // It is signed with the SAME secret as a real access token, so jwtVerify
    // is perfectly happy with it. The `kind` check is the only thing between
    // "knows the password" and "is signed in".
    const c = {
      req: { header: (n: string) => (n === 'Authorization' ? `Bearer ${token}` : undefined) },
      set: vi.fn(),
      env: {},
    } as never;
    await expect(authMiddleware(c, async () => {})).rejects.toThrow(/finish signing in/i);
  });

  it('is not accepted where a real access token is expected', async () => {
    const { verifyMfaToken, signMfaToken } = await import('./service');
    // ...and the converse: a real access token must not pass as a pre-MFA
    // one, or an expired session could walk the MFA exchange to mint a fresh
    // one without ever producing a code.
    const access = await new SignJWT({ memberId: MEMBER_ID, systemRole: 'member' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(TEST_SECRETS.accessSecret));
    await expect(verifyMfaToken(access, TEST_SECRETS)).rejects.toThrow(/expired/i);

    const valid = await signMfaToken(MEMBER_ID, 'challenge', TEST_SECRETS);
    await expect(verifyMfaToken(valid, TEST_SECRETS)).resolves.toEqual({
      memberId: MEMBER_ID,
      stage: 'challenge',
    });
  });
});
