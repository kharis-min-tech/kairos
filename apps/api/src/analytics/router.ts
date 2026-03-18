import { Hono } from 'hono';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import { getAdminStats, getBranchStats, getMemberStats } from './service';

export const analyticsRouter = new Hono();

analyticsRouter.use('*', authMiddleware);

// GET /api/analytics/admin — Church-wide stats (admin only)
analyticsRouter.get('/admin', async (c) => {
  const auth = getAuth(c);
  const stats = await getAdminStats(db, auth);
  return c.json(successResponse(stats));
});

// GET /api/analytics/branch — Branch stats (pastor/leader dashboard)
analyticsRouter.get('/branch', async (c) => {
  const auth = getAuth(c);
  const stats = await getBranchStats(db, auth);
  return c.json(successResponse(stats));
});

// GET /api/analytics/member — Personal stats (member dashboard)
analyticsRouter.get('/member', async (c) => {
  const auth = getAuth(c);
  const stats = await getMemberStats(db, auth);
  return c.json(successResponse(stats));
});
