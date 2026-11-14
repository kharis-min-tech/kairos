import type { Context } from 'hono';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireAnyCapability, getAuth } from '../middleware/auth';
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
  cohortDiffSchema,
  myAttendanceQuerySchema,
  groupAttendanceQuerySchema,
  heatmapQuerySchema,
  frequencyBucketsQuerySchema,
  firstTimeReturningQuerySchema,
  selfCheckInQrBodySchema,
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
  selfCheckIn,
  listSelfCheckInCandidates,
  getCohortDiff,
  getMyAttendance,
  getDepartmentAttendance,
  getFellowshipAttendance,
  getAttendanceHeatmap,
  getFrequencyBuckets,
  getFirstTimeReturning,
  generateQrToken,
  selfCheckInWithQrToken,
} from './service';

/**
 * Reads SELF_CHECK_IN_QR_SECRET from the Worker env binding (production /
 * staging) or process.env (local Node dev). Mirrors `getAuthSecrets` in
 * lib/auth-secrets.ts so the two secret-fetching flows stay uniform.
 *
 * Set the secret with:
 *   wrangler secret put SELF_CHECK_IN_QR_SECRET
 *   wrangler secret put --env staging SELF_CHECK_IN_QR_SECRET
 */
function readQrSecret(c: Context): string {
  const env = (c as { env?: unknown }).env;
  if (env && typeof env === 'object') {
    const v = (env as Record<string, unknown>)['SELF_CHECK_IN_QR_SECRET'];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env['SELF_CHECK_IN_QR_SECRET'];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  // Dev fallback keeps local integration cheap; production MUST set the secret
  // (Worker deploys will emit a warning if it's missing).
  return 'dev-self-check-in-qr-secret';
}

export const attendanceRouter = new Hono();

attendanceRouter.use('*', authMiddleware);

// ── Reports (static — declared before /services/:id) ───────

attendanceRouter.get(
  '/reports/trends',
  requireAnyCapability('branch:read', 'fellowship:read', 'department:read'),
  zValidator('query', trendsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getAttendanceTrends(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/missing-members',
  requireAnyCapability('branch:read', 'fellowship:read', 'department:read'),
  zValidator('query', missingMembersQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getMissingMembers(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.post(
  '/reports/cohort-diff',
  requireAnyCapability('branch:read', 'fellowship:read', 'department:read'),
  zValidator('json', cohortDiffSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getCohortDiff(db, auth, c.req.valid('json'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/department/:branchDeptId',
  zValidator('query', groupAttendanceQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getDepartmentAttendance(
      db,
      auth,
      c.req.param('branchDeptId')!,
      c.req.valid('query'),
    );
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/fellowship/:fellowshipId',
  zValidator('query', groupAttendanceQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getFellowshipAttendance(
      db,
      auth,
      c.req.param('fellowshipId')!,
      c.req.valid('query'),
    );
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/by-branch',
  requireAnyCapability('branch:read', 'fellowship:read', 'department:read'),
  zValidator('query', byBranchQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getAttendanceByBranch(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/heatmap',
  requireAnyCapability('branch:read', 'fellowship:read', 'department:read'),
  zValidator('query', heatmapQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getAttendanceHeatmap(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/frequency-buckets',
  requireAnyCapability('branch:read', 'fellowship:read', 'department:read'),
  zValidator('query', frequencyBucketsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getFrequencyBuckets(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get(
  '/reports/first-time-returning',
  requireAnyCapability('branch:read', 'fellowship:read', 'department:read'),
  zValidator('query', firstTimeReturningQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getFirstTimeReturning(db, auth, c.req.valid('query'));
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

// Self check-in — signed-in member records their own attendance inside the
// branch-configured window. See selfCheckIn service comment for the guardrails.
attendanceRouter.post('/services/:id/self-check-in', async (c) => {
  const auth = getAuth(c);
  const result = await selfCheckIn(db, auth, c.req.param('id')!);
  return c.json(
    successResponse(
      result,
      result.alreadyCheckedIn
        ? `Already checked in. Status: ${result.status}`
        : `Checked in as ${result.status}`,
    ),
    result.alreadyCheckedIn ? 200 : 201,
  );
});

// ── Rotating QR (admin displays, member scans) ────────────
//
// GET  /services/:id/qr-token          → admin-only current token + expiry
// POST /services/:id/self-check-in-qr  → member scan → verify → check-in
//
// The token is a stateless HMAC over `{serviceId, timeBucket}`; the verifier
// accepts the current or previous bucket to survive a mid-second scan. See
// self-check-in-qr.ts + docs/self-check-in.md.

attendanceRouter.get('/services/:id/qr-token', async (c) => {
  const auth = getAuth(c);
  const result = await generateQrToken(db, auth, c.req.param('id')!, readQrSecret(c));
  return c.json(successResponse(result));
});

attendanceRouter.post(
  '/services/:id/self-check-in-qr',
  zValidator('json', selfCheckInQrBodySchema),
  async (c) => {
    const auth = getAuth(c);
    const { token } = c.req.valid('json');
    const result = await selfCheckInWithQrToken(
      db,
      auth,
      c.req.param('id')!,
      token,
      readQrSecret(c),
    );
    return c.json(
      successResponse(
        result,
        result.alreadyCheckedIn
          ? `Already checked in. Status: ${result.status}`
          : `Checked in as ${result.status}`,
      ),
      result.alreadyCheckedIn ? 200 : 201,
    );
  },
);

// Candidates: today's services with per-service window state so the mobile
// Check-in tab can render the CTA (open) / countdown (opens-soon) / hint (closed)
// without duplicating the window math.
attendanceRouter.get('/self-check-in/candidates', async (c) => {
  const auth = getAuth(c);
  const result = await listSelfCheckInCandidates(db, auth);
  return c.json(successResponse(result));
});

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

// ── Caller capability + personal snapshot (drives UI) ────

attendanceRouter.get(
  '/me',
  zValidator('query', myAttendanceQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await getMyAttendance(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

attendanceRouter.get('/me/can-record', async (c) => {
  const auth = getAuth(c);
  const branchId = c.req.query('branchId');
  const result = await canRecordAttendance(db, auth, branchId ?? undefined);
  return c.json(successResponse(result));
});
