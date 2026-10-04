import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import { createBranchFollowupSchema, followupQueueQuerySchema } from './schemas';
import {
  createBranchFollowup,
  listFirstTimersNeedingFollowup,
  listMembersWithoutGroup,
  listDueFollowups,
} from './service';

/**
 * Cross-cutting follow-up surface. Fellowship- and department-context writes
 * stay on their own module routes, where the context is implicit in the route
 * you called; this router owns the branch context and the queues of people who
 * need a follow-up but belong to no group.
 *
 * Scope is enforced inside the service against the SUBJECT's branch rather than
 * the caller's, so an admin acting across branches files the record in the
 * right place.
 */
export const followupsRouter = new Hono();

followupsRouter.use('*', authMiddleware);

// Static paths before anything parameterised.
followupsRouter.get(
  '/queues/first-timers',
  zValidator('query', followupQueueQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const rows = await listFirstTimersNeedingFollowup(db, auth, c.req.valid('query'));
    return c.json(successResponse(rows));
  },
);

followupsRouter.get(
  '/queues/no-group',
  zValidator('query', followupQueueQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const rows = await listMembersWithoutGroup(db, auth, c.req.valid('query'));
    return c.json(successResponse(rows));
  },
);

followupsRouter.get('/due', zValidator('query', followupQueueQuerySchema), async (c) => {
  const auth = getAuth(c);
  const rows = await listDueFollowups(db, auth, c.req.valid('query'));
  return c.json(successResponse(rows));
});

followupsRouter.post('/', zValidator('json', createBranchFollowupSchema), async (c) => {
  const auth = getAuth(c);
  const created = await createBranchFollowup(db, auth, c.req.valid('json'));
  return c.json(successResponse(created), 201);
});
