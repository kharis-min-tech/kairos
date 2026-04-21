import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureSoul, updateSoulStatus, listSouls, reassignSoul } from './souls-service';
import type { Database } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { TEST_IDS } from '../test-helpers';
import { ValidationError, ForbiddenError } from '@kairos/utils';

describe('Souls Service', () => {
  let mockDb: any;
  let adminAuth: AuthContext;
  let adminActingAsMemberAuth: AuthContext;
  let pastorAuth: AuthContext;
  let memberAuth: AuthContext;

  beforeEach(() => {
    mockDb = {} as Database;
    adminAuth = {
      memberId: TEST_IDS.adminId,
      email: 'admin@kairos.local',
      systemRole: 'admin',
      activeRole: 'admin',
      branchId: TEST_IDS.branchId,
    };
    adminActingAsMemberAuth = {
      memberId: TEST_IDS.adminId,
      email: 'admin@kairos.local',
      systemRole: 'admin',
      activeRole: 'member',
      branchId: TEST_IDS.branchId,
    };
    pastorAuth = {
      memberId: TEST_IDS.pastorId,
      email: 'pastor@kairos.local',
      systemRole: 'pastor',
      activeRole: 'pastor',
      branchId: TEST_IDS.branchId,
    };
    memberAuth = {
      memberId: TEST_IDS.memberId,
      email: 'member@kairos.local',
      systemRole: 'member',
      activeRole: 'member',
      branchId: TEST_IDS.branchId,
    };
  });

  describe('captureSoul', () => {
    it('should capture soul with required fields only', async () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+234-800-1234-567',
      };

      const mockSoul = {
        id: 'soul-id-1',
        ...input,
        outreachId: null,
        assignedMemberId: memberAuth.memberId,
        status: 'New',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSoul]),
        }),
      });

      const result = (await captureSoul(mockDb, input, memberAuth))!;

      expect(result.status).toBe('New');
      expect(result.assignedMemberId).toBe(memberAuth.memberId);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should auto-assign to capturing worker', async () => {
      const input = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '08012345678',
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'soul-2',
            assignedMemberId: memberAuth.memberId,
            status: 'New',
          }]),
        }),
      });

      const result = (await captureSoul(mockDb, input, memberAuth))!;

      expect(result.assignedMemberId).toBe(memberAuth.memberId);
    });

    it('should initialize status to New', async () => {
      const input = {
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'soul-3',
            status: 'New',
          }]),
        }),
      });

      const result = (await captureSoul(mockDb, input, memberAuth))!;

      expect(result.status).toBe('New');
    });

    it('should support ad-hoc soul capture (outreach_id = null)', async () => {
      const input = {
        firstName: 'Ad-hoc',
        lastName: 'Soul',
        phone: '9876543210',
        outreachId: null,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'soul-4',
            outreachId: null,
          }]),
        }),
      });

      const result = (await captureSoul(mockDb, input, memberAuth))!;

      expect(result.outreachId).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      const input = {
        firstName: 'Email',
        lastName: 'Test',
        phone: '1111111111',
        email: 'TEST@EXAMPLE.COM',
      };

      let capturedEmail = '';
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn((vals: any) => {
          capturedEmail = vals.email;
          return {
            returning: vi.fn().mockResolvedValue([{
              id: 'soul-5',
              email: vals.email,
            }]),
          };
        }),
      });

      await captureSoul(mockDb, input, memberAuth);

      expect(capturedEmail).toBe('test@example.com');
    });
  });

  describe('updateSoulStatus', () => {
    it('should update to all six valid statuses', async () => {
      const statuses = ['New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'];

      for (const status of statuses) {
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'soul-1', status: 'New' }]),
          }),
        });

        mockDb.update = vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'soul-1', status }]),
            }),
          }),
        });

        const input: any = { status };
        if (status === 'Converted') {
          input.convertedToMemberId = TEST_IDS.memberId;
        }

        const result = (await updateSoulStatus(mockDb, 'soul-1', input, adminAuth))!;

        expect(result.status).toBe(status);
      }
    });

    it('should allow bidirectional transitions', async () => {
      // Test backward transition: Interested → Following Up
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'soul-1', status: 'Interested' }]),
        }),
      });

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'soul-1', status: 'Following Up' }]),
          }),
        }),
      });

      const result = (await updateSoulStatus(mockDb, 'soul-1', { status: 'Following Up' }, adminAuth))!;

      expect(result.status).toBe('Following Up');
    });

    it('should require converted_to_member_id for Converted status', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'soul-1', status: 'New' }]),
        }),
      });

      await expect(
        updateSoulStatus(mockDb, 'soul-1', { status: 'Converted' }, adminAuth)
      ).rejects.toThrow(ValidationError);
    });

    it('should normalize status value (trim whitespace)', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'soul-1', status: 'New' }]),
        }),
      });

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'soul-1', status: 'Interested' }]),
          }),
        }),
      });

      const result = (await updateSoulStatus(mockDb, 'soul-1', { status: '  Interested  ' as any }, adminAuth))!;

      expect(result.status).toBe('Interested');
    });
  });

  describe('listSouls', () => {
    it('should return paginated souls', async () => {
      const mockSouls = [
        { id: 'soul-1', firstName: 'John', lastName: 'Doe' },
        { id: 'soul-2', firstName: 'Jane', lastName: 'Smith' },
      ];

      mockDb.select = vi.fn((fields) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([{ count: 2 }]),
                }),
              }),
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
                      orderBy: vi.fn().mockResolvedValue(mockSouls),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await listSouls(mockDb, adminAuth, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by assignment for Member users', async () => {
      mockDb.select = vi.fn((fields) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([{ count: 0 }]),
                }),
              }),
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

      await listSouls(mockDb, memberAuth, { page: 1, limit: 20 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should filter by branch for Pastor users', async () => {
      mockDb.select = vi.fn((fields) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([{ count: 0 }]),
                }),
              }),
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

      await listSouls(mockDb, pastorAuth, { page: 1, limit: 20 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should only show assigned souls when admin acts as member', async () => {
      mockDb.select = vi.fn((fields) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([{ count: 0 }]),
                }),
              }),
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

      await listSouls(mockDb, adminActingAsMemberAuth, { page: 1, limit: 20 });

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('reassignSoul', () => {
    it('should update assigned_member_id', async () => {
      const newMemberId = 'new-member-id';

      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{
              id: 'soul-1',
              assignedMemberId: memberAuth.memberId,
              branchId: TEST_IDS.branchId,
            }]),
          })),
        })),
      }));

      mockDb.select = vi.fn((fields) => {
        if (fields && fields.id && fields.homeBranchId) {
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{
                id: newMemberId,
                homeBranchId: TEST_IDS.branchId,
              }]),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{
                id: 'soul-1',
                assignedMemberId: memberAuth.memberId,
                branchId: TEST_IDS.branchId,
              }]),
            })),
          })),
        };
      });

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'soul-1',
              assignedMemberId: newMemberId,
            }]),
          }),
        }),
      });

      const result = (await reassignSoul(mockDb, 'soul-1', { assignedMemberId: newMemberId }, adminAuth))!;

      expect(result.assignedMemberId).toBe(newMemberId);
    });

    it('should validate new member is active', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{
              id: 'soul-1',
              branchId: TEST_IDS.branchId,
            }]),
          })),
        })),
      }));

      mockDb.select = vi.fn((fields) => {
        if (fields && fields.id && fields.homeBranchId) {
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{
                id: 'soul-1',
                branchId: TEST_IDS.branchId,
              }]),
            })),
          })),
        };
      });

      await expect(
        reassignSoul(mockDb, 'soul-1', { assignedMemberId: 'invalid-member' }, adminAuth)
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce branch constraints for Pastor', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{
              id: 'soul-1',
              branchId: TEST_IDS.branch2Id, // Different branch
            }]),
          })),
        })),
      }));

      await expect(
        reassignSoul(mockDb, 'soul-1', { assignedMemberId: 'new-member' }, pastorAuth)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
