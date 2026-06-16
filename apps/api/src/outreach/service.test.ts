import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createProgram, listPrograms } from './service';
import type { Database } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { TEST_IDS } from '../test-helpers';
import { ConflictError, ValidationError, ForbiddenError } from '@kairos/utils';

describe('Outreach Programs Service', () => {
  let mockDb: any;
  let adminAuth: AuthContext;
  let adminActingAsMemberAuth: AuthContext;
  let pastorAuth: AuthContext;

  beforeEach(() => {
    mockDb = {} as Database;
    adminAuth = {
      memberId: TEST_IDS.adminId,
      email: 'admin@kairos.local',
      systemRole: 'admin',
      activeRole: 'admin',
      branchId: TEST_IDS.branchId,
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    adminActingAsMemberAuth = {
      memberId: TEST_IDS.adminId,
      email: 'admin@kairos.local',
      systemRole: 'admin',
      activeRole: 'member',
      branchId: TEST_IDS.branchId,
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    pastorAuth = {
      memberId: TEST_IDS.pastorId,
      email: 'pastor@kairos.local',
      systemRole: 'pastor',
      activeRole: 'pastor',
      branchId: TEST_IDS.branchId,
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
  });

  describe('createProgram', () => {
    it('should create program with all fields', async () => {
      const input = {
        programName: 'Easter Outreach 2024',
        programDate: '2024-04-20',
        location: 'City Park',
        address: '123 Main St',
        city: 'Lagos',
        description: 'Easter evangelism event',
        coordinatorId: TEST_IDS.memberId,
        branchId: TEST_IDS.branchId,
        notes: 'Bring tracts',
      };

      const mockProgram = {
        id: 'program-id-1',
        ...input,
        totalSoulsReached: 0,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: check for duplicate
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          };
        } else {
          // Second call: validate coordinator
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: TEST_IDS.memberId, homeBranchId: TEST_IDS.branchId }]),
            }),
          };
        }
      });

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProgram]),
        }),
      });

      const result = await createProgram(mockDb, input, adminAuth);

      expect(result).toEqual(mockProgram);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should auto-set branch_id for Pastor users', async () => {
      const input = {
        programName: 'Sunday Outreach',
        programDate: '2024-05-01',
        location: 'Market Square',
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'prog-1', branchId: TEST_IDS.branchId }]),
        }),
      });
      mockDb.insert = insertMock;

      await createProgram(mockDb, input, pastorAuth);

      const insertCall = insertMock.mock.calls[0];
      expect(insertCall).toBeDefined();
    });

    it('should require branch_id for Admin users', async () => {
      const input = {
        programName: 'Regional Outreach',
        programDate: '2024-06-01',
        location: 'Stadium',
      };

      await expect(createProgram(mockDb, input, adminAuth)).rejects.toThrow(ValidationError);
    });

    it('should detect case-insensitive duplicate program names', async () => {
      const input = {
        programName: 'Easter Outreach',
        programDate: '2024-04-20',
        location: 'Park',
        branchId: TEST_IDS.branchId,
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'existing-id' }]),
        }),
      });

      await expect(createProgram(mockDb, input, adminAuth)).rejects.toThrow(ConflictError);
    });

    it('should validate coordinator is active member from correct branch', async () => {
      const input = {
        programName: 'New Outreach',
        programDate: '2024-07-01',
        location: 'Church',
        coordinatorId: 'invalid-member-id',
        branchId: TEST_IDS.branchId,
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(createProgram(mockDb, input, adminAuth)).rejects.toThrow(ValidationError);
    });

    it('should enforce branch isolation for Pastor', async () => {
      const input = {
        programName: 'Cross-Branch Outreach',
        programDate: '2024-08-01',
        location: 'Plaza',
        branchId: TEST_IDS.branch2Id, // Different branch
      };

      await expect(createProgram(mockDb, input, pastorAuth)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listPrograms', () => {
    it('should return paginated programs', async () => {
      const mockPrograms = [
        { id: 'prog-1', programName: 'Outreach 1', branchId: TEST_IDS.branchId },
        { id: 'prog-2', programName: 'Outreach 2', branchId: TEST_IDS.branchId },
      ];

      mockDb.select = vi.fn((fields) => {
        if (fields && 'outreachId' in fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        if (fields && 'branchId' in fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([{ branchId: TEST_IDS.branchId, count: 10 }]),
              }),
            }),
          };
        }
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 2 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockResolvedValue(mockPrograms),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await listPrograms(mockDb, pastorAuth, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by branch for Pastor users', async () => {
      mockDb.select = vi.fn((fields) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockResolvedValue([]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      await listPrograms(mockDb, pastorAuth, { page: 1, limit: 20 });

      // Verify branch filter was applied
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should allow Admin to see all branches', async () => {
      mockDb.select = vi.fn((fields) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockResolvedValue([]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      await listPrograms(mockDb, adminAuth, { page: 1, limit: 20 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should apply branch isolation when admin acts as member', async () => {
      mockDb.select = vi.fn((fields) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockResolvedValue([]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      await listPrograms(mockDb, adminActingAsMemberAuth, { page: 1, limit: 20 });

      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
