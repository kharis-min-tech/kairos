import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  createProgramSchema,
  listProgramsQuerySchema,
  completeProgramSchema,
  captureSoulSchema,
  listSoulsQuerySchema,
  updateSoulStatusSchema,
  reassignSoulSchema,
  logFollowUpSchema,
  listAlertsQuerySchema,
  registerWorkerSchema,
} from './schemas';
import {
  listPrograms,
  createProgram,
  getProgram,
  completeProgram,
  registerWorker,
  listSouls,
  getSoul,
  captureSoul,
  updateSoulStatus,
  reassignSoul,
  logFollowUp,
  getSoulAlerts,
} from './service';

export const outreachRouter = new Hono();

// All routes require authentication
outreachRouter.use('*', authMiddleware);

// ── Outreach Programs ─────────────────────────────────────

outreachRouter.get(
  '/programs',
  zValidator('query', listProgramsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const result = await listPrograms(db, auth, query);
    return c.json(successResponse(result));
  }
);

outreachRouter.post(
  '/programs',
  requireRole('admin', 'pastor', 'leader'),
  zValidator('json', createProgramSchema),
  async (c) => {
    const auth = getAuth(c);
    const program = await createProgram(db, auth, c.req.valid('json'));
    return c.json(successResponse(program), 201);
  }
);

outreachRouter.get('/programs/:id', async (c) => {
  const auth = getAuth(c);
  const program = await getProgram(db, auth, c.req.param('id')!);
  return c.json(successResponse(program));
});

outreachRouter.patch(
  '/programs/:id/complete',
  requireRole('admin', 'pastor'),
  zValidator('json', completeProgramSchema),
  async (c) => {
    const auth = getAuth(c);
    const program = await completeProgram(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(program));
  }
);

outreachRouter.post(
  '/programs/:id/workers',
  zValidator('json', registerWorkerSchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await registerWorker(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(result), 201);
  }
);

// ── Souls ─────────────────────────────────────────────────

outreachRouter.get(
  '/souls',
  zValidator('query', listSoulsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const result = await listSouls(db, auth, query);
    return c.json(successResponse(result));
  }
);

outreachRouter.post(
  '/souls',
  zValidator('json', captureSoulSchema),
  async (c) => {
    const auth = getAuth(c);
    const soul = await captureSoul(db, auth, c.req.valid('json'));
    return c.json(successResponse(soul), 201);
  }
);

outreachRouter.get(
  '/souls/alerts',
  zValidator('query', listAlertsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const result = await getSoulAlerts(db, auth, query);
    return c.json(successResponse(result));
  }
);

outreachRouter.get('/souls/:id', async (c) => {
  const auth = getAuth(c);
  const soul = await getSoul(db, auth, c.req.param('id')!);
  return c.json(successResponse(soul));
});

outreachRouter.patch(
  '/souls/:id/status',
  zValidator('json', updateSoulStatusSchema),
  async (c) => {
    const auth = getAuth(c);
    const soul = await updateSoulStatus(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(soul));
  }
);

outreachRouter.patch(
  '/souls/:id/reassign',
  requireRole('admin', 'pastor'),
  zValidator('json', reassignSoulSchema),
  async (c) => {
    const auth = getAuth(c);
    const soul = await reassignSoul(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(soul));
  }
);

outreachRouter.post(
  '/souls/:id/followups',
  zValidator('json', logFollowUpSchema),
  async (c) => {
    const auth = getAuth(c);
    const followUp = await logFollowUp(db, auth, c.req.param('id')!, c.req.valid('json'));
    return c.json(successResponse(followUp), 201);
  }
);
