import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import { listMyRotaQuerySchema } from '../departments/schemas';
import { listMyUpcomingRota } from '../departments/rota-service';
import {
  getMyLeadership,
  deleteMyAccount,
  exportMyData,
  hasPrivilegedRole,
  listMyActivity,
  listMyApprovals,
  listMyFollowups,
} from './service';
import { meLeadershipResponseSchema, deleteAccountSchema } from './schemas';
import {
  listEffectivePreferences,
  upsertPreference,
} from '../notifications/service';
import { updateNotificationPreferenceSchema, recordConsentSchema } from './schemas';
import { listMyAuditLog } from '../audit/service';
import { listConsentStatuses, recordConsent } from '../consent/service';

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

meRouter.get('/approvals', async (c) => {
  const auth = getAuth(c);
  const items = await listMyApprovals(db, auth);
  return c.json(successResponse(items));
});

meRouter.get('/followups', async (c) => {
  const auth = getAuth(c);
  const items = await listMyFollowups(db, auth);
  return c.json(successResponse(items));
});

meRouter.get('/activity', async (c) => {
  const auth = getAuth(c);
  const items = await listMyActivity(db, auth);
  return c.json(successResponse(items));
});

meRouter.get('/audit-log', async (c) => {
  const auth = getAuth(c);
  const entries = await listMyAuditLog(db, auth.memberId);
  return c.json(successResponse({ entries }));
});

meRouter.get('/consent', async (c) => {
  const auth = getAuth(c);
  const isPrivileged = await hasPrivilegedRole(db, auth);
  const statuses = await listConsentStatuses(db, auth.memberId, isPrivileged);
  return c.json(successResponse({ statuses }));
});

meRouter.post(
  '/consent',
  zValidator('json', recordConsentSchema),
  async (c) => {
    const auth = getAuth(c);
    const body = c.req.valid('json');
    const updated = await recordConsent(db, auth.memberId, body.consentType, body.granted);
    return c.json(successResponse(updated));
  },
);

meRouter.get('/export', async (c) => {
  const auth = getAuth(c);
  const data = await exportMyData(db, auth.memberId);
  return c.json(successResponse(data));
});

meRouter.post(
  '/delete-account',
  zValidator('json', deleteAccountSchema),
  async (c) => {
    const auth = getAuth(c);
    const body = c.req.valid('json');
    await deleteMyAccount(db, auth.memberId, body.currentPassword);
    return c.json(successResponse({ deleted: true }));
  },
);
