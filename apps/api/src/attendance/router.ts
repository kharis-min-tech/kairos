import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  createServiceSchema,
  updateServiceSchema,
  listServicesQuerySchema,
  rosterQuerySchema,
  recordAttendanceSchema,
  trendsQuerySchema,
  missingMembersQuerySchema,
  byBranchQuerySchema,
  summaryQuerySchema,
} from './schemas';
import {
  createService,
  listServices,
  getService,
  updateService,
  deleteService,
  getServiceRoster,
  recordAttendance,
  listAttendance,
  getAttendanceTrends,
  getMissingMembers,
  getAttendanceByBranch,
  getAttendanceSummary,
  canRecordAttendance,
} from './service';

export const attendanceRouter = new Hono();

attendanceRouter.use('*', authMiddleware);

// ── Reports (static — declared before /services/:id) ───────

attendanceRouter.get(
  '/reports/trends',
  requireRole('admin', 'pastor', 'leader'),
  zValidator('query', trendsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getAttendanceTrends(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/missing-members',
  requireRole('admin', 'pastor', 'leader'),
  zValidator('query', missingMembersQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getMissingMembers(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/by-branch',
  requireRole('admin', 'pastor', 'leader'),
  zValidator('query', byBranchQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getAttendanceByBranch(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

// Dashboard summary — readable by any authenticated role (branch-scoped in the
// service for non-admins), so the member dashboard can show it.
attendanceRouter.get(
  '/reports/summary',
  zValidator('query', summaryQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getAttendanceSummary(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

// ── Service CRUD ───────────────────────────────────────────

attendanceRouter.get('/services', zValidator('query', listServicesQuerySchema), async (c) => {
  const auth = getAuth(c);
  const result = await listServices(db, auth, c.req.valid('query'));
  return c.json(successResponse(result));
});

attendanceRouter.post(
  '/services',
  zValidator('json', createServiceSchema),
  async (c) => {
    const auth = getAuth(c);
    const created = await createService(db, auth, c.req.valid('json'));
    return c.json(successResponse(created), 201);
  },
);

// ── Attendance (static sub-paths before /services/:id) ─────

attendanceRouter.get(
  '/services/:id/roster',
  zValidator('query', rosterQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getServiceRoster(db, auth, c.req.param('id')!, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.post(
  '/services/:id/records',
  zValidator('json', recordAttendanceSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await recordAttendance(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(result, 'Attendance recorded'), 201);
  },
);

attendanceRouter.get('/services/:id/records', async (c) => {
  const auth = getAuth(c);
  const result = await listAttendance(db, auth, c.req.param('id')!);
  return c.json(successResponse(result));
});

attendanceRouter.get('/services/:id', async (c) => {
  const auth = getAuth(c);
  const result = await getService(db, auth, c.req.param('id')!);
  return c.json(successResponse(result));
});

attendanceRouter.patch(
  '/services/:id',
  zValidator('json', updateServiceSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await updateService(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.delete('/services/:id', async (c) => {
  const auth = getAuth(c);
  const result = await deleteService(db, auth, c.req.param('id')!);
  return c.json(successResponse(result, 'Service deleted'));
});

// ── Caller capability (drives /attendance UI gating) ──────

attendanceRouter.get('/me/can-record', async (c) => {
  const auth = getAuth(c);
  const branchId = c.req.query('branchId');
  const result = await canRecordAttendance(db, auth, branchId ?? undefined);
  return c.json(successResponse(result));
});
