// Unit tests for member-lookup.ts — database member and role resolution
// Mocks the @kairos/utils getDb function to return controlled query results

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a mock database that simulates Drizzle's select().from().where().limit() chain
// We need separate mock data stores for each table query
let memberRows: Array<{
  memberId: string;
  homeBranchId: string;
  email: string | null;
  isActive: boolean | null;
}> = [];

let leadershipRows: Array<{ role: string }> = [];

let departmentRows: Array<{
  leadMemberId: string;
  deputyMemberId: string | null;
}> = [];

let fellowshipRows: Array<{
  leaderId: string | null;
  coLeaderId: string | null;
}> = [];

// Create a chainable mock that returns different data based on the table queried
function createChainableMock() {
  let currentTable: string | null = null;

  const chain = {
    select: vi.fn().mockImplementation(() => {
      return chain;
    }),
    from: vi.fn().mockImplementation((table: unknown) => {
      // Detect which table is being queried by checking the table reference
      // We use the table's symbol or name to identify it
      const tableStr = String(table);
      if (tableStr.includes('members') || (table as { _: { name: string } })?._?.name === 'members') {
        currentTable = 'members';
      } else if (tableStr.includes('branch_leadership') || (table as { _: { name: string } })?._?.name === 'branch_leadership') {
        currentTable = 'branch_leadership';
      } else if (tableStr.includes('branch_departments') || (table as { _: { name: string } })?._?.name === 'branch_departments') {
        currentTable = 'branch_departments';
      } else if (tableStr.includes('fellowships') || (table as { _: { name: string } })?._?.name === 'fellowships') {
        currentTable = 'fellowships';
      }
      return chain;
    }),
    where: vi.fn().mockImplementation(() => {
      // For tables that don't need .limit(), return the data directly
      if (currentTable === 'branch_leadership') {
        return leadershipRows;
      }
      if (currentTable === 'branch_departments') {
        return departmentRows;
      }
      if (currentTable === 'fellowships') {
        return fellowshipRows;
      }
      return chain;
    }),
    limit: vi.fn().mockImplementation(() => {
      if (currentTable === 'members') {
        return memberRows;
      }
      return [];
    }),
  };

  return chain;
}

const mockDb = createChainableMock();

// Mock @kairos/utils to provide our mock database
vi.mock('@kairos/utils', () => ({
  getDb: () => mockDb,
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock @kairos/database to provide table references that our mock can identify
vi.mock('@kairos/database', () => ({
  members: { _: { name: 'members' }, memberId: 'member_id', homeBranchId: 'home_branch_id', email: 'email', isActive: 'is_active' },
  branchLeadership: { _: { name: 'branch_leadership' }, memberId: 'member_id', isCurrent: 'is_current', role: 'role' },
  branchDepartments: { _: { name: 'branch_departments' }, leadMemberId: 'lead_member_id', deputyMemberId: 'deputy_member_id', isActive: 'is_active' },
  fellowships: { _: { name: 'fellowships' }, leaderId: 'leader_id', coLeaderId: 'co_leader_id', isActive: 'is_active' },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((..._args: unknown[]) => 'eq'),
  and: vi.fn((..._args: unknown[]) => 'and'),
}));

import { lookupMember } from '../member-lookup';

describe('lookupMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all data stores
    memberRows = [];
    leadershipRows = [];
    departmentRows = [];
    fellowshipRows = [];
  });

  // Test 1: Active member with no leadership returns ['Member']
  it('should return ["Member"] for an active member with no leadership roles', async () => {
    memberRows = [
      { memberId: 'test-member-10', homeBranchId: 'test-branch-1', email: 'member@kairos.church', isActive: true },
    ];
    leadershipRows = [];
    departmentRows = [];
    fellowshipRows = [];

    const result = await lookupMember('member@kairos.church');

    expect(result).toEqual({
      memberId: 'test-member-10',
      branchId: 'test-branch-1',
      email: 'member@kairos.church',
      roles: ['Member'],
    });
  });

  // Test 2: Active member who is Main Pastor returns ['Pastor', 'Member']
  it('should return ["Pastor", "Member"] for a Main Pastor', async () => {
    memberRows = [
      { memberId: 'test-member-20', homeBranchId: 'test-branch-2', email: 'pastor@kairos.church', isActive: true },
    ];
    leadershipRows = [{ role: 'Main Pastor' }];
    departmentRows = [];
    fellowshipRows = [];

    const result = await lookupMember('pastor@kairos.church');

    expect(result.roles).toEqual(['Pastor', 'Member']);
    expect(result.memberId).toBe('test-member-20');
    expect(result.branchId).toBe('test-branch-2');
  });

  // Test 3: Active member who is Elder returns ['Pastor', 'Member']
  it('should return ["Pastor", "Member"] for an Elder (treated as Pastor-level)', async () => {
    memberRows = [
      { memberId: 'test-member-30', homeBranchId: 'test-branch-3', email: 'elder@kairos.church', isActive: true },
    ];
    leadershipRows = [{ role: 'Elder' }];
    departmentRows = [];
    fellowshipRows = [];

    const result = await lookupMember('elder@kairos.church');

    expect(result.roles).toEqual(['Pastor', 'Member']);
  });

  // Test 4: Active member who is department lead returns ['Leader', 'Member']
  it('should return ["Leader", "Member"] for a department lead', async () => {
    memberRows = [
      { memberId: 'test-member-40', homeBranchId: 'test-branch-4', email: 'deptlead@kairos.church', isActive: true },
    ];
    leadershipRows = [];
    departmentRows = [{ leadMemberId: 'test-member-40', deputyMemberId: null }];
    fellowshipRows = [];

    const result = await lookupMember('deptlead@kairos.church');

    expect(result.roles).toEqual(['Leader', 'Member']);
  });

  // Test 5: Active member who is fellowship leader returns ['Leader', 'Member']
  it('should return ["Leader", "Member"] for a fellowship leader', async () => {
    memberRows = [
      { memberId: 'test-member-50', homeBranchId: 'test-branch-5', email: 'fellowlead@kairos.church', isActive: true },
    ];
    leadershipRows = [];
    departmentRows = [];
    fellowshipRows = [{ leaderId: 'test-member-50', coLeaderId: null }];

    const result = await lookupMember('fellowlead@kairos.church');

    expect(result.roles).toEqual(['Leader', 'Member']);
  });

  // Test 6: Admin from Cognito returns ['Admin', 'Member']
  it('should return ["Admin", "Member"] when cognitoRole is Admin', async () => {
    memberRows = [
      { memberId: 'test-member-60', homeBranchId: 'test-branch-1', email: 'admin@kairos.church', isActive: true },
    ];
    leadershipRows = [];
    departmentRows = [];
    fellowshipRows = [];

    const result = await lookupMember('admin@kairos.church', 'Admin');

    expect(result.roles).toEqual(['Admin', 'Member']);
  });

  // Test 7: Inactive member throws error
  it('should throw an error for an inactive member', async () => {
    memberRows = [
      { memberId: 'test-member-70', homeBranchId: 'test-branch-1', email: 'inactive@kairos.church', isActive: false },
    ];

    await expect(
      lookupMember('inactive@kairos.church')
    ).rejects.toThrow('Member account is inactive');
  });

  // Test 8: Non-existent member throws error
  it('should throw an error when member is not found', async () => {
    memberRows = [];

    await expect(
      lookupMember('nobody@kairos.church')
    ).rejects.toThrow('Member not found for email: nobody@kairos.church');
  });

  // Test: Department deputy also gets Leader role
  it('should return ["Leader", "Member"] for a department deputy', async () => {
    memberRows = [
      { memberId: 'test-member-80', homeBranchId: 'test-branch-1', email: 'deputy@kairos.church', isActive: true },
    ];
    leadershipRows = [];
    departmentRows = [{ leadMemberId: 'test-member-99', deputyMemberId: 'test-member-80' }];
    fellowshipRows = [];

    const result = await lookupMember('deputy@kairos.church');

    expect(result.roles).toEqual(['Leader', 'Member']);
  });

  // Test: Fellowship co-leader also gets Leader role
  it('should return ["Leader", "Member"] for a fellowship co-leader', async () => {
    memberRows = [
      { memberId: 'test-member-90', homeBranchId: 'test-branch-1', email: 'coleader@kairos.church', isActive: true },
    ];
    leadershipRows = [];
    departmentRows = [];
    fellowshipRows = [{ leaderId: 'test-member-99', coLeaderId: 'test-member-90' }];

    const result = await lookupMember('coleader@kairos.church');

    expect(result.roles).toEqual(['Leader', 'Member']);
  });

  // Test: Roles are deduplicated (e.g., both Main Pastor and Elder)
  it('should deduplicate roles when member has multiple Pastor-level roles', async () => {
    memberRows = [
      { memberId: 'test-member-100', homeBranchId: 'test-branch-1', email: 'multi@kairos.church', isActive: true },
    ];
    leadershipRows = [{ role: 'Main Pastor' }, { role: 'Elder' }];
    departmentRows = [];
    fellowshipRows = [];

    const result = await lookupMember('multi@kairos.church');

    // Both Main Pastor and Elder map to 'Pastor', but should be deduplicated
    expect(result.roles).toEqual(['Pastor', 'Member']);
    expect(result.roles.filter((r) => r === 'Pastor')).toHaveLength(1);
  });
});
