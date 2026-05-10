import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app';
import { testRequest, createTestMember, createTestBranch } from '../test-helpers';

describe('Attendance Router', () => {
  let app: ReturnType<typeof createApp>;
  let adminToken: string;
  let pastorToken: string;
  let memberToken: string;
  let branchId: string;
  let adminId: string;
  let pastorId: string;
  let memberId: string;

  beforeEach(async () => {
    app = createApp();

    // Create test branch
    const branch = await createTestBranch({ branchName: 'Test Branch' });
    branchId = branch.id;

    // Create test users
    const admin = await createTestMember({
      email: 'admin@test.com',
      systemRole: 'admin',
      homeBranchId: branchId,
    });
    adminId = admin.id;
    adminToken = admin.token;

    const pastor = await createTestMember({
      email: 'pastor@test.com',
      systemRole: 'pastor',
      homeBranchId: branchId,
    });
    pastorId = pastor.id;
    pastorToken = pastor.token;

    const member = await createTestMember({
      email: 'member@test.com',
      systemRole: 'member',
      homeBranchId: branchId,
    });
    memberId = member.id;
    memberToken = member.token;
  });

  describe('POST /api/attendance/services', () => {
    it('should create a service as admin', async () => {
      const res = await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
          serviceTitle: 'Test Service',
          expectedAttendance: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.serviceType).toBe('Sunday Service');
    });

    it('should create a service as pastor', async () => {
      const res = await testRequest(app, pastorToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Midweek Service',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject service creation by regular member', async () => {
      const res = await testRequest(app, memberToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      expect(res.status).toBe(403);
    });

    it('should prevent duplicate service (same branch, date, type)', async () => {
      await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      const res = await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/attendance/services/:id/attendance', () => {
    it('should record attendance for multiple members', async () => {
      // Create service
      const serviceRes = await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      const serviceId = serviceRes.body.data.id;

      // Record attendance
      const res = await testRequest(app, adminToken)
        .post(`/api/attendance/services/${serviceId}/attendance`)
        .send({
          records: [
            { memberId: pastorId, attendanceStatus: 'Present' },
            { memberId: memberId, attendanceStatus: 'Virtual', isFirstTimeVisitor: true },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.recorded).toBe(2);
    });

    it('should prevent duplicate attendance records', async () => {
      const serviceRes = await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      const serviceId = serviceRes.body.data.id;

      await testRequest(app, adminToken)
        .post(`/api/attendance/services/${serviceId}/attendance`)
        .send({
          records: [{ memberId: pastorId, attendanceStatus: 'Present' }],
        });

      const res = await testRequest(app, adminToken)
        .post(`/api/attendance/services/${serviceId}/attendance`)
        .send({
          records: [{ memberId: pastorId, attendanceStatus: 'Absent' }],
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/attendance/services', () => {
    it('should list services with attendance summary', async () => {
      await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      const res = await testRequest(app, adminToken).get('/api/attendance/services');

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);
      expect(res.body.data.meta).toBeDefined();
    });

    it('should filter services by branch for pastor', async () => {
      const res = await testRequest(app, pastorToken).get('/api/attendance/services');

      expect(res.status).toBe(200);
      // Pastor should only see their branch services
    });
  });

  describe('PATCH /api/attendance/services/:serviceId/attendance/:memberId', () => {
    it('should update attendance status', async () => {
      const serviceRes = await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      const serviceId = serviceRes.body.data.id;

      await testRequest(app, adminToken)
        .post(`/api/attendance/services/${serviceId}/attendance`)
        .send({
          records: [{ memberId: pastorId, attendanceStatus: 'Present' }],
        });

      const res = await testRequest(app, adminToken)
        .patch(`/api/attendance/services/${serviceId}/attendance/${pastorId}`)
        .send({ attendanceStatus: 'Late' });

      expect(res.status).toBe(200);
      expect(res.body.data.attendanceStatus).toBe('Late');
    });
  });

  describe('DELETE /api/attendance/services/:serviceId/attendance/:memberId', () => {
    it('should delete attendance record (undo)', async () => {
      const serviceRes = await testRequest(app, adminToken)
        .post('/api/attendance/services')
        .send({
          branchId,
          serviceDate: '2025-01-15',
          serviceType: 'Sunday Service',
        });

      const serviceId = serviceRes.body.data.id;

      await testRequest(app, adminToken)
        .post(`/api/attendance/services/${serviceId}/attendance`)
        .send({
          records: [{ memberId: pastorId, attendanceStatus: 'Present' }],
        });

      const res = await testRequest(app, adminToken).delete(
        `/api/attendance/services/${serviceId}/attendance/${pastorId}`,
      );

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/attendance/reports/trends', () => {
    it('should return attendance trends', async () => {
      const res = await testRequest(app, adminToken).get('/api/attendance/reports/trends?weeks=4');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/attendance/reports/first-time-visitors', () => {
    it('should return first-time visitors', async () => {
      const res = await testRequest(app, adminToken).get(
        '/api/attendance/reports/first-time-visitors',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});
