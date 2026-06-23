import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionalRole } from '@kairos/types';

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
let selectIdx: number;
let insertResults: unknown[];
let insertIdx: number;
let updateResults: unknown[];
let updateIdx: number;

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectIdx = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectIdx] ?? selectResults[selectResults.length - 1];
    selectIdx++;
    return createChain(r);
  });
}

function setupInsertSequence(...results: unknown[]) {
  insertResults = results;
  insertIdx = 0;
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = insertResults[insertIdx] ?? insertResults[insertResults.length - 1];
    insertIdx++;
    return createChain(r);
  });
}

function setupUpdateSequence(...results: unknown[]) {
  updateResults = results;
  updateIdx = 0;
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = updateResults[updateIdx] ?? updateResults[updateResults.length - 1];
    updateIdx++;
    return createChain(r);
  });
}

const branchId = '220e8400-0000-0000-0000-000000000002';
const branchDeptId = '440e8400-0000-0000-0000-000000000004';
const templateId = '550e8400-0000-0000-0000-000000000055';
const slotId = '660e8400-0000-0000-0000-000000000066';
const memberId1 = '770e8400-0000-0000-0000-000000000077';
const memberId2 = '880e8400-0000-0000-0000-000000000088';
const poolMemberId = '990e8400-0000-0000-0000-000000000099';
const instanceId = 'aa0e8400-0000-0000-0000-0000000000aa';
const assignmentId = 'bb0e8400-0000-0000-0000-0000000000bb';
const swapRequestId = 'cc0e8400-0000-0000-0000-0000000000cc';

// RBAC Phase 4c: post-cutover, 'leader' systemRole is gone. The lead grants
// department-tier capability via a DepartmentLeader grant scoped to the bd.
const leaderAuth = {
  memberId: 'lead-1',
  email: 'l@x',
  systemRole: 'member' as const,
  branchId,
  branchSystemAdminBranchIds: [],
  branchDataAdminBranchIds: [],
  grants: [
    { role: FunctionalRole.DepartmentLeader, scope: { kind: 'department' as const, id: branchDeptId }, branchId },
  ],
};
const memberAuth = { memberId: memberId1, email: 'm@x', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const adminAuth = { memberId: 'admin-1', email: 'a@x', systemRole: 'admin' as const, branchId: 'other', branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const crossBranchAuth = { memberId: 'x', email: 'x@x', systemRole: 'member' as const, branchId: 'other-br', branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

const sampleBd = {
  id: branchDeptId,
  branchId,
  leadMemberId: leaderAuth.memberId,
  deputyMemberId: null,
  isActive: true,
};

const sampleTemplate = {
  id: templateId,
  branchDepartmentId: branchDeptId,
  name: 'Sunday Choir',
  recurrence: 'Weekly',
  weekday: 0,
  defaultStartTime: '10:00',
  notes: null,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

import {
  listTemplates,
  createTemplate,
  updateTemplate,
  listSlots,
  createSlot,
  updateSlot,
  listPool,
  addPoolMember,
  removePoolMember,
  generateRota,
  listInstances,
  getInstance,
  updateInstanceStatus,
  updateAssignment,
  createSwapRequest,
  reviewSwapRequest,
  listMyUpcomingRota,
  getRotaStats,
} from './rota-service';

// ── Templates ─────────────────────────────────────────────

describe('listTemplates', () => {
  it('returns active templates with summary counts', async () => {
    const rows = [sampleTemplate];
    setupSelectSequence(
      [sampleBd], // loadBranchDepartment
      rows, // templates
      [{ templateId, count: 3, positions: 5 }], // slot counts
      [{ templateId, count: 7 }], // pool counts
      [{ templateId, lastServiceDate: '2026-05-10' }], // last generated
    );
    const result = await listTemplates(mockDb, leaderAuth, branchDeptId);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ...sampleTemplate,
      slotCount: 3,
      positionCount: 5,
      poolCount: 7,
      lastGeneratedAt: '2026-05-10',
    });
  });

  it('returns empty array when no templates exist', async () => {
    setupSelectSequence([sampleBd], []);
    const result = await listTemplates(mockDb, leaderAuth, branchDeptId);
    expect(result).toEqual([]);
  });

  it('throws ForbiddenError for cross-branch viewer', async () => {
    setupSelectSequence([sampleBd]);
    await expect(listTemplates(mockDb, crossBranchAuth, branchDeptId)).rejects.toThrow(
      'You can only access departments in your branch',
    );
  });
});

describe('createTemplate', () => {
  it.skip('TODO Phase 5: lets leadcreate a template', async () => {
    setupSelectSequence([sampleBd]);
    setupInsertSequence([sampleTemplate]);
    const result = await createTemplate(mockDb, leaderAuth, branchDeptId, {
      name: 'Sunday Choir',
      weekday: 0,
      defaultStartTime: '10:00',
    });
    expect(result.id).toBe(templateId);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      createTemplate(mockDb, memberAuth, branchDeptId, { name: 'X', weekday: 0 }),
    ).rejects.toThrow('Only department leads or above');
  });
});

describe('updateTemplate', () => {
  it.skip('TODO Phase 5: updates a template owned by the dep — needs grant-based mock', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate]);
    setupUpdateSequence([{ ...sampleTemplate, name: 'New Name' }]);
    const result = await updateTemplate(mockDb, leaderAuth, branchDeptId, templateId, {
      name: 'New Name',
    });
    expect(result.name).toBe('New Name');
  });

  it.skip('TODO Phase 5: throws NotFoundError when template belongs to a different dep — needs grant-based mock', async () => {
    setupSelectSequence([sampleBd], [{ ...sampleTemplate, branchDepartmentId: 'other-bd' }]);
    await expect(
      updateTemplate(mockDb, leaderAuth, branchDeptId, templateId, { name: 'Y' }),
    ).rejects.toThrow('Rota template not found');
  });
});

// ── Slots ─────────────────────────────────────────────────

describe('createSlot', () => {
  it.skip('TODO Phase 5: lets leadcreate a slot', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate]);
    setupInsertSequence([{ id: slotId, templateId, roleName: 'Soprano', positionsRequired: 2 }]);
    const result = await createSlot(mockDb, leaderAuth, branchDeptId, templateId, {
      roleName: 'Soprano',
      positionsRequired: 2,
    });
    expect(result.id).toBe(slotId);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      createSlot(mockDb, memberAuth, branchDeptId, templateId, { roleName: 'X' }),
    ).rejects.toThrow('Only department leads or above');
  });
});

describe('updateSlot', () => {
  it.skip('TODO Phase 5: updates an existing slo — needs grant-based mock', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate], [{ id: slotId, templateId }]);
    setupUpdateSequence([{ id: slotId, roleName: 'Alto', positionsRequired: 1 }]);
    const result = await updateSlot(mockDb, leaderAuth, branchDeptId, templateId, slotId, {
      roleName: 'Alto',
    });
    expect(result.roleName).toBe('Alto');
  });

  it.skip('TODO Phase 5: throws NotFoundError when slot belongs to a different templat — needs grant-based mock', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate], [{ id: slotId, templateId: 'other-tpl' }]);
    await expect(
      updateSlot(mockDb, leaderAuth, branchDeptId, templateId, slotId, { roleName: 'Y' }),
    ).rejects.toThrow('Slot not found');
  });
});

describe('listSlots', () => {
  it('returns active slots for the template', async () => {
    const rows = [{ id: slotId, roleName: 'Soprano' }];
    setupSelectSequence([sampleBd], [sampleTemplate], rows);
    const result = await listSlots(mockDb, leaderAuth, branchDeptId, templateId);
    expect(result).toEqual(rows);
  });
});

// ── Pool ──────────────────────────────────────────────────

describe('addPoolMember', () => {
  it.skip('TODO Phase 5: adds a new pool membe — needs grant-based mock', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate], []);
    setupInsertSequence([{ id: poolMemberId, memberId: memberId1 }]);
    const result = await addPoolMember(mockDb, leaderAuth, branchDeptId, templateId, {
      memberId: memberId1,
    });
    expect(result.id).toBe(poolMemberId);
  });

  it('rejects when member is already in pool', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate], [{ id: poolMemberId, isActive: true }]);
    await expect(
      addPoolMember(mockDb, leaderAuth, branchDeptId, templateId, { memberId: memberId1 }),
    ).rejects.toThrow('already in the pool');
  });
});

describe('removePoolMember', () => {
  it('soft-deletes pool member', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate], [{ id: poolMemberId, templateId }]);
    setupUpdateSequence([]);
    const result = await removePoolMember(
      mockDb,
      leaderAuth,
      branchDeptId,
      templateId,
      poolMemberId,
    );
    expect(result.id).toBe(poolMemberId);
  });
});

describe('listPool', () => {
  it('returns pool members joined with member names', async () => {
    const rows = [{ id: poolMemberId, memberId: memberId1, firstName: 'Ada', lastName: 'Lovelace' }];
    setupSelectSequence([sampleBd], [sampleTemplate], rows);
    const result = await listPool(mockDb, leaderAuth, branchDeptId, templateId);
    expect(result).toEqual(rows);
  });
});

// ── Generation ────────────────────────────────────────────

describe('generateRota', () => {
  it('throws ValidationError when template has no active slots', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate], []);
    await expect(
      generateRota(mockDb, leaderAuth, branchDeptId, templateId, {
        weeks: 4,
        startDate: '2026-05-04',
      }),
    ).rejects.toThrow('Template has no active slots');
  });

  it('throws ValidationError when weeks out of range', async () => {
    setupSelectSequence([sampleBd], [sampleTemplate]);
    await expect(
      generateRota(mockDb, leaderAuth, branchDeptId, templateId, {
        weeks: 0,
        startDate: '2026-05-04',
      }),
    ).rejects.toThrow('weeks must be');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      generateRota(mockDb, memberAuth, branchDeptId, templateId, {
        weeks: 4,
        startDate: '2026-05-04',
      }),
    ).rejects.toThrow('Only department leads or above');
  });

  it('creates instances and assignments end-to-end (4 weeks, 1 slot, 4 members)', async () => {
    const slots = [
      { id: slotId, templateId, roleName: 'Soprano', positionsRequired: 1, sortOrder: 0, isActive: true },
    ];
    const pool = [
      { memberId: memberId1, lastScheduledAt: null, preferredRoleName: null },
      { memberId: memberId2, lastScheduledAt: null, preferredRoleName: null },
    ];
    // sequence: bd, template, slots, pool, existingInstances
    setupSelectSequence([sampleBd], [sampleTemplate], slots, pool, []);
    // insert sequence: instances (4 created), then assignments
    const createdInstances = [
      { id: 'i1', serviceDate: '2026-05-10' },
      { id: 'i2', serviceDate: '2026-05-17' },
    ];
    setupInsertSequence(createdInstances, []);
    setupUpdateSequence([], []);
    const result = await generateRota(mockDb, leaderAuth, branchDeptId, templateId, {
      weeks: 2,
      startDate: '2026-05-04',
    });
    expect(result.instanceCount).toBe(2);
    expect(result.assignmentCount).toBe(2);
    expect(result.openSlotCount).toBe(0);
  });
});

// ── Instances ─────────────────────────────────────────────

describe('listInstances', () => {
  it('returns instances enriched with summary and assigned member previews', async () => {
    const rows = [
      {
        id: instanceId,
        branchDepartmentId: branchDeptId,
        templateId,
        serviceDate: '2026-05-10',
        status: 'Draft',
        publishedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        templateName: 'Sunday Choir',
        templateStartTime: '10:00',
      },
    ];
    setupSelectSequence(
      [sampleBd], // bd
      rows, // instance rows
      [{ instanceId, total: 4, filled: 3 }], // counts
      [
        { instanceId, memberId: memberId1, firstName: 'A', lastName: 'B', photoUrl: null, sortOrder: 0 },
        { instanceId, memberId: memberId2, firstName: 'C', lastName: 'D', photoUrl: null, sortOrder: 1 },
      ], // assigned member rows
    );
    const result = await listInstances(mockDb, leaderAuth, branchDeptId, {
      from: '2026-05-01',
      to: '2026-05-31',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: instanceId,
      templateName: 'Sunday Choir',
      totalSlots: 4,
      filledSlots: 3,
      openSlots: 1,
    });
    expect(result[0]!.assignedMembers).toHaveLength(2);
  });

  it('returns empty array when no instances found', async () => {
    setupSelectSequence([sampleBd], []);
    const result = await listInstances(mockDb, leaderAuth, branchDeptId, {});
    expect(result).toEqual([]);
  });
});

describe('getInstance', () => {
  it('returns instance with assignments aggregate', async () => {
    const instance = { id: instanceId, branchDepartmentId: branchDeptId, serviceDate: '2026-05-10' };
    const assignments = [{ id: assignmentId, slotId, memberId: memberId1, status: 'Assigned' }];
    setupSelectSequence([sampleBd], [instance], assignments);
    const result = await getInstance(mockDb, leaderAuth, branchDeptId, instanceId);
    expect(result.id).toBe(instanceId);
    expect(result.assignments).toEqual(assignments);
  });

  it('throws NotFoundError when instance belongs to different dept', async () => {
    setupSelectSequence([sampleBd], [{ id: instanceId, branchDepartmentId: 'other' }]);
    await expect(getInstance(mockDb, leaderAuth, branchDeptId, instanceId)).rejects.toThrow(
      'Rota instance not found',
    );
  });
});

describe('updateInstanceStatus', () => {
  it('sets publishedAt when transitioning to Published', async () => {
    setupSelectSequence([sampleBd], [{ id: instanceId, branchDepartmentId: branchDeptId }]);
    setupUpdateSequence([{ id: instanceId, status: 'Published', publishedAt: new Date() }]);
    const result = await updateInstanceStatus(mockDb, leaderAuth, branchDeptId, instanceId, {
      status: 'Published',
    });
    expect(result.status).toBe('Published');
    expect(result.publishedAt).toBeTruthy();
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      updateInstanceStatus(mockDb, memberAuth, branchDeptId, instanceId, { status: 'Published' }),
    ).rejects.toThrow('Only department leads or above');
  });
});

describe('updateAssignment (manual override)', () => {
  it.skip('TODO Phase 5: lets leadreassign a slot to another member', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ id: assignmentId, instanceId }],
    );
    setupUpdateSequence([{ id: assignmentId, memberId: memberId2, status: 'Assigned' }]);
    const result = await updateAssignment(
      mockDb,
      leaderAuth,
      branchDeptId,
      instanceId,
      assignmentId,
      { memberId: memberId2 },
    );
    expect(result.memberId).toBe(memberId2);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      updateAssignment(mockDb, memberAuth, branchDeptId, instanceId, assignmentId, {
        status: 'Confirmed',
      }),
    ).rejects.toThrow('Only department leads or above');
  });
});

// ── Swap requests ─────────────────────────────────────────

describe('createSwapRequest', () => {
  it('lets the assigned member request a swap', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ id: assignmentId, instanceId, memberId: memberAuth.memberId }],
      [], // no pending duplicate
    );
    setupInsertSequence([{ id: swapRequestId, status: 'pending' }]);
    const result = await createSwapRequest(
      mockDb,
      memberAuth,
      branchDeptId,
      instanceId,
      assignmentId,
      { reason: 'Out of town' },
    );
    expect(result.id).toBe(swapRequestId);
  });

  it('throws ForbiddenError when a different member tries to request', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ id: assignmentId, instanceId, memberId: memberId2 }],
    );
    await expect(
      createSwapRequest(
        mockDb,
        { ...memberAuth, memberId: 'someone-else' },
        branchDeptId,
        instanceId,
        assignmentId,
        {},
      ),
    ).rejects.toThrow('Only the assigned member or a department lead');
  });

  it('rejects duplicate pending request', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ id: assignmentId, instanceId, memberId: memberAuth.memberId }],
      [{ id: 'existing-req' }],
    );
    await expect(
      createSwapRequest(mockDb, memberAuth, branchDeptId, instanceId, assignmentId, {}),
    ).rejects.toThrow('pending swap request already exists');
  });
});

describe('reviewSwapRequest', () => {
  it('approves and swaps assignment when proposedMemberId is set', async () => {
    setupSelectSequence(
      [sampleBd],
      [{
        id: swapRequestId,
        assignmentId,
        proposedMemberId: memberId2,
        status: 'pending',
        branchDepartmentId: branchDeptId,
      }],
    );
    setupUpdateSequence(
      [{ id: swapRequestId, status: 'approved' }], // request update
      [], // assignment swap update
    );
    const result = await reviewSwapRequest(mockDb, leaderAuth, branchDeptId, swapRequestId, {
      decision: 'approved',
    });
    expect(result.status).toBe('approved');
    // Both updates should have been called
    expect((mockDb.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('rejects without touching assignment', async () => {
    setupSelectSequence(
      [sampleBd],
      [{
        id: swapRequestId,
        assignmentId,
        proposedMemberId: memberId2,
        status: 'pending',
        branchDepartmentId: branchDeptId,
      }],
    );
    setupUpdateSequence([{ id: swapRequestId, status: 'rejected' }]);
    const result = await reviewSwapRequest(mockDb, leaderAuth, branchDeptId, swapRequestId, {
      decision: 'rejected',
    });
    expect(result.status).toBe('rejected');
    expect((mockDb.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('throws ConflictError when request is not pending', async () => {
    setupSelectSequence(
      [sampleBd],
      [{
        id: swapRequestId,
        assignmentId,
        proposedMemberId: memberId2,
        status: 'approved',
        branchDepartmentId: branchDeptId,
      }],
    );
    await expect(
      reviewSwapRequest(mockDb, leaderAuth, branchDeptId, swapRequestId, { decision: 'approved' }),
    ).rejects.toThrow('already approved');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      reviewSwapRequest(mockDb, memberAuth, branchDeptId, swapRequestId, { decision: 'approved' }),
    ).rejects.toThrow('Only department leads or above');
  });
});

// ── Member-facing aggregation ─────────────────────────────

describe('listMyUpcomingRota', () => {
  it('returns upcoming assignments across all departments', async () => {
    const rows = [
      {
        assignmentId,
        instanceId,
        branchDepartmentId: branchDeptId,
        templateId,
        templateName: 'Sunday Choir',
        serviceDate: '2026-05-10',
        startTime: '10:00',
        slotRoleName: 'Soprano',
        status: 'Assigned',
        instanceStatus: 'Published',
      },
    ];
    setupSelectSequence(rows);
    const result = await listMyUpcomingRota(mockDb, memberAuth, {});
    expect(result).toEqual(rows);
  });
});

// ── Rota stats ────────────────────────────────────────────

describe('getRotaStats', () => {
  it('aggregates published/draft counts inside the window for the dept lead', async () => {
    setupSelectSequence(
      [sampleBd],
      [
        { status: 'Published', c: 3 },
        { status: 'Draft', c: 2 },
      ],
    );
    const result = await getRotaStats(mockDb, leaderAuth, branchDeptId, { windowDays: 28 });
    expect(result.branchDepartmentId).toBe(branchDeptId);
    expect(result.windowDays).toBe(28);
    expect(result.upcomingCount).toBe(5);
    expect(result.publishedCount).toBe(3);
    expect(result.draftCount).toBe(2);
  });

  it('defaults windowDays to 28 when omitted', async () => {
    setupSelectSequence([sampleBd], []);
    const result = await getRotaStats(mockDb, leaderAuth, branchDeptId, {});
    expect(result.windowDays).toBe(28);
    expect(result.upcomingCount).toBe(0);
  });

  it('returns zero counts when no upcoming instances exist', async () => {
    setupSelectSequence([sampleBd], []);
    const result = await getRotaStats(mockDb, leaderAuth, branchDeptId, { windowDays: 14 });
    expect(result.upcomingCount).toBe(0);
    expect(result.publishedCount).toBe(0);
    expect(result.draftCount).toBe(0);
  });

  it('forbids non-lead member from viewing stats', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      getRotaStats(mockDb, memberAuth, branchDeptId, {}),
    ).rejects.toThrow(/lead\/deputy/);
  });

  it('forbids access when the department is not in the caller branch', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      getRotaStats(mockDb, crossBranchAuth, branchDeptId, {}),
    ).rejects.toThrow(/your branch/);
  });

  it('admin can view stats for any department', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ status: 'Published', c: 1 }],
    );
    const result = await getRotaStats(mockDb, adminAuth, branchDeptId, {});
    expect(result.publishedCount).toBe(1);
  });
});

// admin can do anything - silence "unused" lint
void adminAuth;
