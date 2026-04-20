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
  conversionFunnelQuerySchema,
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
    
    // Authorization check
    if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
      return c.json({ error: 'Only Admin, Pastor, and Leader can create programs' }, 403);
    }

    const input = c.req.valid('json');

    try {
      const program = await createProgram(db, input, auth);
      return c.json({ success: true, data: program }, 201);
    } catch (err: any) {
      if (err.name === 'ConflictError') {
        return c.json({ error: err.message }, 409);
      }
      if (err.name === 'ValidationError') {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
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
  

  try {
    const program = await getProgram(db, programId, auth);
    return c.json({ success: true, data: program });
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return c.json({ error: err.message }, 404);
    }
    if (err.name === 'ForbiddenError') {
      return c.json({ error: err.message }, 403);
    }
    throw err;
  }
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
    

    try {
      const program = await updateProgram(db, programId, input, auth);
      return c.json({ success: true, data: program });
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return c.json({ error: err.message }, 404);
      }
      if (err.name === 'ForbiddenError') {
        return c.json({ error: err.message }, 403);
      }
      throw err;
    }
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
    

    try {
      const result = await registerWorker(db, programId, input, auth);
      return c.json({ success: true, data: result }, 201);
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return c.json({ error: err.message }, 404);
      }
      if (err.name === 'ValidationError') {
        return c.json({ error: err.message }, 400);
      }
      if (err.name === 'ConflictError') {
        return c.json({ error: err.message }, 409);
      }
      throw err;
    }
  }
);

/**
 * GET /api/outreach/reports/conversion-funnel
 * Get conversion funnel metrics
 */
app.get(
  '/reports/conversion-funnel',
  zValidator('query', conversionFunnelQuerySchema),
  async (c) => {

    // TODO: Implement getConversionFunnelMetrics service function
    // For now, return placeholder
    return c.json({
      success: true,
      data: {
        statusCounts: {},
        conversionRate: 0,
        averageDaysToConversion: 0,
      },
    });
  }
);

export default app;
