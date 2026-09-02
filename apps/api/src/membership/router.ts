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
  assignTeacherSchema,
  enrolMembersSchema,
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
  assignTeacher,
  removeTeacher,
  upsertSession,
  enrolSelf,
  enrolMembers,
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

// ── Caller's own progress ─────────────────────────────────────────────────
// Static paths must sit ABOVE any `/:id` route (apps/api/CLAUDE.md).

membershipRouter.get('/me', async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await getMyMembership(db, auth)));
});

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

// ── Teachers ──────────────────────────────────────────────────────────────

membershipRouter.post(
  '/cohorts/:id/teachers',
  zValidator('json', assignTeacherSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(await assignTeacher(db, auth, c.req.param('id'), c.req.valid('json'))),
      201,
    );
  },
);

membershipRouter.delete('/cohorts/:id/teachers/:memberId', async (c) => {
  const auth = getAuth(c);
  return c.json(
    successResponse(
      await removeTeacher(db, auth, c.req.param('id'), c.req.param('memberId')),
    ),
  );
});

// ── Sessions ──────────────────────────────────────────────────────────────
// Upsert by session number: there is exactly one session 3 per cohort, so
// scheduling it twice moves it rather than duplicating it.

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

// ── Enrolment ─────────────────────────────────────────────────────────────

/** Self-enrolment. People sign up whenever they want; no admin needed. */
membershipRouter.post('/cohorts/:id/enrol', async (c) => {
  const auth = getAuth(c);
  return c.json(successResponse(await enrolSelf(db, auth, c.req.param('id'))), 201);
});

membershipRouter.post(
  '/cohorts/:id/enrollments',
  zValidator('json', enrolMembersSchema),
  async (c) => {
    const auth = getAuth(c);
    return c.json(
      successResponse(await enrolMembers(db, auth, c.req.param('id'), c.req.valid('json'))),
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
// whole roster, matching how a teacher works through a register.

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
