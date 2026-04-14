import { Hono } from 'hono';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '../lib/response';
import { getMemberGrowth, getAttendanceTrend, getFellowshipActivity } from './service';

export const reportsRouter = new Hono();

reportsRouter.use('*', authMiddleware);

// GET /api/reports/member-growth — Monthly new signups
reportsRouter.get('/member-growth', requireRole('admin', 'pastor'), async (c) => {
  const auth = getAuth(c);
  const data = await getMemberGrowth(db, auth);
  return c.json(successResponse(data));
});

// GET /api/reports/attendance-trend — Weekly attendance rates
reportsRouter.get('/attendance-trend', requireRole('admin', 'pastor'), async (c) => {
  const auth = getAuth(c);
  const data = await getAttendanceTrend(db, auth);
  return c.json(successResponse(data));
});

// GET /api/reports/fellowship-activity — Fellowship meeting counts & avg attendance
reportsRouter.get('/fellowship-activity', requireRole('admin', 'pastor'), async (c) => {
  const auth = getAuth(c);
  const data = await getFellowshipActivity(db, auth);
  return c.json(successResponse(data));
});
