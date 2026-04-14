import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '../lib/response';
import {
  createFormSchema,
  listFormsQuerySchema,
  submitFormSchema,
  listSubmissionsQuerySchema,
  handlePrebuiltSchema,
} from './schemas';
import {
  listForms,
  createForm,
  getForm,
  submitForm,
  listSubmissions,
  handlePrebuilt,
} from './service';

export const formsRouter = new Hono();

// All routes require authentication
formsRouter.use('*', authMiddleware);

// ── Form Definitions ──────────────────────────────────────

formsRouter.get(
  '/',
  zValidator('query', listFormsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const result = await listForms(db, auth, query);
    return c.json(successResponse(result));
  }
);

formsRouter.post(
  '/',
  requireRole('admin', 'pastor'),
  zValidator('json', createFormSchema),
  async (c) => {
    const auth = getAuth(c);
    const form = await createForm(db, auth, c.req.valid('json'));
    return c.json(successResponse(form), 201);
  }
);

formsRouter.get('/:id', async (c) => {
  const auth = getAuth(c);
  const form = await getForm(db, auth, c.req.param('id')!);
  return c.json(successResponse(form));
});

formsRouter.post(
  '/:id/submit',
  zValidator('json', submitFormSchema),
  async (c) => {
    const auth = getAuth(c);
    const submission = await submitForm(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(submission), 201);
  }
);

// ── Submissions ───────────────────────────────────────────

formsRouter.get(
  '/submissions',
  zValidator('query', listSubmissionsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const result = await listSubmissions(db, auth, query);
    return c.json(successResponse(result));
  }
);

// ── Prebuilt Forms ────────────────────────────────────────

/**
 * POST /api/forms/prebuilt
 * Handles altar-call, first-timer, department-signup, etc.
 * The altar-call form automatically enrols the submitting member
 * in the New Believers class via autoEnroll().
 */
formsRouter.post(
  '/prebuilt',
  zValidator('json', handlePrebuiltSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await handlePrebuilt(db, auth, c.req.valid('json'));
    return c.json(successResponse(result), 201);
  }
);
