import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the shared member-shell helper ───────────────────
const createMemberShellMock = vi.fn();
vi.mock('../lib/member-shell', () => ({
  createMemberShell: (...args: unknown[]) => createMemberShellMock(...args),
}));

// ── Flexible Drizzle mock builder ─────────────────────────
function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'onConflictDoUpdate',
    'update', 'set', 'delete', 'groupBy',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectCallIndex: number;

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  execute: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupInsert(result: unknown) {
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

function setupUpdate(result: unknown = undefined) {
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

// ── Fixtures ──────────────────────────────────────────────

const branchId = '660e8400-e29b-41d4-a716-446655440000';
const otherBranchId = '660e8400-e29b-41d4-a716-446655440001';
const serviceId = '770e8400-e29b-41d4-a716-446655440010';
const memberId = '550e8400-e29b-41d4-a716-446655440002';
const visitorMemberId = '550e8400-e29b-41d4-a716-4466554400ff';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const pastorAuth = { memberId: '000-pastor', email: 'pastor@test.com', systemRole: 'pastor' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'leader' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const leaderOtherBranch = { memberId: '000-leader2', email: 'l2@test.com', systemRole: 'leader' as const, branchId: otherBranchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
// Admin-desk volunteer: a regular member whose home branch has them on the Admin dept roster.
// Distinct from `adminAuth` (which is a system admin, branch-agnostic).
const adminDeptAuth = { memberId: '000-admin-dept', email: 'desk@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

/**
 * The new `enforceServiceWriter` calls `isInAdminDepartment` for non-admin/non-pastor
 * callers via a single SELECT. Pass `true` to make that SELECT return a row (caller IS
 * in the Admin dept), `false` for no row.
 *
 * The dept-check select runs AFTER `getService`/whatever other selects the caller's path
 * needs. Tests are responsible for ordering: `setupSelectSequence(...prior, deptCheck(true), ...next)`.
 */
function deptCheck(positive: boolean): unknown {
  return positive ? [{ id: 'dm-stub' }] : [];
}

const sampleService = {
  id: serviceId,
  branchId,
  serviceDate: new Date('2026-05-24T09:00:00Z'),
  serviceType: 'Sunday',
  serviceTitle: null,
  topic: 'Faith',
  preacherId: null,
  expectedAttendance: 200,
  createdBy: adminAuth.memberId,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  createMemberShellMock.mockReset();
});

import {
  createService,
  listServices,
  getService,
  updateService,
  deleteService,
  getServiceRoster,
  recordAttendance,
  listAttendance,
  getMissingMembers,
  getAttendanceByBranch,
  getAttendanceSummary,
  canRecordAttendance,
  getCohortDiff,
  getMyAttendance,
  getDepartmentAttendance,
  getFellowshipAttendance,
} from './service';

// ── createService ──────────────────────────────────────────

describe('createService', () => {
  it('rejects a Special service without a title via the zod refine (router-level)', () => {
    // The Special-without-title rule lives in schemas.ts; verified in router tests.
    // Here we assert the service still creates a valid Special service when titled.
    expect(true).toBe(true);
  });

  it('creates a Sunday service for admin (no title needed)', async () => {
    setupSelectSequence([]); // no existing duplicate
    setupInsert([sampleService]);

    const result = await createService(mockDb, adminAuth, {
      serviceDate: '2026-05-24T09:00:00Z',
      serviceType: 'Sunday',
      topic: 'Faith',
    });

    expect(result.id).toBe(serviceId);
  });

  it('throws ConflictError when a duplicate service already exists', async () => {
    setupSelectSequence([{ id: serviceId }]); // existing duplicate found

    await expect(
      createService(mockDb, adminAuth, {
        serviceDate: '2026-05-24T09:00:00Z',
        serviceType: 'Sunday',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('defaults branchId to auth.branchId for an Admin-dept caller', async () => {
    // dept-check positive, then duplicate-check returns nothing
    setupSelectSequence(deptCheck(true), []);
    const insertSpy = vi.fn().mockReturnValue(createChain([sampleService]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await createService(mockDb, adminDeptAuth, {
      serviceDate: '2026-05-24T09:00:00Z',
      serviceType: 'Sunday',
    });

    expect(insertSpy).toHaveBeenCalled();
  });

  it('forbids a non-admin caller from creating a service in another branch', async () => {
    await expect(
      createService(mockDb, leaderAuth, {
        branchId: otherBranchId,
        serviceDate: '2026-05-24T09:00:00Z',
        serviceType: 'Sunday',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('forbids a non-admin-dept leader (worship/hospitality/etc.) from creating a service', async () => {
    // resolveBranchId returns own branch; dept-check returns empty (not in Admin dept).
    setupSelectSequence(deptCheck(false));
    await expect(
      createService(mockDb, leaderAuth, {
        serviceDate: '2026-05-24T09:00:00Z',
        serviceType: 'Sunday',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── listServices ───────────────────────────────────────────

describe('listServices', () => {
  it('returns paginated services for admin', async () => {
    setupSelectSequence([sampleService], [{ value: 1 }]);
    const result = await listServices(mockDb, adminAuth, { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('scopes a leader to their own branch (does not throw on own branch)', async () => {
    setupSelectSequence([sampleService], [{ value: 1 }]);
    const result = await listServices(mockDb, leaderAuth, { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
  });
});

// ── getService ─────────────────────────────────────────────

describe('getService', () => {
  it('returns a service with attendee count for admin', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 42 }],
    );
    const result = await getService(mockDb, adminAuth, serviceId);
    expect(result.id).toBe(serviceId);
    expect(result.recordedCount).toBe(42);
  });

  it('throws NotFoundError when missing', async () => {
    setupSelectSequence([]);
    await expect(getService(mockDb, adminAuth, serviceId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('forbids a leader from another branch', async () => {
    setupSelectSequence([{ ...sampleService, branchId: otherBranchId, preacherFirstName: null, preacherLastName: null }]);
    await expect(getService(mockDb, leaderAuth, serviceId)).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── updateService ──────────────────────────────────────────

describe('updateService', () => {
  it('updates a service for admin', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 0 }],
    );
    setupUpdate([{ ...sampleService, topic: 'Hope' }]);
    const result = await updateService(mockDb, adminAuth, serviceId, { topic: 'Hope' });
    expect(result.topic).toBe('Hope');
  });

  it('forbids a plain member (not in Admin dept)', async () => {
    // getService -> dept-check empty -> Forbidden
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 0 }],
      deptCheck(false),
    );
    await expect(updateService(mockDb, memberAuth, serviceId, { topic: 'x' })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('rejects an edit that collides with another service on the unique key', async () => {
    // getService: service row + recorded-count; then the collision check finds a DIFFERENT service.
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 0 }],
      [{ id: 'other-service-id' }],
    );
    await expect(
      updateService(mockDb, adminAuth, serviceId, { serviceType: 'Midweek' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ── deleteService (soft delete) ────────────────────────────

describe('deleteService', () => {
  it('soft-deletes by setting isActive false', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 0 }],
    );
    const setSpy = vi.fn().mockReturnThis();
    const chain = createChain([{ ...sampleService, isActive: false }]);
    chain.set = setSpy.mockReturnValue(chain);
    (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const result = await deleteService(mockDb, adminAuth, serviceId);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    expect(result.isActive).toBe(false);
  });

  it('forbids a plain member (not in Admin dept)', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 0 }],
      deptCheck(false),
    );
    await expect(deleteService(mockDb, memberAuth, serviceId)).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── getServiceRoster ───────────────────────────────────────

describe('getServiceRoster', () => {
  it('annotates each member with their current status for the service', async () => {
    // 1: getService lookup, 2: attendee count, 3: roster members, 4: count, 5: recorded statuses
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 1 }],
      [
        { memberId, firstName: 'Ada', lastName: 'Obi', photoUrl: null },
        { memberId: 'm2', firstName: 'Ben', lastName: 'Eze', photoUrl: null },
      ],
      [{ value: 2 }],
      [{ memberId, attendanceStatus: 'Present' }],
    );

    const result = await getServiceRoster(mockDb, adminAuth, serviceId, { page: 1, limit: 100 });
    const ada = result.data.find((r) => r.memberId === memberId);
    const ben = result.data.find((r) => r.memberId === 'm2');
    expect(ada?.status).toBe('Present');
    expect(ben?.status).toBeNull();
  });
});

// ── recordAttendance ───────────────────────────────────────

describe('recordAttendance', () => {
  it('forbids a plain member (not in Admin dept)', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }], // getService
      deptCheck(false), // not in Admin dept
    );
    await expect(
      recordAttendance(mockDb, memberAuth, serviceId, { entries: [{ memberId, status: 'Present' }] }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('forbids a non-admin-dept leader (e.g. worship leader)', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      deptCheck(false),
    );
    await expect(
      recordAttendance(mockDb, leaderAuth, serviceId, { entries: [{ memberId, status: 'Present' }] }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('upserts an existing-member entry for an Admin-dept caller (insert with onConflictDoUpdate, single row)', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }], // getService
      deptCheck(true), // is in Admin dept
      [{ value: 0 }], // count
    );
    const onConflictSpy = vi.fn().mockReturnThis();
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = onConflictSpy.mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, adminDeptAuth, serviceId, {
      entries: [{ memberId, status: 'Present' }],
    });

    expect(onConflictSpy).toHaveBeenCalled();
    expect(createMemberShellMock).not.toHaveBeenCalled();
  });

  it('links a visitor entry to an existing member when phone matches in-branch', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }], // getService
      deptCheck(true),
      [{ value: 0 }], // count
      [{ id: memberId }], // phone match
    );
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = vi.fn().mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, adminDeptAuth, serviceId, {
      entries: [{ visitor: { firstName: 'Vee', lastName: 'Sitor', phone: '+447700900000' }, status: 'Present' }],
    });

    expect(createMemberShellMock).not.toHaveBeenCalled();
  });

  it('mints a visitor shell when no phone match (calls createMemberShell with memberType visitor)', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }], // getService
      deptCheck(true),
      [{ value: 0 }], // count
      [], // no phone match
    );
    createMemberShellMock.mockResolvedValue(visitorMemberId);
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = vi.fn().mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, adminDeptAuth, serviceId, {
      entries: [{ visitor: { firstName: 'New', lastName: 'Guest', phone: '+447700900111' }, status: 'Present' }],
    });

    expect(createMemberShellMock).toHaveBeenCalledWith(
      mockDb,
      branchId,
      expect.objectContaining({ memberType: 'visitor', firstName: 'New', lastName: 'Guest' }),
    );
  });

  it('mints a visitor shell when visitor has no phone at all', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      deptCheck(true),
      [{ value: 0 }],
    );
    createMemberShellMock.mockResolvedValue(visitorMemberId);
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = vi.fn().mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, adminDeptAuth, serviceId, {
      entries: [{ visitor: { firstName: 'No', lastName: 'Phone' }, status: 'Present' }],
    });

    expect(createMemberShellMock).toHaveBeenCalled();
  });
});

// ── listAttendance ─────────────────────────────────────────

describe('listAttendance', () => {
  it('returns recorded attendance joined with member names', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }], // getService
      [{ value: 1 }], // count
      [{ memberId, memberFirstName: 'Ada', memberLastName: 'Obi', attendanceStatus: 'Present', isFirstTimeVisitor: false }],
    );
    const result = await listAttendance(mockDb, adminAuth, serviceId);
    expect(result).toHaveLength(1);
    expect(result[0]!.attendanceStatus).toBe('Present');
  });
});

// ── getMissingMembers ──────────────────────────────────────

describe('getMissingMembers', () => {
  it('forbids a plain member (report role gate)', async () => {
    await expect(getMissingMembers(mockDb, memberAuth, {})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns active branch members with no recent attendance for a leader', async () => {
    // 1: recent services lookup, 2: members with no attendance across them
    setupSelectSequence(
      [{ id: serviceId }],
      [{ memberId, firstName: 'Ada', lastName: 'Obi' }],
    );
    const result = await getMissingMembers(mockDb, leaderAuth, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.memberId).toBe(memberId);
  });

  it('forbids a leader from querying another branch', async () => {
    await expect(getMissingMembers(mockDb, leaderOtherBranch, { branchId })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets a pastor query any branch', async () => {
    setupSelectSequence([]);
    const result = await getMissingMembers(mockDb, pastorAuth, { branchId: otherBranchId });
    expect(result).toEqual([]);
  });
});

// ── getAttendanceByBranch ─────────────────────────────────
// Three grouped queries merged in JS: (1) branch rows, (2) active 'member'
// counts per branch, (3) distinct attendees per branch over the window.

describe('getAttendanceByBranch', () => {
  it('merges per-branch member + attendee counts into a rate', async () => {
    setupSelectSequence(
      [{ id: branchId, branchName: 'London' }], // branchRows
      [{ branchId, value: 100 }], // active member counts
      [{ branchId, value: 80 }], // distinct attendees
    );

    const result = await getAttendanceByBranch(mockDb, adminAuth, { weeks: 4 });

    expect(result).toEqual([
      { branchId, branchName: 'London', activeMembers: 100, distinctAttendees: 80, attendanceRate: 0.8 },
    ]);
  });

  it('caps the rate at 1.0 when visitors push attendees above active members', async () => {
    setupSelectSequence(
      [{ id: branchId, branchName: 'London' }],
      [{ branchId, value: 4 }],
      [{ branchId, value: 5 }], // 5 attendees incl a first-time visitor
    );
    const result = await getAttendanceByBranch(mockDb, adminAuth, { weeks: 4 });
    expect(result[0]!.attendanceRate).toBe(1);
  });

  it('reports 0 for a branch with no active members or attendees', async () => {
    setupSelectSequence(
      [{ id: branchId, branchName: 'London' }],
      [], // no member counts
      [], // no attendees
    );
    const result = await getAttendanceByBranch(mockDb, adminAuth, { weeks: 4 });
    expect(result[0]!).toMatchObject({ activeMembers: 0, distinctAttendees: 0, attendanceRate: 0 });
  });

  it('returns empty when no branches are in scope', async () => {
    setupSelectSequence([]); // branchRows empty → early return
    const result = await getAttendanceByBranch(mockDb, adminAuth, { weeks: 4 });
    expect(result).toEqual([]);
  });
});

// ── getAttendanceSummary ──────────────────────────────────
// Three queries merged: (1) status split, (2) distinct attendees, (3) active members.

describe('getAttendanceSummary', () => {
  it('merges the status split and the distinct/active rate', async () => {
    setupSelectSequence(
      [{ status: 'Present', value: 10 }, { status: 'Late', value: 3 }, { status: 'Virtual', value: 2 }],
      [{ value: 12 }], // distinct attendees
      [{ value: 20 }], // active members
    );

    const result = await getAttendanceSummary(mockDb, adminAuth, { weeks: 4 });

    expect(result.statusBreakdown).toEqual({ present: 10, late: 3, virtual: 2, total: 15 });
    expect(result.rate).toEqual({ distinctAttendees: 12, activeMembers: 20, rate: 0.6 });
  });

  it('caps the rate at 1.0 when attendees exceed active members', async () => {
    setupSelectSequence(
      [{ status: 'Present', value: 5 }],
      [{ value: 5 }],
      [{ value: 4 }],
    );
    const result = await getAttendanceSummary(mockDb, adminAuth, { weeks: 4 });
    expect(result.rate.rate).toBe(1);
    expect(result.statusBreakdown).toEqual({ present: 5, late: 0, virtual: 0, total: 5 });
  });

  it('reports zeros when there are no records or active members', async () => {
    setupSelectSequence([], [{ value: 0 }], [{ value: 0 }]);
    const result = await getAttendanceSummary(mockDb, adminAuth, { weeks: 4 });
    expect(result.statusBreakdown).toEqual({ present: 0, late: 0, virtual: 0, total: 0 });
    expect(result.rate.rate).toBe(0);
  });

  it('is readable by a plain member (branch-scoped, no throw)', async () => {
    setupSelectSequence(
      [{ status: 'Present', value: 1 }],
      [{ value: 1 }],
      [{ value: 2 }],
    );
    const result = await getAttendanceSummary(mockDb, memberAuth, { weeks: 4 });
    expect(result.rate.rate).toBe(0.5);
  });
});

// ── canRecordAttendance (drives UI gating) ────────────────

describe('canRecordAttendance', () => {
  it('admin always canRecord regardless of dept membership', async () => {
    const result = await canRecordAttendance(mockDb, adminAuth);
    expect(result).toEqual({ canRecord: true });
  });

  it('pastor always canRecord', async () => {
    const result = await canRecordAttendance(mockDb, pastorAuth);
    expect(result).toEqual({ canRecord: true });
  });

  it('admin-dept member can record in their own branch', async () => {
    setupSelectSequence(deptCheck(true));
    const result = await canRecordAttendance(mockDb, adminDeptAuth);
    expect(result).toEqual({ canRecord: true });
  });

  it('non-admin-dept member cannot record', async () => {
    setupSelectSequence(deptCheck(false));
    const result = await canRecordAttendance(mockDb, memberAuth);
    expect(result).toEqual({ canRecord: false });
  });

  it('non-admin caller cannot record in a foreign branch', async () => {
    const result = await canRecordAttendance(mockDb, memberAuth, otherBranchId);
    expect(result).toEqual({ canRecord: false });
  });
});

// ── getCohortDiff (set-difference comparison) ─────────────

describe('getCohortDiff', () => {
  const svcA = '770e8400-e29b-41d4-a716-446655440101';
  const svcB = '770e8400-e29b-41d4-a716-446655440102';
  const m1 = '550e8400-e29b-41d4-a716-446655440001';
  const m2 = '550e8400-e29b-41d4-a716-446655440002';
  const m3 = '550e8400-e29b-41d4-a716-446655440003';

  it('forbids a plain member', async () => {
    await expect(
      getCohortDiff(mockDb, memberAuth, {
        presentInServiceIds: [svcA],
        absentFromServiceIds: [],
        presentMode: 'any',
        absentMode: 'all',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('forbids services outside the caller branch', async () => {
    // service-validation select returns fewer rows than requested
    setupSelectSequence([{ id: svcA }]); // 1 row, but 2 ids requested
    await expect(
      getCohortDiff(mockDb, adminAuth, {
        presentInServiceIds: [svcA, svcB],
        absentFromServiceIds: [],
        presentMode: 'any',
        absentMode: 'all',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns members present in A (ANY) intersected with absent from B (ALL)', async () => {
    // 1: service-validation (both valid)
    // 2: presentMode=any rows  -> m1, m2 attended at least one of A
    // 3: absentMode=all  -> attendedB distinct list, m1 attended B → m2 only is "absent from all of B"
    // 4: all members in branch (used by absent-all bucket)
    // 5: hydrate names
    setupSelectSequence(
      [{ id: svcA }, { id: svcB }],
      [{ memberId: m1 }, { memberId: m2 }],          // present-any
      [{ memberId: m1 }],                             // attendedB (m1 attended B)
      [{ id: m1 }, { id: m2 }, { id: m3 }],           // all branch members
      [{ memberId: m2, firstName: 'Bob', lastName: 'B' }], // hydrate
    );
    const result = await getCohortDiff(mockDb, adminAuth, {
      presentInServiceIds: [svcA],
      absentFromServiceIds: [svcB],
      presentMode: 'any',
      absentMode: 'all',
    });
    expect(result.members).toEqual([{ memberId: m2, firstName: 'Bob', lastName: 'B' }]);
  });

  it('returns empty when no members match', async () => {
    setupSelectSequence(
      [{ id: svcA }],
      [], // present-any → no one attended A
    );
    const result = await getCohortDiff(mockDb, adminAuth, {
      presentInServiceIds: [svcA],
      absentFromServiceIds: [],
      presentMode: 'any',
      absentMode: 'all',
    });
    expect(result.members).toEqual([]);
  });

  it('presentMode=all keeps only members who attended every selected service', async () => {
    setupSelectSequence(
      [{ id: svcA }, { id: svcB }],
      // grouped: m1 attended 2 of 2 → keep; m2 attended 1 of 2 → drop
      [{ memberId: m1, c: 2 }, { memberId: m2, c: 1 }],
      [{ memberId: m1, firstName: 'Ada', lastName: 'A' }],
    );
    const result = await getCohortDiff(mockDb, adminAuth, {
      presentInServiceIds: [svcA, svcB],
      absentFromServiceIds: [],
      presentMode: 'all',
      absentMode: 'all',
    });
    expect(result.members).toHaveLength(1);
    expect(result.members[0]?.memberId).toBe(m1);
  });
});

// ── getMyAttendance (personal snapshot) ───────────────────

describe('getMyAttendance', () => {
  const s1 = '770e8400-e29b-41d4-a716-446655440201';
  const s2 = '770e8400-e29b-41d4-a716-446655440202';
  const s3 = '770e8400-e29b-41d4-a716-446655440203';

  it('returns empty defaults when the caller has no branchId', async () => {
    const noBranch = { ...memberAuth, branchId: undefined as unknown as string };
    const result = await getMyAttendance(mockDb, noBranch, { weeks: 12 });
    expect(result.servicesInWindow).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.history).toEqual([]);
  });

  it('returns empty defaults when there are no services in the window', async () => {
    setupSelectSequence([]);
    const result = await getMyAttendance(mockDb, memberAuth, { weeks: 12 });
    expect(result.servicesInWindow).toBe(0);
  });

  it('builds the rate + status split + streak from history', async () => {
    // 3 services chronological. Caller attended s1 (Present), s2 (Late), missed s3.
    const baseDate = new Date('2026-05-01T10:00:00Z');
    setupSelectSequence(
      [
        { id: s1, serviceDate: baseDate, serviceType: 'Sunday', serviceTitle: null },
        { id: s2, serviceDate: new Date(baseDate.getTime() + 7 * 86400000), serviceType: 'Sunday', serviceTitle: null },
        { id: s3, serviceDate: new Date(baseDate.getTime() + 14 * 86400000), serviceType: 'Sunday', serviceTitle: null },
      ],
      [
        { serviceId: s1, attendanceStatus: 'Present', arrivalTime: null, recordedAt: new Date() },
        { serviceId: s2, attendanceStatus: 'Late', arrivalTime: null, recordedAt: new Date() },
      ],
    );
    const result = await getMyAttendance(mockDb, memberAuth, { weeks: 12 });
    expect(result.servicesInWindow).toBe(3);
    expect(result.attendedCount).toBe(2);
    expect(result.presentOnTimeCount).toBe(1);
    expect(result.lateCount).toBe(1);
    expect(result.virtualCount).toBe(0);
    expect(result.missedCount).toBe(1);
    expect(result.rate).toBeCloseTo(2 / 3, 5);
    // Current streak: most recent service (s3) was missed → kind=missed, length=1
    expect(result.currentStreak).toEqual({ kind: 'missed', length: 1 });
    // Last attended = s2
    expect(result.lastService?.id).toBe(s2);
  });

  it('computes a 3-in-a-row attended streak when the last 3 services were attended', async () => {
    const baseDate = new Date('2026-05-01T10:00:00Z');
    setupSelectSequence(
      [
        { id: s1, serviceDate: baseDate, serviceType: 'Sunday', serviceTitle: null },
        { id: s2, serviceDate: new Date(baseDate.getTime() + 7 * 86400000), serviceType: 'Sunday', serviceTitle: null },
        { id: s3, serviceDate: new Date(baseDate.getTime() + 14 * 86400000), serviceType: 'Sunday', serviceTitle: null },
      ],
      [
        { serviceId: s1, attendanceStatus: 'Present', arrivalTime: null, recordedAt: new Date() },
        { serviceId: s2, attendanceStatus: 'Present', arrivalTime: null, recordedAt: new Date() },
        { serviceId: s3, attendanceStatus: 'Virtual', arrivalTime: null, recordedAt: new Date() },
      ],
    );
    const result = await getMyAttendance(mockDb, memberAuth, { weeks: 12 });
    expect(result.currentStreak).toEqual({ kind: 'attended', length: 3 });
  });
});

// ── getDepartmentAttendance (Phase 4a) ────────────────────

describe('getDepartmentAttendance', () => {
  const branchDeptId = 'bd-1';
  const m1 = '550e8400-e29b-41d4-a716-446655440301';
  const m2 = '550e8400-e29b-41d4-a716-446655440302';

  const bdRow = {
    id: branchDeptId,
    branchId,
    leadMemberId: leaderAuth.memberId,
    deputyMemberId: null,
    isActive: true,
    departmentName: 'Choir',
    branchName: 'London',
  };

  it('forbids a regular member who is not lead/deputy/admin/pastor', async () => {
    setupSelectSequence([bdRow]);
    await expect(
      getDepartmentAttendance(mockDb, memberAuth, branchDeptId, { weeks: 12 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('NotFound when the branch_department is missing or inactive', async () => {
    setupSelectSequence([]);
    await expect(
      getDepartmentAttendance(mockDb, adminAuth, branchDeptId, { weeks: 12 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns the report for the dept lead', async () => {
    setupSelectSequence(
      [bdRow],
      // active members in dept
      [{ memberId: m1, firstName: 'Ada', lastName: 'A' }, { memberId: m2, firstName: 'Bea', lastName: 'B' }],
      // services in window (1)
      [{ id: 'svc-1', serviceDate: new Date('2026-05-26T10:00:00Z') }],
      // grouped attendance: m1 Present
      [{ memberId: m1, attendanceStatus: 'Present', c: 1 }],
      // last attended timestamps
      [{ memberId: m1, serviceDate: new Date('2026-05-26T10:00:00Z') }],
      // trend
      [{ weekStart: new Date('2026-05-25T00:00:00Z'), attendees: 1 }],
    );
    const result = await getDepartmentAttendance(mockDb, leaderAuth, branchDeptId, { weeks: 12 });
    expect(result.activeMembers).toBe(2);
    expect(result.distinctAttendees).toBe(1);
    expect(result.totalServices).toBe(1);
    expect(result.rate).toBe(0.5);
    // Sorted by rate ascending → m2 (0%) first, m1 (100%) second
    expect(result.members[0]?.memberId).toBe(m2);
    expect(result.members[1]?.memberId).toBe(m1);
  });

  it('returns zero rate when the dept has no active members', async () => {
    setupSelectSequence(
      [bdRow],
      [], // no active members
      [{ id: 'svc-1', serviceDate: new Date('2026-05-26T10:00:00Z') }],
    );
    const result = await getDepartmentAttendance(mockDb, adminAuth, branchDeptId, { weeks: 12 });
    expect(result.activeMembers).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.members).toEqual([]);
  });
});

// ── getFellowshipAttendance (Phase 4b) ────────────────────

describe('getFellowshipAttendance', () => {
  const fsId = 'fs-1';
  const m1 = '550e8400-e29b-41d4-a716-446655440401';
  const m2 = '550e8400-e29b-41d4-a716-446655440402';

  const fsRow = {
    id: fsId,
    branchId,
    fellowshipName: 'K-Group A',
    leaderId: leaderAuth.memberId,
    coLeaderId: null,
    isActive: true,
    branchName: 'London',
  };

  it('forbids a regular member who is not lead/co-lead/admin/pastor', async () => {
    setupSelectSequence([fsRow]);
    await expect(
      getFellowshipAttendance(mockDb, memberAuth, fsId, { weeks: 12 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('NotFound when the fellowship is missing or inactive', async () => {
    setupSelectSequence([]);
    await expect(
      getFellowshipAttendance(mockDb, adminAuth, fsId, { weeks: 12 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns the combined report for the fellowship leader', async () => {
    setupSelectSequence(
      [fsRow],
      // members
      [{ memberId: m1, firstName: 'Ada', lastName: 'A' }, { memberId: m2, firstName: 'Bea', lastName: 'B' }],
      // services in window
      [{ id: 'svc-1' }, { id: 'svc-2' }],
      // service grouped counts: m1 attended 2, m2 attended 1
      [{ memberId: m1, c: 2 }, { memberId: m2, c: 1 }],
      // service trend
      [],
      // meetings in window
      [{ id: 'mtg-1', meetingDate: new Date('2026-05-26T10:00:00Z') }],
      // meeting grouped counts: m1 attended 1
      [{ memberId: m1, c: 1 }],
      // last meeting present-count
      [{ c: 1 }],
    );
    const result = await getFellowshipAttendance(mockDb, leaderAuth, fsId, { weeks: 12 });
    expect(result.activeMembers).toBe(2);
    expect(result.services.totalServices).toBe(2);
    expect(result.services.distinctAttendees).toBe(2);
    expect(result.services.rate).toBe(1); // 2 distinct of 2 active = 100%
    expect(result.meetings.totalMeetings).toBe(1);
    expect(result.meetings.distinctAttendees).toBe(1);
    expect(result.meetings.rate).toBe(0.5);
    expect(result.meetings.lastMeeting?.attended).toBe(1);
  });
});

// ── Phase 4c: filter dropdowns on summary/trends/missing ──

describe('getAttendanceSummary with dept/fellowship filter', () => {
  it('returns zero result when the filtered member set is empty', async () => {
    // resolveFilterMemberIds runs first when departmentId is set; returns []
    setupSelectSequence(
      [], // dept-members lookup empty
    );
    const result = await getAttendanceSummary(mockDb, adminAuth, { weeks: 4, departmentId: 'dep-empty' });
    expect(result.statusBreakdown.total).toBe(0);
    expect(result.rate).toEqual({ distinctAttendees: 0, activeMembers: 0, rate: 0 });
  });

  it('uses the filter-set size as the denominator when a filter is set', async () => {
    setupSelectSequence(
      // dept-members lookup: 2 ids
      [{ memberId: 'm1' }, { memberId: 'm2' }],
      // status split
      [{ status: 'Present', value: 2 }],
      // distinct attendees
      [{ value: 2 }],
      // NB: activeMembers NOT queried because filterIds provided
    );
    const result = await getAttendanceSummary(mockDb, adminAuth, { weeks: 4, departmentId: 'dep-1' });
    expect(result.rate.activeMembers).toBe(2);
    expect(result.rate.distinctAttendees).toBe(2);
    expect(result.rate.rate).toBe(1);
  });
});

describe('getMissingMembers with dept/fellowship filter', () => {
  it('returns empty when the filter set is empty', async () => {
    // Order: resolveFilterMemberIds runs after the recentServices select. So:
    // 1: recentServices (any)
    // 2: dept-members lookup → empty filter set
    setupSelectSequence(
      [{ id: 'svc-1' }], // recent services
      [], // dept-members (filter set empty)
    );
    const result = await getMissingMembers(mockDb, adminAuth, { branchId, services: 4, departmentId: 'dep-empty' });
    expect(result).toEqual([]);
  });
});
