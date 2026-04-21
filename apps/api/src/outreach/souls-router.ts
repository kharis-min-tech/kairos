import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';
import type { AuthContext } from '@kairos/types';
import {
  captureSoulSchema,
  updateSoulStatusSchema,
  reassignSoulSchema,
  bulkReassignSoulsSchema,
  listSoulsQuerySchema,
  logFollowUpSchema,
} from './schemas';
import {
  captureSoul,
  updateSoulStatus,
  listSouls,
  getSoul,
  reassignSoul,
  bulkReassignSouls,
  exportSoulsToCSV,
} from './souls-service';
import { logFollowUp, getFollowUpHistory } from './follow-ups-service';
import { convertSoulToMember } from './conversion-service';


type Variables = {
  auth: AuthContext;
};

const app = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

/**
 * POST /api/souls
 * Capture a new soul
 */
app.post(
  '/',
  zValidator('json', captureSoulSchema),
  async (c) => {
    const auth = c.get('auth');
    const input = c.req.valid('json');
    

    try {
      const soul = await captureSoul(db, input, auth);
      return c.json({ success: true, data: soul }, 201);
    } catch (err: any) {
      if (err.name === 'ValidationError') {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  }
);

/**
 * GET /api/souls
 * List souls with pagination and filters
 */
app.get(
  '/',
  zValidator('query', listSoulsQuerySchema),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');
    

    const result = await listSouls(db, auth, query);
    return c.json({ success: true, data: { data: result.data, meta: result.pagination } });
  }
);

/**
 * GET /api/souls/export
 * Export souls to CSV
 * Requires: Admin or Pastor role
 */
app.get('/export', async (c) => {
  const auth = c.get('auth');
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  if (!['admin', 'pastor', 'leader'].includes(effectiveRole)) {
    return c.json({ error: 'Only Admin, Pastor, and Leader can export souls' }, 403);
  }

  
  const csv = await exportSoulsToCSV(db, auth);

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="souls-export.csv"');
  return c.body(csv);
});

/**
 * GET /api/souls/:id
 * Get a single soul with details
 */
app.get('/:id', async (c) => {
  const auth = c.get('auth');
  const soulId = c.req.param('id');
  

  try {
    const soul = await getSoul(db, soulId, auth);
    return c.json({ success: true, data: soul });
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
 * PUT /api/souls/:id/status
 * Update soul status
 */
app.put(
  '/:id/status',
  zValidator('json', updateSoulStatusSchema),
  async (c) => {
    const auth = c.get('auth');
    const soulId = c.req.param('id');
    const input = c.req.valid('json');
    

    try {
      const soul = await updateSoulStatus(db, soulId, input, auth);
      return c.json({ success: true, data: soul });
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return c.json({ error: err.message }, 404);
      }
      if (err.name === 'ValidationError') {
        return c.json({ error: err.message }, 400);
      }
      if (err.name === 'ForbiddenError') {
        return c.json({ error: err.message }, 403);
      }
      throw err;
    }
  }
);

/**
 * PUT /api/souls/:id/assign
 * Reassign a soul to a different worker
 * Requires: Admin or Pastor role
 */
app.put(
  '/:id/assign',
  zValidator('json', reassignSoulSchema),
  async (c) => {
    const auth = c.get('auth');
    const effectiveRole = auth.activeRole ?? auth.systemRole;

    if (!['admin', 'pastor', 'leader'].includes(effectiveRole)) {
      return c.json({ error: 'Only Admin, Pastor, and Leader can reassign souls' }, 403);
    }

    const soulId = c.req.param('id');
    const input = c.req.valid('json');
    

    try {
      const soul = await reassignSoul(db, soulId, input, auth);
      return c.json({ success: true, data: soul });
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return c.json({ error: err.message }, 404);
      }
      if (err.name === 'ValidationError') {
        return c.json({ error: err.message }, 400);
      }
      if (err.name === 'ForbiddenError') {
        return c.json({ error: err.message }, 403);
      }
      throw err;
    }
  }
);

/**
 * POST /api/souls/bulk-assign
 * Bulk reassign multiple souls to a worker
 * Requires: Admin, Pastor, or Leader role
 */
app.post(
  '/bulk-assign',
  zValidator('json', bulkReassignSoulsSchema),
  async (c) => {
    const auth = c.get('auth');
    const effectiveRole = auth.activeRole ?? auth.systemRole;

    if (!['admin', 'pastor', 'leader'].includes(effectiveRole)) {
      return c.json({ error: 'Only Admin, Pastor, and Leader can bulk reassign souls' }, 403);
    }

    const input = c.req.valid('json');
    

    try {
      const result = await bulkReassignSouls(db, input, auth);
      return c.json({ success: true, data: result });
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return c.json({ error: err.message }, 404);
      }
      if (err.name === 'ValidationError') {
        return c.json({ error: err.message }, 400);
      }
      if (err.name === 'ForbiddenError') {
        return c.json({ error: err.message }, 403);
      }
      throw err;
    }
  }
);

/**
 * GET /api/souls/:id/follow-ups
 * Get follow-up history for a soul
 */
app.get('/:id/follow-ups', async (c) => {
  const auth = c.get('auth');
  const soulId = c.req.param('id');
  

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  try {
    const result = await getFollowUpHistory(db, soulId, auth, { page, limit });
    return c.json({ success: true, ...result });
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
 * POST /api/souls/:id/follow-ups
 * Log a follow-up for a soul
 */
app.post(
  '/:id/follow-ups',
  zValidator('json', logFollowUpSchema),
  async (c) => {
    const auth = c.get('auth');
    const soulId = c.req.param('id');
    const input = c.req.valid('json');
    

    try {
      const followUp = await logFollowUp(db, soulId, input, auth);
      return c.json({ success: true, data: followUp }, 201);
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return c.json({ error: err.message }, 404);
      }
      if (err.name === 'ValidationError') {
        return c.json({ error: err.message }, 400);
      }
      if (err.name === 'ForbiddenError') {
        return c.json({ error: err.message }, 403);
      }
      throw err;
    }
  }
);

/**
 * POST /api/souls/:id/convert
 * Convert a soul to a member
 */
app.post('/:id/convert', async (c) => {
  const auth = c.get('auth');
  const soulId = c.req.param('id');
  

  try {
    const result = await convertSoulToMember(db, soulId, auth);
    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return c.json({ error: err.message }, 404);
    }
    if (err.name === 'ConflictError') {
      return c.json({ error: err.message }, 409);
    }
    if (err.name === 'ForbiddenError') {
      return c.json({ error: err.message }, 403);
    }
    throw err;
  }
});

export default app;
