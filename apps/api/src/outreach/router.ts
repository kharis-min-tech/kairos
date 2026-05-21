import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';
import type { AuthContext } from '@kairos/types';
import {
  createProgramSchema,
  updateProgramSchema,
  listProgramsQuerySchema,
  registerWorkerSchema,
} from './schemas';
import {
  createProgram,
  listPrograms,
  getProgram,
  updateProgram,
  registerWorker,
} from './service';
import dashboardRouter from './dashboard-router';

type Variables = {
  auth: AuthContext;
};

const app = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// Mount dashboard routes
app.route('/dashboard', dashboardRouter);

/**
 * POST /api/outreach/programs
 * Create a new outreach program
 * Requires: Admin or Pastor role
 */
app.post(
  '/programs',
  zValidator('json', createProgramSchema),
  async (c) => {
    const auth = c.get('auth');
    const effectiveRole = auth.activeRole ?? auth.systemRole;

    if (!['admin', 'pastor', 'leader'].includes(effectiveRole)) {
      return c.json({ error: 'Only Admin, Pastor, and Leader can create programs' }, 403);
    }

    const input = c.req.valid('json');

    const program = await createProgram(db, input, auth);
    return c.json({ success: true, data: program }, 201);
  }
);

/**
 * GET /api/outreach/programs
 * List outreach programs with pagination and filters
 */
app.get(
  '/programs',
  zValidator('query', listProgramsQuerySchema),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');
    

    const result = await listPrograms(db, auth, query);
    return c.json({ success: true, data: { data: result.data, meta: result.pagination } });
  }
);

/**
 * GET /api/outreach/programs/:id
 * Get a single outreach program with details
 */
app.get('/programs/:id', async (c) => {
  const auth = c.get('auth');
  const programId = c.req.param('id');

  const program = await getProgram(db, programId, auth);
  return c.json({ success: true, data: program });
});

/**
 * PUT /api/outreach/programs/:id
 * Update an outreach program
 * Requires: Admin, Pastor, or Coordinator
 */
app.put(
  '/programs/:id',
  zValidator('json', updateProgramSchema),
  async (c) => {
    const auth = c.get('auth');
    const programId = c.req.param('id');
    const input = c.req.valid('json');

    const program = await updateProgram(db, programId, input, auth);
    return c.json({ success: true, data: program });
  }
);

/**
 * POST /api/outreach/programs/:id/participants
 * Register a worker for an outreach program
 */
app.post(
  '/programs/:id/participants',
  zValidator('json', registerWorkerSchema),
  async (c) => {
    const auth = c.get('auth');
    const programId = c.req.param('id');
    const input = c.req.valid('json');

    const result = await registerWorker(db, programId, input, auth);
    return c.json({ success: true, data: result }, 201);
  }
);

export default app;
