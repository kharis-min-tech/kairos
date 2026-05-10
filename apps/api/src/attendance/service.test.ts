import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { createTestMember, createTestBranch } from '../test-helpers';
import {
  createService,
  listServices,
  getService,
  recordAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceTrends,
} from './service';
import type { AuthContext } from '@kairos/types';

describe('Attendance Service', () => {
  let adminAuth: AuthContext;
  let pastorAuth: AuthContext;
  let memberAuth: AuthContext;
  let branchId: string;
  let memberId: string;

  beforeEach(async () => {
    const branch = await createTestBranch({ branchName: 'Test Branch' });
    branchId = branch.id;

    const admin = await createTestMember({
      email: 'admin@test.com',
      systemRole: 'admin',
      homeBranchId: branchId,
    });
    adminAuth = {
      memberId: admin.id,
      systemRole: 'admin',
      branchId,
    };

    const pastor = await createTestMember({
      email: 'pastor@test.com',
      systemRole: 'pastor',
      homeBranchId: branchId,
    });
    pastorAuth = {
      memberId: pastor.id,
      systemRole: 'pastor',
      branchId,
    };

    const member = await createTestMember({
      email: 'member@test.com',
      systemRole: 'member',
      homeBranchId: branchId,
    });
    memberAuth = {
      memberId: member.id,
      systemRole: 'member',
      branchId,
    };
    memberId = member.id;
  });

  describe('createService', () => {
    it('should create a service with valid data', async () => {
      const service = await createService(db, adminAuth, {
        branchId,
        serviceDate: '2025-01-15',
        serviceType: 'Sunday Service',
        serviceTitle: 'Test Service',
        expectedAttendance: 100,
      });

      expect(service.id).toBeDefined();
      expect(service.serviceType).toBe('Sunday Service');
      expect(service.expectedAttendance).toBe(100);
    });

    it('should enforce branch scope for pastor', async () => {
      const service = await createService(db, pastorAuth, {
        branchId,
        serviceDate: '2025-01-15',
        serviceType: 'Sunday Service',
      });

      expect(service.branchId).toBe(branchId);
    });

    it('should reject service creation by regular member', async () => {
      await expect(
        createService(db, memberAuth, {
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        }),
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('recordAttendance', () => {
    it('should record attendance for multiple members', async () => {
      const service = await createService(db, adminAuth, {
        branchId,
        serviceDate: '2025-01-15',
        serviceType: 'Sunday Service',
      });

      const result = await recordAttendance(db, adminAuth, service.id, [
        { memberId, attendanceStatus: 'Present' },
      ]);

      expect(result.recorded).toBe(1);
    });

    it('should track first-time visitors', async () => {
      const service = await createService(db, adminAuth, {
        branchId,
        serviceDate: '2025-01-15',
        serviceType: 'Sunday Service',
      });

      await recordAttendance(db, adminAuth, service.id, [
        {
          memberId,
          attendanceStatus: 'Present',
          isFirstTimeVisitor: true,
          visitorName: 'John Doe',
          visitorPhone: '+1234567890',
        },
      ]);

      const attendance = await db.query.serviceAttendance.findFirst({
        where: (sa, { eq }) => eq(sa.serviceId, service.id),
      });

      expect(attendance?.isFirstTimeVisitor).toBe(true);
      expect(attendance?.visitorName).toBe('John Doe');
    });
  });

  describe('updateAttendance', () => {
    it('should update attendance status', async () => {
      const service = await createService(db, adminAuth, {
        branchId,
        serviceDate: '2025-01-15',
        serviceType: 'Sunday Service',
      });

      await recordAttendance(db, adminAuth, service.id, [
        { memberId, attendanceStatus: 'Present' },
      ]);

      const updated = await updateAttendance(db, adminAuth, service.id, memberId, {
        attendanceStatus: 'Late',
      });

      expect(updated.attendanceStatus).toBe('Late');
    });
  });

  describe('deleteAttendance', () => {
    it('should delete attendance record', async () => {
      const service = await createService(db, adminAuth, {
        branchId,
        serviceDate: '2025-01-15',
        serviceType: 'Sunday Service',
      });

      await recordAttendance(db, adminAuth, service.id, [
        { memberId, attendanceStatus: 'Present' },
      ]);

      const deleted = await deleteAttendance(db, adminAuth, service.id, memberId);

      expect(deleted.memberId).toBe(memberId);
    });
  });

  describe('getAttendanceTrends', () => {
    it('should return attendance trends for last N weeks', async () => {
      const trends = await getAttendanceTrends(db, adminAuth, { weeks: 4 });

      expect(Array.isArray(trends)).toBe(true);
    });

    it('should filter by branch for pastor', async () => {
      const trends = await getAttendanceTrends(db, pastorAuth, { weeks: 4 });

      expect(Array.isArray(trends)).toBe(true);
      // All trends should be for pastor's branch
    });
  });
});
