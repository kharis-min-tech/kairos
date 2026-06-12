import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import { listMyRotaQuerySchema } from '../departments/schemas';
import { listMyUpcomingRota } from '../departments/rota-service';
import { getMyLeadership } from './service';
import { meLeadershipResponseSchema } from './schemas';

export const meRouter = new Hono();

meRouter.use('*', authMiddleware);

meRouter.get('/rota', zValidator('query', listMyRotaQuerySchema), async (c) => {
  const auth = getAuth(c);
  const rows = await listMyUpcomingRota(db, auth, c.req.valid('query'));
  return c.json(successResponse(rows));
});

meRouter.get('/leadership', async (c) => {
  const auth = getAuth(c);
  const leadership = await getMyLeadership(db, auth);
  // Validate the response shape — catches left-join edge cases (null
  // fellowshipName / departmentName) at the API boundary rather than
  // letting malformed JSON reach the client.
  const validated = meLeadershipResponseSchema.parse(leadership);
  return c.json(successResponse(validated));
});
