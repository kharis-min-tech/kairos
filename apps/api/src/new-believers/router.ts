import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '../lib/response';
import {
  createEnrollmentSchema,
  updateEnrollmentSchema,
  listEnrollmentsQuerySchema,
  createSessionSchema,
  recordAttendanceSchema,
  listSessionsQuerySchema,
} from './schemas';
import {
  listEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollment,
  listSessions,
  createSession,
  recordSessionAttendance,
  getSessionAttendance,
} from './service';

export const newBelieversRouter = new Hono();

// All routes require authentication
newBelieversRouter.use('*', authMiddleware);

// ── Enrollments ────────────────────────────────────────────

newBelieversRouter.get(
  '/enrollments',
  zValidator('query', listEnrollmentsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const result = await listEnrollments(db, auth, query);
    return c.json(successResponse(result));
  }
);

newBelieversRouter.get('/enrollments/alerts', async (c) => {
  const auth = getAuth(c);
  // Reuse listEnrollments with stale=true to surface at-risk members
  const result = await listEnrollments(db, auth, {
    stale: true,
    page: 1,
    limit: 100,
  });
  return c.json(successResponse(result));
});

newBelieversRouter.get('/enrollments/:id', async (c) => {
  const auth = getAuth(c);
  const enrollment = await getEnrollment(db, auth, c.req.param('id')!);
  return c.json(successResponse(enrollment));
});

newBelieversRouter.post(
  '/enrollments',
  requireRole('admin', 'pastor'),
  zValidator('json', createEnrollmentSchema),
  async (c) => {
    const auth = getAuth(c);
    const enrollment = await createEnrollment(db, auth, c.req.valid('json'));
    return c.json(successResponse(enrollment), 201);
  }
);

newBelieversRouter.patch(
  '/enrollments/:id',
  zValidator('json', updateEnrollmentSchema),
  async (c) => {
    const auth = getAuth(c);
    const enrollment = await updateEnrollment(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(enrollment));
  }
);

// ── Sessions ───────────────────────────────────────────────

newBelieversRouter.get(
  '/sessions',
  zValidator('query', listSessionsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const sessions = await listSessions(db, auth, query);
    return c.json(successResponse(sessions));
  }
);

newBelieversRouter.post(
  '/sessions',
  zValidator('json', createSessionSchema),
  async (c) => {
    const auth = getAuth(c);
    const session = await createSession(db, auth, c.req.valid('json'));
    return c.json(successResponse(session), 201);
  }
);

// ── Attendance ─────────────────────────────────────────────

newBelieversRouter.get('/sessions/:sessionId/attendance', async (c) => {
  const auth = getAuth(c);
  const attendance = await getSessionAttendance(db, auth, c.req.param('sessionId')!);
  return c.json(successResponse(attendance));
});

newBelieversRouter.post(
  '/sessions/:sessionId/attendance',
  zValidator('json', recordAttendanceSchema),
  async (c) => {
    const auth = getAuth(c);
    const { records } = c.req.valid('json');
    const result = await recordSessionAttendance(db, auth, c.req.param('sessionId')!, records);
    return c.json(successResponse(result, 'Attendance recorded'));
  }
);
