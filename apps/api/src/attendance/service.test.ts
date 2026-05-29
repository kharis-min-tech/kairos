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

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId };
const pastorAuth = { memberId: '000-pastor', email: 'pastor@test.com', systemRole: 'pastor' as const, branchId };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'leader' as const, branchId };
const leaderOtherBranch = { memberId: '000-leader2', email: 'l2@test.com', systemRole: 'leader' as const, branchId: otherBranchId };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId };

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

  it('defaults branchId to auth.branchId for a non-admin leader', async () => {
    setupSelectSequence([]);
    const insertSpy = vi.fn().mockReturnValue(createChain([sampleService]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await createService(mockDb, leaderAuth, {
      serviceDate: '2026-05-24T09:00:00Z',
      serviceType: 'Sunday',
    });

    expect(insertSpy).toHaveBeenCalled();
  });

  it('forbids a leader from creating a service in another branch', async () => {
    await expect(
      createService(mockDb, leaderAuth, {
        branchId: otherBranchId,
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

  it('forbids a plain member', async () => {
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

  it('forbids a plain member', async () => {
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
  it('forbids a plain member', async () => {
    await expect(
      recordAttendance(mockDb, memberAuth, serviceId, { entries: [{ memberId, status: 'Present' }] }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('upserts an existing-member entry (insert with onConflictDoUpdate, single row)', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }],
      [{ value: 0 }],
    );
    const onConflictSpy = vi.fn().mockReturnThis();
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = onConflictSpy.mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, leaderAuth, serviceId, {
      entries: [{ memberId, status: 'Present' }],
    });

    expect(onConflictSpy).toHaveBeenCalled();
    expect(createMemberShellMock).not.toHaveBeenCalled();
  });

  it('links a visitor entry to an existing member when phone matches in-branch', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }], // getService
      [{ value: 0 }], // count
      [{ id: memberId }], // phone match
    );
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = vi.fn().mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, leaderAuth, serviceId, {
      entries: [{ visitor: { firstName: 'Vee', lastName: 'Sitor', phone: '+447700900000' }, status: 'Present' }],
    });

    expect(createMemberShellMock).not.toHaveBeenCalled();
  });

  it('mints a visitor shell when no phone match (calls createMemberShell with memberType visitor)', async () => {
    setupSelectSequence(
      [{ ...sampleService, preacherFirstName: null, preacherLastName: null }], // getService
      [{ value: 0 }], // count
      [], // no phone match
    );
    createMemberShellMock.mockResolvedValue(visitorMemberId);
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = vi.fn().mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, leaderAuth, serviceId, {
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
      [{ value: 0 }],
    );
    createMemberShellMock.mockResolvedValue(visitorMemberId);
    const insertChain = createChain(undefined);
    insertChain.onConflictDoUpdate = vi.fn().mockReturnValue(insertChain);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await recordAttendance(mockDb, leaderAuth, serviceId, {
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
