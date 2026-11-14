import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database } from '@kairos/database';
import type { OAuthProfile } from './service';

// ── Chainable Drizzle-mock helper (partial API) ────────────
function chainTo(data: unknown) {
  const self: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'offset', 'orderBy', 'innerJoin', 'leftJoin', 'set', 'values', 'returning']) {
    self[m] = vi.fn(() => self);
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve(data);
  return self as unknown as {
    select: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    values: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  };
}

interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

function newMockDb(): MockDb {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
}

const BASE_PROFILE: OAuthProfile = {
  provider: 'google',
  providerUserId: 'sub-abc-123',
  email: 'user@example.com',
  emailVerified: true,
  displayName: 'Jane Doe',
  raw: {},
};

const EXISTING_MEMBER_ID = '11111111-1111-1111-1111-111111111111';
const NEW_MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const DEFAULT_BRANCH_ID = '99999999-9999-9999-9999-999999999999';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findOrCreateMemberFromOAuth', () => {
  it('(a) existing (provider, providerUserId) match — signs in, updates lastUsedAt', async () => {
    const db = newMockDb();
    const linkRow = { id: 'link-1', memberId: EXISTING_MEMBER_ID };

    // First select: oauth_accounts by (provider, sub)
    db.select.mockReturnValueOnce(chainTo([linkRow]));

    // update oauth_accounts
    const setCall = vi.fn(() => ({ where: vi.fn(() => Promise.resolve(undefined)) }));
    db.update.mockReturnValue({ set: setCall });

    const { findOrCreateMemberFromOAuth } = await import('./service');
    const result = await findOrCreateMemberFromOAuth(db as unknown as Database, BASE_PROFILE);

    expect(result).toEqual({
      kind: 'signed_in',
      memberId: EXISTING_MEMBER_ID,
      wasNewLink: false,
      wasNewMember: false,
    });
    // lastUsedAt was refreshed
    expect(setCall).toHaveBeenCalledWith(expect.objectContaining({ lastUsedAt: expect.any(Date) }));
    // no member insert
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('(b) verified email matches existing member — auto-links and signs in', async () => {
    const db = newMockDb();

    // 1st select: no existing oauth_accounts row
    db.select.mockReturnValueOnce(chainTo([]));
    // 2nd select: existing member by email
    db.select.mockReturnValueOnce(
      chainTo([{ id: EXISTING_MEMBER_ID, email: 'user@example.com' }]),
    );

    const valuesCall = vi.fn(() => Promise.resolve(undefined));
    db.insert.mockReturnValue({ values: valuesCall });

    const { findOrCreateMemberFromOAuth } = await import('./service');
    const result = await findOrCreateMemberFromOAuth(db as unknown as Database, {
      ...BASE_PROFILE,
      emailVerified: true,
    });

    expect(result).toEqual({
      kind: 'signed_in',
      memberId: EXISTING_MEMBER_ID,
      wasNewLink: true,
      wasNewMember: false,
    });

    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: EXISTING_MEMBER_ID,
        provider: 'google',
        providerUserId: 'sub-abc-123',
        providerEmail: 'user@example.com',
        providerEmailVerified: true,
        isActive: true,
      }),
    );
  });

  it('(c) unverified provider email collides with existing member — returns confirm_password', async () => {
    const db = newMockDb();

    db.select.mockReturnValueOnce(chainTo([])); // no oauth_accounts
    db.select.mockReturnValueOnce(
      chainTo([{ id: EXISTING_MEMBER_ID, email: 'user@example.com' }]),
    );

    const valuesCall = vi.fn(() => Promise.resolve(undefined));
    db.insert.mockReturnValue({ values: valuesCall });

    const { findOrCreateMemberFromOAuth } = await import('./service');
    const result = await findOrCreateMemberFromOAuth(db as unknown as Database, {
      ...BASE_PROFILE,
      emailVerified: false,
    });

    expect(result.kind).toBe('confirm_password');
    if (result.kind !== 'confirm_password') throw new Error('unreachable');
    expect(result.confirmationToken.length).toBeGreaterThan(16);
    expect(result.conflictingMemberEmail).toContain('@example.com');
    expect(result.conflictingMemberEmail).not.toBe('user@example.com'); // masked

    // Only the verification-token row was inserted — NOT an oauth_accounts row
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'link_confirmation',
        identifier: EXISTING_MEMBER_ID,
        isActive: true,
      }),
    );
  });

  it('(d) email matches no member — creates a new pending member + oauth_accounts row', async () => {
    const db = newMockDb();

    db.select.mockReturnValueOnce(chainTo([])); // no oauth_accounts
    db.select.mockReturnValueOnce(chainTo([])); // no member by email
    // resolveDefaultHomeBranchId falls through to `branches` lookup
    db.select.mockReturnValueOnce(chainTo([{ id: DEFAULT_BRANCH_ID }]));

    // Two inserts: members (returning), oauth_accounts (values)
    const memberValuesCall = vi.fn(() => ({
      returning: vi.fn(() =>
        Promise.resolve([
          {
            id: NEW_MEMBER_ID,
            email: 'user@example.com',
            homeBranchId: DEFAULT_BRANCH_ID,
            passwordHash: '',
            emailVerified: true,
            approvalStatus: 'pending',
            systemRole: 'member',
            memberType: 'attendee',
            isActive: false,
          },
        ]),
      ),
    }));
    const oauthValuesCall = vi.fn(() => Promise.resolve(undefined));
    db.insert.mockImplementationOnce(() => ({ values: memberValuesCall }))
      .mockImplementationOnce(() => ({ values: oauthValuesCall }));

    const { findOrCreateMemberFromOAuth } = await import('./service');
    const result = await findOrCreateMemberFromOAuth(db as unknown as Database, BASE_PROFILE);

    expect(result).toEqual({
      kind: 'signed_in',
      memberId: NEW_MEMBER_ID,
      wasNewLink: true,
      wasNewMember: true,
    });

    // Member insert used the split display name
    expect(memberValuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'user@example.com',
        passwordHash: '',
        approvalStatus: 'pending',
        isActive: false,
        homeBranchId: DEFAULT_BRANCH_ID,
        // Phase 1.5 — SSO signups must be marked so the dashboard guards
        // send them through onboarding before they see any tabs.
        mustCompleteProfile: true,
      }),
    );

    // oauth_accounts insert points at the new member
    expect(oauthValuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: NEW_MEMBER_ID,
        provider: 'google',
        providerUserId: 'sub-abc-123',
        isActive: true,
      }),
    );
  });

  it('(e) profile.email null (Apple hide-my-email) — mints synthetic placeholder email', async () => {
    const db = newMockDb();

    db.select.mockReturnValueOnce(chainTo([])); // no oauth_accounts
    db.select.mockReturnValueOnce(chainTo([{ id: DEFAULT_BRANCH_ID }])); // branches lookup

    const memberValuesCall = vi.fn(() => ({
      returning: vi.fn(() =>
        Promise.resolve([
          {
            id: NEW_MEMBER_ID,
            email: 'sub-apple-999@apple.private-relay.local',
          },
        ]),
      ),
    }));
    const oauthValuesCall = vi.fn(() => Promise.resolve(undefined));
    db.insert.mockImplementationOnce(() => ({ values: memberValuesCall }))
      .mockImplementationOnce(() => ({ values: oauthValuesCall }));

    const { findOrCreateMemberFromOAuth } = await import('./service');
    const result = await findOrCreateMemberFromOAuth(db as unknown as Database, {
      provider: 'apple',
      providerUserId: 'sub-apple-999',
      email: null,
      emailVerified: false,
      displayName: null,
      raw: {},
    });

    expect(result.kind).toBe('signed_in');
    expect(memberValuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'sub-apple-999@apple.private-relay.local',
        firstName: 'Pending',
        lastName: 'Signup',
        mustCompleteProfile: true,
      }),
    );
  });
});

describe('disconnectOAuthProvider', () => {
  it('(f) member has password + one connection — disconnect succeeds', async () => {
    const db = newMockDb();

    db.select.mockReturnValueOnce(
      chainTo([{ id: EXISTING_MEMBER_ID, passwordHash: '$2b$10$hash' }]),
    );
    db.select.mockReturnValueOnce(chainTo([{ provider: 'google' }]));

    const setCall = vi.fn(() => ({ where: vi.fn(() => Promise.resolve(undefined)) }));
    db.update.mockReturnValue({ set: setCall });

    const { disconnectOAuthProvider } = await import('./service');
    await expect(
      disconnectOAuthProvider(db as unknown as Database, EXISTING_MEMBER_ID, 'google'),
    ).resolves.toBeUndefined();

    expect(setCall).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('(g) member has no password + two connections — disconnect succeeds', async () => {
    const db = newMockDb();

    db.select.mockReturnValueOnce(
      chainTo([{ id: EXISTING_MEMBER_ID, passwordHash: '' }]),
    );
    db.select.mockReturnValueOnce(
      chainTo([{ provider: 'google' }, { provider: 'microsoft' }]),
    );

    const setCall = vi.fn(() => ({ where: vi.fn(() => Promise.resolve(undefined)) }));
    db.update.mockReturnValue({ set: setCall });

    const { disconnectOAuthProvider } = await import('./service');
    await expect(
      disconnectOAuthProvider(db as unknown as Database, EXISTING_MEMBER_ID, 'google'),
    ).resolves.toBeUndefined();

    expect(setCall).toHaveBeenCalled();
  });

  it('(h) member has no password + one connection (only sign-in method) — throws lockout error', async () => {
    const db = newMockDb();

    db.select.mockReturnValueOnce(
      chainTo([{ id: EXISTING_MEMBER_ID, passwordHash: '' }]),
    );
    db.select.mockReturnValueOnce(chainTo([{ provider: 'google' }]));

    const { disconnectOAuthProvider } = await import('./service');
    await expect(
      disconnectOAuthProvider(db as unknown as Database, EXISTING_MEMBER_ID, 'google'),
    ).rejects.toThrow("You can't disconnect your only sign-in method");

    expect(db.update).not.toHaveBeenCalled();
  });
});
