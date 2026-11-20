import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { successResponse } from '@kairos/utils';
import {
  PILOT_REQUIREMENTS,
  PILOT_REQUIREMENTS_VERSION,
  PILOT_SELECTION_NOTES,
} from '@kairos/types';
import { authMiddleware, requireRole } from '../middleware/auth';
import { db } from '../db';
import {
  listPilotInterestSchema,
  submitPilotInterestSchema,
  updatePilotInterestSchema,
} from './schemas';
import { listPilotInterest, submitPilotInterest, updatePilotInterest } from './service';

/**
 * The pilot sign-up: public to submit, platform admin to read.
 *
 * Mounted BEFORE the consent gate, like the public Gift Aid form, because
 * everyone it serves is a branch leader who has no account yet and so can owe
 * no policy acceptance. Requiring one would be circular: the plan has members
 * signing up only after a branch has been chosen through this form.
 */
export const publicPilotInterestRouter = new Hono();

/**
 * The commitments, served rather than duplicated.
 *
 * The page could hold its own copy of this text, but then the wording a
 * person agreed to and the wording stamped on their row could drift apart
 * silently. One source, one version string.
 */
publicPilotInterestRouter.get('/requirements', (c) =>
  c.json(
    successResponse({
      version: PILOT_REQUIREMENTS_VERSION,
      requirements: PILOT_REQUIREMENTS,
      selectionNotes: PILOT_SELECTION_NOTES,
    }),
  ),
);

publicPilotInterestRouter.post(
  '/',
  zValidator('json', submitPilotInterestSchema),
  async (c) => {
    // Cloudflare sets cf-connecting-ip; x-forwarded-for is the fallback for
    // local and proxied runs.
    const sourceIp =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;

    const result = await submitPilotInterest(db, c.req.valid('json'), {
      sourceIp,
      userAgent: c.req.header('user-agent') ?? null,
    });
    return c.json(successResponse(result), 201);
  },
);

// ── Admin router ──────────────────────────────────────────
//
// Platform admin, not a branch grant. A branch-scoped capability would be the
// wrong shape: this queue is every branch's answers side by side, and the
// whole purpose is comparing them.

export const pilotInterestRouter = new Hono();
pilotInterestRouter.use('*', authMiddleware);
pilotInterestRouter.use('*', requireRole('admin'));

pilotInterestRouter.get('/', zValidator('query', listPilotInterestSchema), async (c) => {
  const result = await listPilotInterest(db, c.req.valid('query'));
  return c.json(successResponse(result));
});

pilotInterestRouter.patch(
  '/:id',
  zValidator('json', updatePilotInterestSchema),
  async (c) => {
    const result = await updatePilotInterest(db, c.req.param('id'), c.req.valid('json'));
    return c.json(successResponse(result));
  },
);
