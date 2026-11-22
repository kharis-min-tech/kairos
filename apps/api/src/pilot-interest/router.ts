import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { successResponse } from '@kairos/utils';
import { PILOT_REQUIREMENTS, PILOT_REQUIREMENTS_VERSION } from '@kairos/types';
import { submitPilotInterestSchema } from './schemas';
import { submitPilotInterest } from './service';

/**
 * The pilot sign-up. Public, and public is all of it.
 *
 * Mounted BEFORE the consent gate, like the public Gift Aid form, because
 * everyone it serves is a branch leader who has no account yet and so can owe
 * no policy acceptance. Requiring one would be circular: the plan has members
 * signing up only after a branch has been chosen through this form.
 *
 * There is no admin half any more. A submission is an email, so the queue is
 * an inbox, and there is nothing here to read back.
 */
export const publicPilotInterestRouter = new Hono();

/**
 * The commitments, served rather than duplicated.
 *
 * The page could hold its own copy of this text, but then the wording a
 * person read and the wording quoted in the notification could drift apart
 * silently. One source, one version string.
 */
publicPilotInterestRouter.get('/requirements', (c) =>
  c.json(
    successResponse({
      version: PILOT_REQUIREMENTS_VERSION,
      requirements: PILOT_REQUIREMENTS,
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

    const result = await submitPilotInterest(c.req.valid('json'), {
      sourceIp,
      userAgent: c.req.header('user-agent') ?? null,
    });
    return c.json(successResponse(result), 201);
  },
);
