import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  createCohortSchema,
  updateCohortSchema,
  listCohortsQuerySchema,
  upsertSessionSchema,
  admitMembersSchema,
  listInterestQuerySchema,
  saveSessionRecordsSchema,
  recordFinalTestSchema,
  recordInductionSchema,
  graduateSchema,
  withdrawEnrollmentSchema,
  listEnrollmentsQuerySchema,
} from './schemas';
import {
  listCohorts,
  getCohort,
  createCohort,
  updateCohort,
  archiveCohort,
  upsertSession,
  expressInterest,
  withdrawInterest,
  listInterest,
  admitMembers,
  listEnrollments,
  withdrawEnrollment,
  saveSessionRecords,
  recordFinalTest,
  recordInduction,
  getEnrollmentDetail,
  graduateMembers,
  getMyMembership,
} from './service';

export const membershipRouter = new Hono();

membershipRouter.use('*', authMiddleware);

// Authority is enforced in the service rather than by `requireCapability`
// here. The gate is `membership:admin` at CHURCH_SCOPE for every admin
// action, and several routes mix an admin path with a self-service one on the
// same handler (withdrawing your own enrolment, reading your own progress) —
// which a route-level middleware cannot express. See service.ts's authority
// block.

// ── Caller's own membership ───────────────────────────────────────────────
// Static paths must sit ABOVE any `/:id` route (apps/api/CLAUDE.md).

membershipRouter.get('/me', async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await getMyMembership(db, auth)));
});

// ── The interest pool ─────────────────────────────────────────────────────
// Enrolment is not self-service. Expressing interest puts a member in a
// church-wide pool; an admin later admits them into a cohort.

/** Join the pool. The caller's own action, open to any approved member. */
membershipRouter.post('/interest', async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await expressInterest(db, auth)), 201);
});

/** Leave the pool. Terminal — re-joining later starts a fresh wait. */
membershipRouter.delete('/interest', async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await withdrawInterest(db, auth)));
});

/** The admin's view of who is waiting. */
membershipRouter.get(
  '/interest',
  zValidator('query', listInterestQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(successResponse(await listInterest(db, auth, c.req.valid('query'))));
  },
);

// ── Cohorts ───────────────────────────────────────────────────────────────

membershipRouter.get(
  '/cohorts',
  zValidator('query', listCohortsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(successResponse(await listCohorts(db, auth, c.req.valid('query'))));
  },
);

membershipRouter.post('/cohorts', zValidator('json', createCohortSchema), async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await createCohort(db, auth, c.req.valid('json'))), 201);
});

membershipRouter.get('/cohorts/:id', async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await getCohort(db, auth, c.req.param('id'))));
});

membershipRouter.patch(
  '/cohorts/:id',
  zValidator('json', updateCohortSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(await updateCohort(db, auth, c.req.param('id'), c.req.valid('json'))),
    );
  },
);

membershipRouter.delete('/cohorts/:id', async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await archiveCohort(db, auth, c.req.param('id'))));
});

// ── Sessions ──────────────────────────────────────────────────────────────
// Upsert by session number: there is exactly one session 3 per cohort, so
// scheduling it twice moves it rather than duplicating it. `teacherId` names
// whoever is teaching that one session, which varies within a cohort and
// confers no permissions.

membershipRouter.put(
  '/cohorts/:id/sessions',
  zValidator('json', upsertSessionSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(await upsertSession(db, auth, c.req.param('id'), c.req.valid('json'))),
    );
  },
);

// ── Admission ─────────────────────────────────────────────────────────────

membershipRouter.post(
  '/cohorts/:id/admit',
  zValidator('json', admitMembersSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(await admitMembers(db, auth, c.req.param('id'), c.req.valid('json'))),
      201,
    );
  },
);

membershipRouter.get(
  '/cohorts/:id/enrollments',
  zValidator('query', listEnrollmentsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(
        await listEnrollments(db, auth, c.req.param('id'), c.req.valid('query')),
      ),
    );
  },
);

// ── Marking ───────────────────────────────────────────────────────────────
// One bulk write per session: attendance plus homework and quiz marks for the
// whole roster, matching how an admin works through a register.

membershipRouter.put(
  '/sessions/:sessionId/records',
  zValidator('json', saveSessionRecordsSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(
        await saveSessionRecords(db, auth, c.req.param('sessionId'), c.req.valid('json')),
      ),
    );
  },
);

membershipRouter.post(
  '/final-test',
  zValidator('json', recordFinalTestSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(successResponse(await recordFinalTest(db, auth, c.req.valid('json'))));
  },
);

membershipRouter.post(
  '/cohorts/:id/induction',
  zValidator('json', recordInductionSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(await recordInduction(db, auth, c.req.param('id'), c.req.valid('json'))),
    );
  },
);

// ── Graduation ────────────────────────────────────────────────────────────

membershipRouter.post(
  '/cohorts/:id/graduate',
  zValidator('json', graduateSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(await graduateMembers(db, auth, c.req.param('id'), c.req.valid('json'))),
    );
  },
);

// ── Enrolments ────────────────────────────────────────────────────────────

membershipRouter.get('/enrollments/:enrollmentId', async (c) => {
  const auth = getAuth(c);
  return c.json(
    successResponse(await getEnrollmentDetail(db, auth, c.req.param('enrollmentId'))),
  );
});

membershipRouter.post(
  '/enrollments/:enrollmentId/withdraw',
  zValidator('json', withdrawEnrollmentSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(
        await withdrawEnrollment(db, auth, c.req.param('enrollmentId'), c.req.valid('json')),
      ),
    );
  },
);
