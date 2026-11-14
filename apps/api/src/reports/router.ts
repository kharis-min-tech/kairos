import { Hono } from 'hono';
import { authMiddleware, requireCapability, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import { getMemberGrowth, getAttendanceTrend, getFellowshipActivity } from './service';

export const reportsRouter = new Hono();

reportsRouter.use('*', authMiddleware);

/**
 * These three endpoints return BRANCH-WIDE aggregates, so they are leadership
 * reading, not member reading.
 *
 * They used to carry `requireBranchRead`,
 * which looked restrictive and was not: `requireRole` tests membership of
 * `auth.systemRole`, and since that collapsed to 'admin' | 'member' both
 * possible values were in the list. Every authenticated caller passed. The
 * service still narrowed to the caller's own branch, so nothing leaked across
 * branches — but a plain member could read their branch's growth and
 * attendance curves, and a gate that reads as a gate and is not will
 * eventually be trusted.
 *
 * Scoped to the caller's own branch, deliberately. A scope-less
 * `requireCapability('branch:read')` is true for anyone holding the
 * capability on ANY branch, which is the recurring bug class in this codebase.
 */
const requireBranchRead = requireCapability('branch:read', (c) => ({
  kind: 'branch' as const,
  id: getAuth(c).branchId,
}));

// GET /api/reports/member-growth — Monthly new signups
reportsRouter.get('/member-growth', requireBranchRead, async (c) => {
  const auth = getAuth(c);
  const data = await getMemberGrowth(db, auth);
  return c.json(successResponse(data));
});

// GET /api/reports/attendance-trend — Weekly attendance rates
reportsRouter.get('/attendance-trend', requireBranchRead, async (c) => {
  const auth = getAuth(c);
  const data = await getAttendanceTrend(db, auth);
  return c.json(successResponse(data));
});

// GET /api/reports/fellowship-activity — Fellowship meeting counts & avg attendance
reportsRouter.get('/fellowship-activity', requireBranchRead, async (c) => {
  const auth = getAuth(c);
  const data = await getFellowshipActivity(db, auth);
  return c.json(successResponse(data));
});
