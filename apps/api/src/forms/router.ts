import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  submitFormSchema,
  memberSearchQuerySchema,
  listSubmissionsQuerySchema,
  updateSubmissionSchema,
  exportSubmissionsQuerySchema,
  archiveAttendeesSchema,
} from './schemas';
import {
  submitForm,
  searchMembers,
  listSubmissions,
  getSubmission,
  updateSubmission,
  exportSubmissionsToCSV,
  listDormantAttendees,
  archiveAttendees,
  getMyFormsCapabilities,
} from './service';

export const formsRouter = new Hono();

formsRouter.use('*', authMiddleware);

// ── Static routes (declared BEFORE any /:id-style param) ────

// Caller capabilities — drives /forms landing + /forms/submissions filter gating.
formsRouter.get('/me/capabilities', async (c) => {
  const auth = getAuth(c);
  const result = await getMyFormsCapabilities(db, auth);
  return c.json(successResponse(result));
});

// Member typeahead for the altar-call search-and-select. Any logged-in member.
formsRouter.get(
  '/member-search',
  zValidator('query', memberSearchQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await searchMembers(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

// Submissions list — leader+ (enforced in service).
formsRouter.get(
  '/submissions',
  zValidator('query', listSubmissionsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await listSubmissions(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

// CSV export — must precede /submissions/:id. leader+.
formsRouter.get(
  '/submissions/export',
  zValidator('query', exportSubmissionsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const csv = await exportSubmissionsToCSV(db, auth, c.req.valid('query'));
    const formType = c.req.valid('query').formType;
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="forms-${formType}-export.csv"`);
    return c.body(csv);
  },
);

formsRouter.get('/submissions/:id', async (c) => {
  const auth = getAuth(c);
  const result = await getSubmission(db, auth, c.req.param('id')!);
  return c.json(successResponse(result));
});

formsRouter.patch(
  '/submissions/:id',
  zValidator('json', updateSubmissionSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await updateSubmission(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(result));
  },
);

// ── Dormant attendee lifecycle ─────────────────────────────

formsRouter.get('/attendees/dormant', async (c) => {
  const auth = getAuth(c);
  const branchId = c.req.query('branchId');
  const result = await listDormantAttendees(db, auth, { branchId });
  return c.json(successResponse(result));
});

formsRouter.post(
  '/attendees/archive',
  zValidator('json', archiveAttendeesSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await archiveAttendees(db, auth, c.req.valid('json'));
    return c.json(successResponse(result));
  },
);

// ── Submit (dynamic :formType param sits last) ─────────────

formsRouter.post(
  '/:formType/submit',
  zValidator('json', submitFormSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await submitForm(db, auth, c.req.param('formType')!, c.req.valid('json'));
    return c.json(successResponse(result), 201);
  },
);
