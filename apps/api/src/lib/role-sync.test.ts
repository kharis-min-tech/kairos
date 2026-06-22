import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncFellowshipLeaderGrants,
  syncDepartmentLeadGrants,
  syncDepartmentDeputyGrants,
} from './role-sync';

// ── Mock DB ────────────────────────────────────────────────

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'innerJoin', 'leftJoin', 'set', 'values']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectIdx: number;
let updateCalls: unknown[];
let insertCalls: Record<string, unknown>[];

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectIdx = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectIdx] ?? selectResults[selectResults.length - 1] ?? [];
    selectIdx++;
    return createChain(r);
  });
}

function trackUpdates() {
  updateCalls = [];
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const chain = createChain();
    (chain.set as ReturnType<typeof vi.fn>) = vi.fn((patch: unknown) => {
      updateCalls.push(patch);
      return chain;
    });
    return chain;
  });
}

function trackInserts(throwOn?: { code: string }) {
  insertCalls = [];
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const chain = createChain();
    (chain.values as ReturnType<typeof vi.fn>) = vi.fn((row: Record<string, unknown>) => {
      insertCalls.push(row);
      if (throwOn) {
        const err = new Error('duplicate key value violates unique constraint');
        (err as unknown as { code: string }).code = throwOn.code;
        throw err;
      }
      return chain;
    });
    return chain;
  });
}

const FELLOWSHIP_LEADER_ROLE_ID = 'role-fellowship-leader';
const DEPARTMENT_LEAD_ROLE_ID = 'role-department-lead';
const DEPARTMENT_DEPUTY_ROLE_ID = 'role-department-deputy';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── syncFellowshipLeaderGrants ─────────────────────────────

describe('syncFellowshipLeaderGrants', () => {
  it('inserts an active grant for a new leader when none exists', async () => {
    setupSelectSequence(
      [{ id: FELLOWSHIP_LEADER_ROLE_ID }], // role lookup
      [], // no existing grant for memberId
    );
    trackUpdates();
    trackInserts();

    await syncFellowshipLeaderGrants(mockDb, {
      fellowshipId: 'F-1',
      branchId: 'B-1',
      leaderMemberIds: ['M-1'],
    });

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      memberId: 'M-1',
      roleId: FELLOWSHIP_LEADER_ROLE_ID,
      branchId: 'B-1',
      scopeKind: 'fellowship',
      scopeId: 'F-1',
    });
  });

  it('skips insert when an active grant already exists for the leader', async () => {
    setupSelectSequence(
      [{ id: FELLOWSHIP_LEADER_ROLE_ID }],
      [{ id: 'existing-grant' }], // existing active grant
    );
    trackUpdates();
    trackInserts();

    await syncFellowshipLeaderGrants(mockDb, {
      fellowshipId: 'F-1',
      branchId: 'B-1',
      leaderMemberIds: ['M-1'],
    });

    expect(insertCalls).toHaveLength(0);
  });

  it('deactivates active grants when leaderMemberIds is empty', async () => {
    setupSelectSequence([{ id: FELLOWSHIP_LEADER_ROLE_ID }]);
    trackUpdates();
    trackInserts();

    await syncFellowshipLeaderGrants(mockDb, {
      fellowshipId: 'F-1',
      branchId: 'B-1',
      leaderMemberIds: [],
    });

    // One update call to deactivate any active grants on this scope
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({ isActive: false });
    expect(insertCalls).toHaveLength(0);
  });

  it('handles both leader and co-leader in one call', async () => {
    setupSelectSequence(
      [{ id: FELLOWSHIP_LEADER_ROLE_ID }],
      [], // no grant for M-1
      [], // no grant for M-2
    );
    trackUpdates();
    trackInserts();

    await syncFellowshipLeaderGrants(mockDb, {
      fellowshipId: 'F-1',
      branchId: 'B-1',
      leaderMemberIds: ['M-1', 'M-2'],
    });

    expect(insertCalls).toHaveLength(2);
    expect(insertCalls.map((r) => r['memberId'])).toEqual(['M-1', 'M-2']);
  });

  it('swallows 23505 unique-violation during concurrent insert', async () => {
    setupSelectSequence(
      [{ id: FELLOWSHIP_LEADER_ROLE_ID }],
      [], // no grant — proceed to insert
    );
    trackUpdates();
    trackInserts({ code: '23505' });

    // Should NOT throw.
    await expect(
      syncFellowshipLeaderGrants(mockDb, {
        fellowshipId: 'F-1',
        branchId: 'B-1',
        leaderMemberIds: ['M-1'],
      }),
    ).resolves.toBeUndefined();
  });

  it('throws when the Fellowship Leader role is not seeded', async () => {
    setupSelectSequence([]); // role lookup returns no row
    trackUpdates();
    trackInserts();

    await expect(
      syncFellowshipLeaderGrants(mockDb, {
        fellowshipId: 'F-1',
        branchId: 'B-1',
        leaderMemberIds: ['M-1'],
      }),
    ).rejects.toThrow(/not seeded/);
  });
});

// ── syncDepartmentLeadGrants ───────────────────────────────

describe('syncDepartmentLeadGrants', () => {
  it('inserts an active grant for the lead', async () => {
    setupSelectSequence(
      [{ id: DEPARTMENT_LEAD_ROLE_ID }],
      [],
    );
    trackUpdates();
    trackInserts();

    await syncDepartmentLeadGrants(mockDb, {
      branchDepartmentId: 'D-1',
      branchId: 'B-1',
      leadMemberId: 'M-1',
    });

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      memberId: 'M-1',
      scopeKind: 'department',
      scopeId: 'D-1',
    });
  });

  it('deactivates grants when leadMemberId is null', async () => {
    setupSelectSequence([{ id: DEPARTMENT_LEAD_ROLE_ID }]);
    trackUpdates();
    trackInserts();

    await syncDepartmentLeadGrants(mockDb, {
      branchDepartmentId: 'D-1',
      branchId: 'B-1',
      leadMemberId: null,
    });

    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(0);
  });
});

// ── syncDepartmentDeputyGrants ─────────────────────────────

describe('syncDepartmentDeputyGrants', () => {
  it('inserts a Department Deputy grant scoped to the branch_department', async () => {
    setupSelectSequence(
      [{ id: DEPARTMENT_DEPUTY_ROLE_ID }],
      [],
    );
    trackUpdates();
    trackInserts();

    await syncDepartmentDeputyGrants(mockDb, {
      branchDepartmentId: 'D-1',
      branchId: 'B-1',
      deputyMemberId: 'M-2',
    });

    expect(insertCalls[0]).toMatchObject({
      memberId: 'M-2',
      roleId: DEPARTMENT_DEPUTY_ROLE_ID,
      scopeKind: 'department',
      scopeId: 'D-1',
    });
  });
});
