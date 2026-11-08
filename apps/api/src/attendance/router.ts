import type { Context } from 'hono';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireAnyCapability, getAuth } from '../middleware/auth';
import { db } from '../db';
import { requireSecret } from '../lib/secret-env';
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
 * staging) or process.env (local Node dev). Shares `requireSecret` with
 * `lib/auth-secrets.ts` so the two secret-fetching flows stay uniform — and so
 * both fail closed rather than falling back to a committed default.
 *
 * This secret signs the self-check-in QR token. A public fallback would let
 * anyone mint a token that marks any member present at any service, so it has
 * no usable default outside local development.
 *
 * Set the secret with:
 *   wrangler secret put SELF_CHECK_IN_QR_SECRET
 *   wrangler secret put --env staging SELF_CHECK_IN_QR_SECRET
 */
function readQrSecret(c: Context): string {
  return requireSecret(c, 'SELF_CHECK_IN_QR_SECRET', 'dev-self-check-in-qr-secret');
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

// The honour-system self-check-in endpoint used to live here: a signed-in
// member POSTed and was recorded present, from anywhere. It is gone.
//
// It wrote a row byte-identical to the QR-verified one — same `recordedBy`,
// same status — so once both paths existed there was no way to tell a
// verified attendance from an asserted one, and the whole dataset had to be
// read as self-asserted. Attendance is now recorded only where somebody was
// seen: the member scans the rotating desk code below, or an usher scans the
// member's own code and records them through `recordAttendance`.
//
// If a fallback is ever wanted, it must be distinguishable in the data —
// a column, not another endpoint writing the same row.

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
