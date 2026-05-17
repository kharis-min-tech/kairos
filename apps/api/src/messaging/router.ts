/**
 * Messaging router — broadcast messages via Mattermost.
 *
 * POST /api/messaging/broadcast
 *   Sends a message to a Mattermost channel scoped by target.
 *   Target options: 'branch' | 'fellowship' | 'department'
 *   Authorization mirrors existing broadcast rules:
 *     - admin: any target
 *     - pastor: branch only (their branch)
 *     - leader: fellowship or department only (their own)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getAuth } from '../middleware/auth';
import {
  mmCreateUser,
  mmGetOrCreateChannel,
  mmAddUserToChannel,
  mmPostMessage,
  mmGenerateLoginToken,
  branchChannelName,
  fellowshipChannelName,
  departmentChannelName,
  ForbiddenError,
  NotFoundError,
  successResponse,
} from '@kairos/utils';
import { getOrCreateBranchTeamId, mmAddUserToTeam } from './mm-branch-team';
import { db } from '../db';
import { members, fellowships, branchDepartments } from '@kairos/database';
import { eq, and, isNull, sql } from 'drizzle-orm';

const broadcastSchema = z.object({
  target: z.enum(['branch', 'fellowship', 'department']),
  /** Required when target is 'branch'. Defaults to caller's branch if omitted. */
  branchId: z.string().uuid().optional(),
  /** Required when target is 'fellowship'. */
  fellowshipId: z.string().uuid().optional(),
  /** Required when target is 'department'. */
  branchDepartmentId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(4000),
  /** Optional display name prefix, e.g. "📢 Announcement" */
  title: z.string().trim().max(200).optional(),
});

export const messagingRouter = new Hono();

messagingRouter.use('*', authMiddleware);

// ── GET /login-token ──────────────────────────────────────────────────────────
messagingRouter.get('/login-token', async (c) => {
  const auth = getAuth(c);

  const [member] = await db
    .select({ mattermostUserId: members.mattermostUserId })
    .from(members)
    .where(eq(members.id, auth.memberId));

  if (!member?.mattermostUserId) {
    return c.json({ error: 'Mattermost account not yet provisioned' }, 404);
  }

  const token = await mmGenerateLoginToken(member.mattermostUserId);
  if (!token) {
    return c.json({ error: 'Could not generate Mattermost login token' }, 503);
  }

  return c.json(successResponse({ token }));
});

// ── POST /backfill-mm ─────────────────────────────────────────────────────────
// Admin-only. Provisions Mattermost accounts for all active members who don't
// have one yet. Safe to run multiple times (skips already-provisioned members).
messagingRouter.post('/backfill-mm', requireRole('admin'), async (c) => {
  const unprovisioned = await db
    .select({
      id: members.id,
      email: members.email,
      firstName: members.firstName,
      lastName: members.lastName,
      homeBranchId: members.homeBranchId,
    })
    .from(members)
    .where(and(eq(members.isActive, true), isNull(members.mattermostUserId)));

  let provisioned = 0;
  let failed = 0;

  for (const member of unprovisioned) {
    try {
      const username =
        member.email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9._-]/g, '') +
        '-' +
        member.id.slice(0, 4);
      const mmUserId = await mmCreateUser(
        member.email,
        username,
        member.firstName ?? '',
        member.lastName ?? '',
      );
      if (!mmUserId) { failed++; continue; }

      await db
        .update(members)
        .set({ mattermostUserId: mmUserId, updatedAt: sql`NOW()` })
        .where(eq(members.id, member.id));

      if (member.homeBranchId) {
        const teamId = await getOrCreateBranchTeamId(db, member.homeBranchId);
        if (teamId) {
          await mmAddUserToTeam(teamId, mmUserId);
          const channelId = await mmGetOrCreateChannel(
            teamId,
            branchChannelName(member.homeBranchId),
            `Branch ${member.homeBranchId.slice(0, 8)}`,
          );
          if (channelId) await mmAddUserToChannel(channelId, mmUserId);
        }
      }
      provisioned++;
    } catch {
      failed++;
    }
  }

  return c.json(successResponse({ provisioned, failed, total: unprovisioned.length }));
});

messagingRouter.post(
  '/broadcast',
  requireRole('admin', 'pastor', 'leader'),
  zValidator('json', broadcastSchema),
  async (c) => {
    const auth = getAuth(c);
    const input = c.req.valid('json');

    let channelName: string;
    let channelDisplayName: string;
    let resolvedBranchId: string;

    if (input.target === 'branch') {
      const branchId = input.branchId ?? auth.branchId;

      // Pastors can only broadcast to their own branch
      if (auth.systemRole === 'pastor' && branchId !== auth.branchId) {
        throw new ForbiddenError('Pastors can only broadcast to their own branch');
      }
      // Leaders cannot broadcast to branch-wide channels
      if (auth.systemRole === 'leader') {
        throw new ForbiddenError('Leaders can only broadcast to their own fellowship or department');
      }

      channelName = branchChannelName(branchId);
      channelDisplayName = `Branch ${branchId.slice(0, 8)}`;
      resolvedBranchId = branchId;

    } else if (input.target === 'fellowship') {
      if (!input.fellowshipId) {
        throw new NotFoundError('fellowshipId is required for fellowship broadcast');
      }

      // Validate fellowship exists and leader is a member / admin
      const [fellowship] = await db
        .select({ id: fellowships.id, fellowshipName: fellowships.fellowshipName, branchId: fellowships.branchId })
        .from(fellowships)
        .where(and(eq(fellowships.id, input.fellowshipId), eq(fellowships.isActive, true)));
      if (!fellowship) throw new NotFoundError('Fellowship not found');

      // Leaders must be scoped to their own branch
      if (auth.systemRole === 'leader' && fellowship.branchId !== auth.branchId) {
        throw new ForbiddenError('You can only broadcast to fellowships within your branch');
      }
      // Pastors limited to their branch
      if (auth.systemRole === 'pastor' && fellowship.branchId !== auth.branchId) {
        throw new ForbiddenError('You can only broadcast to fellowships within your branch');
      }

      channelName = fellowshipChannelName(input.fellowshipId);
      channelDisplayName = fellowship.fellowshipName;
      resolvedBranchId = fellowship.branchId;

    } else {
      // department
      if (!input.branchDepartmentId) {
        throw new NotFoundError('branchDepartmentId is required for department broadcast');
      }

      const [bd] = await db
        .select({ id: branchDepartments.id, branchId: branchDepartments.branchId })
        .from(branchDepartments)
        .where(and(eq(branchDepartments.id, input.branchDepartmentId), eq(branchDepartments.isActive, true)));
      if (!bd) throw new NotFoundError('Department not found');

      if (auth.systemRole !== 'admin' && bd.branchId !== auth.branchId) {
        throw new ForbiddenError('You can only broadcast to departments within your branch');
      }

      channelName = departmentChannelName(input.branchDepartmentId);
      channelDisplayName = `Department ${input.branchDepartmentId.slice(0, 8)}`;
      resolvedBranchId = bd.branchId;
    }

    const teamId = await getOrCreateBranchTeamId(db, resolvedBranchId);
    if (!teamId) {
      return c.json({ error: 'Mattermost team not available' }, 503);
    }

    const channelId = await mmGetOrCreateChannel(teamId, channelName, channelDisplayName);
    if (!channelId) {
      return c.json({ error: 'Could not resolve Mattermost channel' }, 503);
    }

    const formattedMessage = input.title
      ? `**${input.title}**\n\n${input.message}`
      : input.message;

    await mmPostMessage(channelId, formattedMessage);

    return c.json(successResponse({ channelName, message: 'Broadcast sent' }));
  },
);
