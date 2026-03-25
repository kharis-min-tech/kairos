import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Flexible Drizzle mock builder ─────────────────────────
function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'onConflictDoUpdate',
    'update', 'set',
    'groupBy',
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
} as unknown as import('@kairos/database').Database;

function setupSelect(result: unknown) {
  selectResults = [result];
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

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

const branchId = '220e8400-0000-0000-0000-000000000002';
const fellowshipId = '440e8400-0000-0000-0000-000000000004';
const memberId = '330e8400-0000-0000-0000-000000000003';
const meetingId = '550e8400-0000-0000-0000-000000000005';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId };
const otherAuth = { memberId: '000-other', email: 'other@test.com', systemRole: 'member' as const, branchId: 'other-branch' };

const sampleFellowship = {
  id: fellowshipId,
  fellowshipName: 'Grace K-Group',
  branchId,
  branchName: 'Lagos Branch',
  fellowshipType: 'K-Groups',
  description: 'A fellowship group',
  leaderId: memberId,
  coLeaderId: null,
  meetingSchedule: 'Wednesdays 6pm',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleMeeting = {
  id: meetingId,
  fellowshipId,
  meetingDate: new Date('2024-06-15'),
  meetingTitle: 'Weekly Study',
  meetingTopic: 'Faith',
  meetingNotes: null,
  location: 'Church Hall',
  durationMinutes: 90,
  createdBy: adminAuth.memberId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

import {
  listFellowships,
  getFellowship,
  createFellowship,
  updateFellowship,
  deactivateFellowship,
  listFellowshipMembers,
  addFellowshipMember,
  removeFellowshipMember,
  listMeetings,
  createMeeting,
  updateMeeting,
  recordAttendance,
  getMeetingAttendance,
  getAttendanceSummary,
  createJoinRequest,
  listJoinRequests,
  reviewJoinRequest,
} from './service';

// ── listFellowships ───────────────────────────────────────

describe('listFellowships', () => {
  it('returns paginated list for admin', async () => {
    setupSelectSequence([sampleFellowship], [{ value: 1 }]);
    const result = await listFellowships(mockDb, adminAuth, { page: 1, limit: 20 });
    expect(result.data).toEqual([sampleFellowship]);
    expect(result.meta.total).toBe(1);
  });

  it('scopes to branch for regular members', async () => {
    setupSelectSequence([], [{ value: 0 }]);
    const result = await listFellowships(mockDb, memberAuth, { page: 1, limit: 20 });
    expect(result.data).toEqual([]);
    expect(mockDb.select).toHaveBeenCalled();
  });
});

// ── getFellowship ─────────────────────────────────────────

describe('getFellowship', () => {
  it('returns fellowship for admin', async () => {
    setupSelect([sampleFellowship]);
    const result = await getFellowship(mockDb, adminAuth, fellowshipId);
    expect(result.fellowshipName).toBe('Grace K-Group');
  });

  it('throws NotFoundError if not found', async () => {
    setupSelect([]);
    await expect(getFellowship(mockDb, adminAuth, 'bad-id')).rejects.toThrow('Fellowship not found');
  });

  it('throws ForbiddenError for member in different branch', async () => {
    setupSelect([sampleFellowship]);
    await expect(getFellowship(mockDb, otherAuth, fellowshipId)).rejects.toThrow('You can only access fellowships in your branch');
  });
});

// ── createFellowship ──────────────────────────────────────

describe('createFellowship', () => {
  const createData = {
    fellowshipName: 'New Group',
    branchId,
    fellowshipType: 'K-Groups',
    leaderId: memberId,
  };

  it('creates fellowship and auto-joins leader', async () => {
    // select branch, select leader, insert fellowship, insert fellowshipMember
    setupSelectSequence([{ id: branchId }], [{ id: memberId }]);
    const insertedFellowship = { id: fellowshipId, ...createData };
    let insertCount = 0;
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      insertCount++;
      return createChain(insertCount === 1 ? [insertedFellowship] : [{ id: 'fm-1' }]);
    });

    const result = await createFellowship(mockDb, adminAuth, createData);
    expect(result.id).toBe(fellowshipId);
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // fellowship + leader auto-join
  });

  it('throws ForbiddenError for regular member', async () => {
    await expect(createFellowship(mockDb, memberAuth, createData)).rejects.toThrow('Only admins and pastors');
  });

  it('throws ValidationError if branch not found', async () => {
    setupSelect([]);
    await expect(createFellowship(mockDb, adminAuth, createData)).rejects.toThrow('Branch not found');
  });

  it('throws ValidationError if leader not found', async () => {
    setupSelectSequence([{ id: branchId }], []);
    await expect(createFellowship(mockDb, adminAuth, createData)).rejects.toThrow('Leader member not found');
  });
});

// ── updateFellowship ──────────────────────────────────────

describe('updateFellowship', () => {
  it('updates fellowship for admin', async () => {
    setupSelect([sampleFellowship]);
    setupUpdate([{ ...sampleFellowship, description: 'Updated' }]);
    const result = await updateFellowship(mockDb, adminAuth, fellowshipId, { description: 'Updated' });
    expect(result.description).toBe('Updated');
  });

  it('throws ForbiddenError for regular member', async () => {
    await expect(updateFellowship(mockDb, memberAuth, fellowshipId, {})).rejects.toThrow('Only admins and pastors');
  });
});

// ── deactivateFellowship ──────────────────────────────────

describe('deactivateFellowship', () => {
  it('soft-deletes fellowship and cascade members', async () => {
    setupSelect([sampleFellowship]);
    let updateCount = 0;
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
      updateCount++;
      return createChain(updateCount === 2 ? [{ ...sampleFellowship, isActive: false }] : undefined);
    });

    const result = await deactivateFellowship(mockDb, adminAuth, fellowshipId);
    expect(result.isActive).toBe(false);
    expect(mockDb.update).toHaveBeenCalledTimes(2); // members cascade + fellowship
  });

  it('throws ForbiddenError for regular member', async () => {
    await expect(deactivateFellowship(mockDb, memberAuth, fellowshipId)).rejects.toThrow('Only admins and pastors');
  });
});

// ── listFellowshipMembers ─────────────────────────────────

describe('listFellowshipMembers', () => {
  it('returns fellowship members', async () => {
    const members = [{ id: 'fm-1', memberFirstName: 'John', memberLastName: 'Doe' }];
    // First select: getFellowship check, second: actual member list
    setupSelectSequence([sampleFellowship], members);
    const result = await listFellowshipMembers(mockDb, adminAuth, fellowshipId);
    expect(result).toEqual(members);
  });
});

// ── addFellowshipMember ───────────────────────────────────

describe('addFellowshipMember', () => {
  it('adds member to fellowship', async () => {
    // getFellowship, validate member, check duplicate
    setupSelectSequence(
      [sampleFellowship],
      [{ id: memberId, homeBranchId: branchId }],
      [],
    );
    setupInsert([{ id: 'fm-new', fellowshipId, memberId }]);
    const result = await addFellowshipMember(mockDb, adminAuth, fellowshipId, { memberId });
    expect(result.memberId).toBe(memberId);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleFellowship]);
    await expect(addFellowshipMember(mockDb, memberAuth, fellowshipId, { memberId })).rejects.toThrow('Only fellowship leaders or above');
  });

  it('throws NotFoundError if member not found', async () => {
    setupSelectSequence([sampleFellowship], []);
    await expect(addFellowshipMember(mockDb, adminAuth, fellowshipId, { memberId: 'bad' })).rejects.toThrow('Member not found');
  });

  it('throws ValidationError if different branch', async () => {
    setupSelectSequence(
      [sampleFellowship],
      [{ id: memberId, homeBranchId: 'other-branch-id' }],
    );
    await expect(addFellowshipMember(mockDb, adminAuth, fellowshipId, { memberId })).rejects.toThrow('same branch');
  });

  it('throws ConflictError if already a member', async () => {
    setupSelectSequence(
      [sampleFellowship],
      [{ id: memberId, homeBranchId: branchId }],
      [{ id: 'existing' }],
    );
    await expect(addFellowshipMember(mockDb, adminAuth, fellowshipId, { memberId })).rejects.toThrow('already in this fellowship');
  });
});

// ── removeFellowshipMember ────────────────────────────────

describe('removeFellowshipMember', () => {
  it('soft-removes member', async () => {
    setupSelect([sampleFellowship]);
    setupUpdate([{ id: 'fm-1', isActive: false }]);
    const result = await removeFellowshipMember(mockDb, adminAuth, fellowshipId, memberId);
    expect(result.isActive).toBe(false);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleFellowship]);
    await expect(removeFellowshipMember(mockDb, memberAuth, fellowshipId, memberId)).rejects.toThrow('Only fellowship leaders or above');
  });

  it('throws NotFoundError if not active member', async () => {
    setupSelect([sampleFellowship]);
    setupUpdate([]);
    await expect(removeFellowshipMember(mockDb, adminAuth, fellowshipId, memberId)).rejects.toThrow('Fellowship member not found');
  });
});

// ── listMeetings ──────────────────────────────────────────

describe('listMeetings', () => {
  it('returns meetings ordered by date', async () => {
    setupSelectSequence([sampleFellowship], [sampleMeeting]);
    const result = await listMeetings(mockDb, adminAuth, fellowshipId);
    expect(result).toEqual([sampleMeeting]);
  });
});

// ── createMeeting ─────────────────────────────────────────

describe('createMeeting', () => {
  it('creates a meeting', async () => {
    setupSelect([sampleFellowship]);
    setupInsert([sampleMeeting]);
    const result = await createMeeting(mockDb, adminAuth, fellowshipId, {
      meetingDate: '2024-06-15T18:00:00Z',
      meetingTitle: 'Weekly Study',
    });
    expect(result.meetingTitle).toBe('Weekly Study');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleFellowship]);
    await expect(
      createMeeting(mockDb, memberAuth, fellowshipId, { meetingDate: '2024-06-15T18:00:00Z' }),
    ).rejects.toThrow('Only fellowship leaders or above');
  });
});

// ── updateMeeting ─────────────────────────────────────────

describe('updateMeeting', () => {
  it('updates a meeting', async () => {
    setupSelect([sampleFellowship]);
    setupUpdate([{ ...sampleMeeting, meetingTitle: 'Updated' }]);
    const result = await updateMeeting(mockDb, adminAuth, fellowshipId, meetingId, { meetingTitle: 'Updated' });
    expect(result.meetingTitle).toBe('Updated');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleFellowship]);
    await expect(
      updateMeeting(mockDb, memberAuth, fellowshipId, meetingId, {}),
    ).rejects.toThrow('Only fellowship leaders or above');
  });

  it('throws NotFoundError if meeting not found', async () => {
    setupSelect([sampleFellowship]);
    setupUpdate([]);
    await expect(
      updateMeeting(mockDb, adminAuth, fellowshipId, 'bad-id', {}),
    ).rejects.toThrow('Meeting not found');
  });
});

// ── recordAttendance ──────────────────────────────────────

describe('recordAttendance', () => {
  it('records attendance for meeting', async () => {
    // getFellowship, check meeting
    setupSelectSequence([sampleFellowship], [{ id: meetingId }]);
    setupInsert(undefined);
    await expect(
      recordAttendance(mockDb, adminAuth, fellowshipId, meetingId, [
        { memberId, attendanceStatus: 'Present' },
      ]),
    ).resolves.toBeUndefined();
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleFellowship]);
    await expect(
      recordAttendance(mockDb, memberAuth, fellowshipId, meetingId, []),
    ).rejects.toThrow('Only fellowship leaders or above');
  });

  it('throws NotFoundError if meeting not found', async () => {
    setupSelectSequence([sampleFellowship], []);
    await expect(
      recordAttendance(mockDb, adminAuth, fellowshipId, 'bad-id', [
        { memberId, attendanceStatus: 'Present' },
      ]),
    ).rejects.toThrow('Meeting not found');
  });
});

// ── getMeetingAttendance ──────────────────────────────────

describe('getMeetingAttendance', () => {
  it('returns attendance records', async () => {
    const records = [{ meetingId, memberId, attendanceStatus: 'Present' }];
    setupSelectSequence([sampleFellowship], records);
    const result = await getMeetingAttendance(mockDb, adminAuth, fellowshipId, meetingId);
    expect(result).toEqual(records);
  });
});

// ── getAttendanceSummary ──────────────────────────────────

describe('getAttendanceSummary', () => {
  it('returns attendance stats per meeting', async () => {
    const stats = [{ meetingId, meetingDate: new Date(), total: 10, present: 7, absent: 2, excused: 1, late: 0 }];
    setupSelectSequence([sampleFellowship], stats);
    const result = await getAttendanceSummary(mockDb, adminAuth, fellowshipId);
    expect(result[0]!.present).toBe(7);
  });
});

// ── createJoinRequest ─────────────────────────────────────

const requestId = '660e8400-0000-0000-0000-000000000006';

const sampleJoinRequest = {
  id: requestId,
  fellowshipId,
  memberId: memberAuth.memberId,
  status: 'pending',
  notes: 'I would like to join',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'leader' as const, branchId };

describe('createJoinRequest', () => {
  it('creates a join request for a member', async () => {
    // 1) getFellowship, 2) active membership check, 3) pending request check, 4) cross-fellowship check
    setupSelectSequence([sampleFellowship], [], [], []);
    setupInsert([sampleJoinRequest]);
    const result = await createJoinRequest(mockDb, memberAuth, fellowshipId, { notes: 'I would like to join' });
    expect(result).toEqual(sampleJoinRequest);
  });

  it('throws ConflictError when already a member', async () => {
    // 1) getFellowship, 2) active membership check → found
    setupSelectSequence([sampleFellowship], [{ id: 'existing-membership' }]);
    await expect(
      createJoinRequest(mockDb, memberAuth, fellowshipId, {}),
    ).rejects.toThrow('You are already a member of this fellowship');
  });

  it('throws ConflictError when pending request already exists', async () => {
    // 1) getFellowship, 2) active membership check → empty, 3) pending request check → found
    setupSelectSequence([sampleFellowship], [], [sampleJoinRequest]);
    await expect(
      createJoinRequest(mockDb, memberAuth, fellowshipId, {}),
    ).rejects.toThrow('You already have a pending join request');
  });

  it('throws ConflictError when already in same-type fellowship', async () => {
    // 1) getFellowship, 2) active membership → empty, 3) pending request → empty, 4) cross-fellowship → found
    setupSelectSequence([sampleFellowship], [], [], [{ id: 'some-existing' }]);
    await expect(
      createJoinRequest(mockDb, memberAuth, fellowshipId, {}),
    ).rejects.toThrow('You are already in a K-Groups fellowship');
  });
});

// ── listJoinRequests ──────────────────────────────────────

describe('listJoinRequests', () => {
  it('returns pending join requests for leader', async () => {
    const requests = [{ ...sampleJoinRequest, memberFirstName: 'John', memberLastName: 'Doe' }];
    // 1) getFellowship, 2) list query
    setupSelectSequence([{ ...sampleFellowship, leaderId: leaderAuth.memberId }], requests);
    const result = await listJoinRequests(mockDb, leaderAuth, fellowshipId);
    expect(result).toEqual(requests);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleFellowship]);
    await expect(
      listJoinRequests(mockDb, memberAuth, fellowshipId),
    ).rejects.toThrow('Only fellowship leaders or above can perform this action');
  });
});

// ── reviewJoinRequest ─────────────────────────────────────

describe('reviewJoinRequest', () => {
  it('approves a join request and inserts new fellowship member', async () => {
    // 1) getFellowship, 2) select pending request, 3) update request (returning),
    // 4) check existing membership, 5) insert member
    setupSelectSequence(
      [sampleFellowship],
      [sampleJoinRequest],
      [],
    );
    const updatedRequest = { ...sampleJoinRequest, status: 'approved', reviewedBy: adminAuth.memberId, reviewedAt: new Date() };
    setupUpdate([updatedRequest]);
    setupInsert([{ fellowshipId, memberId: sampleJoinRequest.memberId }]);

    const result = await reviewJoinRequest(mockDb, adminAuth, fellowshipId, requestId, { status: 'approved' });
    expect(result.status).toBe('approved');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('approves and re-activates existing membership record', async () => {
    // 1) getFellowship, 2) select pending request, 3) check existing membership → found
    setupSelectSequence(
      [sampleFellowship],
      [sampleJoinRequest],
      [{ id: 'existing-membership-id' }],
    );
    const updatedRequest = { ...sampleJoinRequest, status: 'approved', reviewedBy: adminAuth.memberId };
    setupUpdate([updatedRequest]);

    const result = await reviewJoinRequest(mockDb, adminAuth, fellowshipId, requestId, { status: 'approved' });
    expect(result.status).toBe('approved');
    // update called twice: once for request status, once to re-activate membership
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });

  it('rejects a join request without modifying membership', async () => {
    // 1) getFellowship, 2) select pending request
    setupSelectSequence(
      [sampleFellowship],
      [sampleJoinRequest],
    );
    const updatedRequest = { ...sampleJoinRequest, status: 'rejected', reviewedBy: adminAuth.memberId };
    setupUpdate([updatedRequest]);

    const result = await reviewJoinRequest(mockDb, adminAuth, fellowshipId, requestId, { status: 'rejected', notes: 'Not eligible' });
    expect(result.status).toBe('rejected');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleFellowship]);
    await expect(
      reviewJoinRequest(mockDb, memberAuth, fellowshipId, requestId, { status: 'approved' }),
    ).rejects.toThrow('Only fellowship leaders or above can perform this action');
  });

  it('throws NotFoundError when request not found or already reviewed', async () => {
    // 1) getFellowship, 2) select pending request → empty
    setupSelectSequence([sampleFellowship], []);
    await expect(
      reviewJoinRequest(mockDb, adminAuth, fellowshipId, requestId, { status: 'approved' }),
    ).rejects.toThrow('Join request not found or already reviewed');
  });
});
