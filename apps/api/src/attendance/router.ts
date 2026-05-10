import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  createServiceSchema,
  updateServiceSchema,
  recordAttendanceSchema,
  listServicesQuerySchema,
  attendanceTrendsQuerySchema,
  attendanceByBranchQuerySchema,
  selfCheckInSchema,
} from './schemas';
import {
  listServices,
  getService,
  createService,
  updateService,
  softDeleteService,
  restoreService,
  getDeletedServices,
  getOtherBranchServices,
  recordAttendance,
  updateAttendance,
  deleteAttendance,
  getServiceAttendance,
  getAttendanceTrends,
  getDetailedAttendanceTrends,
  getAttendanceByBranch,
  getMemberAttendanceHistory,
  getFirstTimeVisitors,
  selfCheckIn,
  getMyAttendanceStatus,
  getCrossBranchVisits,
  getMissingMembers,
  getAttendanceByServiceType,
} from './service';

export const attendanceRouter = new Hono();

// All attendance routes require authentication
attendanceRouter.use('*', authMiddleware);

// ── Services CRUD ──────────────────────────────────────────

// Services at other branches (for cross-branch check-in)
attendanceRouter.get('/services/other-branches', async (c) => {
  const auth = getAuth(c);
  const otherBranchServices = await getOtherBranchServices(db, auth);
  return c.json(successResponse(otherBranchServices));
});

attendanceRouter.get('/services', zValidator('query', listServicesQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const result = await listServices(db, auth, query);
  return c.json(successResponse(result));
});

// Must be before /services/:id to avoid "deleted" being treated as an ID
attendanceRouter.get('/services/deleted', requireRole('admin', 'pastor', 'leader'), async (c) => {
  const auth = getAuth(c);
  const deleted = await getDeletedServices(db, auth);
  return c.json(successResponse(deleted));
});

attendanceRouter.get('/services/:id', async (c) => {
  const auth = getAuth(c);
  const service = await getService(db, auth, c.req.param('id')!);
  return c.json(successResponse(service));
});

attendanceRouter.post('/services', requireRole('admin', 'pastor', 'leader'), zValidator('json', createServiceSchema), async (c) => {
  const auth = getAuth(c);
  const service = await createService(db, auth, c.req.valid('json'));
  return c.json(successResponse(service), 201);
});

attendanceRouter.patch('/services/:id', requireRole('admin', 'pastor', 'leader'), zValidator('json', updateServiceSchema), async (c) => {
  const auth = getAuth(c);
  const service = await updateService(db, auth, c.req.param('id')!, c.req.valid('json'));
  return c.json(successResponse(service));
});

attendanceRouter.delete('/services/:id', requireRole('admin', 'pastor', 'leader'), async (c) => {
  const auth = getAuth(c);
  const service = await softDeleteService(db, auth, c.req.param('id')!);
  return c.json(successResponse(service, 'Service moved to trash'));
});

attendanceRouter.post('/services/:id/restore', requireRole('admin', 'pastor', 'leader'), async (c) => {
  const auth = getAuth(c);
  const service = await restoreService(db, auth, c.req.param('id')!);
  return c.json(successResponse(service, 'Service restored'));
});

// ── Service Attendance ─────────────────────────────────────

attendanceRouter.post('/services/:id/attendance', requireRole('admin', 'pastor', 'leader'), zValidator('json', recordAttendanceSchema), async (c) => {
  const auth = getAuth(c);
  const { records } = c.req.valid('json');
  const result = await recordAttendance(db, auth, c.req.param('id')!, records);
  return c.json(successResponse(result, 'Attendance recorded successfully'));
});

attendanceRouter.get('/services/:id/attendance', async (c) => {
  const auth = getAuth(c);
  const attendance = await getServiceAttendance(db, auth, c.req.param('id')!);
  return c.json(successResponse(attendance));
});

attendanceRouter.patch('/services/:serviceId/attendance/:memberId', requireRole('admin', 'pastor', 'leader'), async (c) => {
  const auth = getAuth(c);
  const data = await c.req.json();
  const updated = await updateAttendance(
    db,
    auth,
    c.req.param('serviceId')!,
    c.req.param('memberId')!,
    data,
  );
  return c.json(successResponse(updated, 'Attendance updated successfully'));
});

attendanceRouter.delete('/services/:serviceId/attendance/:memberId', requireRole('admin', 'pastor', 'leader'), async (c) => {
  const auth = getAuth(c);
  const deleted = await deleteAttendance(
    db,
    auth,
    c.req.param('serviceId')!,
    c.req.param('memberId')!,
  );
  return c.json(successResponse(deleted, 'Attendance deleted successfully (undo)'));
});

// ── Reports ────────────────────────────────────────────────

attendanceRouter.get('/reports/trends', zValidator('query', attendanceTrendsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const trends = await getAttendanceTrends(db, auth, query);
  return c.json(successResponse(trends));
});

attendanceRouter.get('/reports/detailed-trends', zValidator('query', attendanceTrendsQuerySchema), async (c) => {
  try {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const detailedTrends = await getDetailedAttendanceTrends(db, auth, query);
    return c.json(successResponse(detailedTrends));
  } catch (error: any) {
    console.error('Detailed trends error:', error);
    return c.json({ success: false, error: error.message || 'Failed to fetch detailed trends' }, 500);
  }
});

attendanceRouter.get('/reports/by-branch', requireRole('admin'), zValidator('query', attendanceByBranchQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const byBranch = await getAttendanceByBranch(db, auth, query);
  return c.json(successResponse(byBranch));
});

attendanceRouter.get('/reports/cross-branch-visits', requireRole('admin', 'pastor', 'leader'), async (c) => {
  const auth = getAuth(c);
  const { branchId, startDate, endDate, weeks } = c.req.query();
  const result = await getCrossBranchVisits(db, auth, {
    branchId,
    startDate,
    endDate,
    weeks: weeks ? parseInt(weeks, 10) : undefined,
  });
  return c.json(successResponse(result));
});

attendanceRouter.get('/reports/missing-members', zValidator('query', attendanceTrendsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const result = await getMissingMembers(db, auth, query);
  return c.json(successResponse(result));
});

attendanceRouter.get('/reports/by-service-type', zValidator('query', attendanceTrendsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const result = await getAttendanceByServiceType(db, auth, query);
  return c.json(successResponse(result));
});

attendanceRouter.get('/reports/first-time-visitors', async (c) => {
  const auth = getAuth(c);
  const query = c.req.query();
  const visitors = await getFirstTimeVisitors(db, auth, query);
  return c.json(successResponse(visitors));
});

attendanceRouter.get('/members/:memberId/history', async (c) => {
  const auth = getAuth(c);
  const query = c.req.query();
  const history = await getMemberAttendanceHistory(
    db,
    auth,
    c.req.param('memberId')!,
    query,
  );
  return c.json(successResponse(history));
});

// ── Self Check-In ──────────────────────────────────────────

attendanceRouter.post('/services/:id/check-in', zValidator('json', selfCheckInSchema), async (c) => {
  const auth = getAuth(c);
  const data = c.req.valid('json');
  const attendance = await selfCheckIn(db, auth, c.req.param('id')!, data);
  return c.json(successResponse(attendance, 'Successfully checked in'), 201);
});

attendanceRouter.get('/services/:id/my-status', async (c) => {
  const auth = getAuth(c);
  const status = await getMyAttendanceStatus(db, auth, c.req.param('id')!);
  return c.json(successResponse(status));
});
