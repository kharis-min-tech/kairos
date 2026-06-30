import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import { listMyRotaQuerySchema } from '../departments/schemas';
import { listMyUpcomingRota } from '../departments/rota-service';
import { getMyLeadership } from './service';
import { meLeadershipResponseSchema } from './schemas';
import {
  listEffectivePreferences,
  upsertPreference,
} from '../notifications/service';
import { updateNotificationPreferenceSchema } from './schemas';
import { listMyAuditLog } from '../audit/service';

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

meRouter.get('/notification-preferences', async (c) => {
  const auth = getAuth(c);
  const preferences = await listEffectivePreferences(db, auth.memberId);
  return c.json(successResponse({ preferences }));
});

meRouter.put(
  '/notification-preferences',
  zValidator('json', updateNotificationPreferenceSchema),
  async (c) => {
    const auth = getAuth(c);
    const updated = await upsertPreference(db, auth.memberId, c.req.valid('json'));
    return c.json(successResponse(updated));
  },
);

meRouter.get('/audit-log', async (c) => {
  const auth = getAuth(c);
  const entries = await listMyAuditLog(db, auth.memberId);
  return c.json(successResponse({ entries }));
});
