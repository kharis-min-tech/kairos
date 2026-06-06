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
  mmUpdateUserPassword,
  mmUpdateUserRoles,
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
import { members, fellowships, branchDepartments, branches, announcements } from '@kairos/database';
import { eq, and, isNull, or, sql, desc, inArray } from 'drizzle-orm';

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
// Returns the user's MM credentials so the frontend can log in via the
// same-origin /mm proxy (Next.js rewrites /mm/* → MM internal URL).
// Same-origin means cookies are set on localhost:3002 — no CORS issues.
messagingRouter.get('/login-token', async (c) => {
  const auth = getAuth(c);

  const [member] = await db
    .select({ mattermostUserId: members.mattermostUserId, mattermostPassword: members.mattermostPassword, email: members.email })
    .from(members)
    .where(eq(members.id, auth.memberId));

  if (!member?.mattermostUserId || !member?.mattermostPassword) {
    return c.json({ error: 'Mattermost account not yet provisioned' }, 404);
  }

  return c.json(successResponse({ email: member.email, password: member.mattermostPassword }));
});

// ── POST /backfill-mm ─────────────────────────────────────────────────────────
// Admin-only. Provisions Mattermost accounts for all active members who don't
// have one yet. Safe to run multiple times.
messagingRouter.post('/backfill-mm', requireRole('admin'), async (c) => {
  // Fetch members who either have no MM account yet, or have one but no stored password
  const unprovisioned = await db
    .select({
      id: members.id,
      email: members.email,
      firstName: members.firstName,
      lastName: members.lastName,
      homeBranchId: members.homeBranchId,
      mattermostUserId: members.mattermostUserId,
      systemRole: members.systemRole,
    })
    .from(members)
    .where(and(
      eq(members.isActive, true),
      or(isNull(members.mattermostUserId), isNull(members.mattermostPassword)),
    ));

  // Fetch all active branch IDs upfront for admin team-assignment
  const allBranches = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.isActive, true));

  let provisioned = 0;
  let passwordsUpdated = 0;
  let failed = 0;

  for (const member of unprovisioned) {
    try {
      const username =
        member.email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9._-]/g, '') +
        '-' +
        member.id.slice(0, 4);

      // Already in MM but missing stored password — reset it and save
      if (member.mattermostUserId) {
        const newPassword = `Krs-${crypto.randomUUID()}`;
        const ok = await mmUpdateUserPassword(member.mattermostUserId, newPassword);
        if (!ok) { failed++; continue; }
        await db
          .update(members)
          .set({ mattermostPassword: newPassword, updatedAt: sql`NOW()` })
          .where(eq(members.id, member.id));
        // Ensure admins have system_admin role and all-team membership
        if (member.systemRole === 'admin') {
          await mmUpdateUserRoles(member.mattermostUserId, 'system_user system_admin');
          for (const branch of allBranches) {
            const teamId = await getOrCreateBranchTeamId(db, branch.id);
            if (teamId) await mmAddUserToTeam(teamId, member.mattermostUserId);
          }
        }
        passwordsUpdated++;
        continue;
      }

      // Net-new MM account
      const mmResult = await mmCreateUser(
        member.email,
        username,
        member.firstName ?? '',
        member.lastName ?? '',
      );
      if (!mmResult) { failed++; continue; }
      const mmUserId = mmResult.userId;

      await db
        .update(members)
        .set({ mattermostUserId: mmUserId, mattermostPassword: mmResult.password, updatedAt: sql`NOW()` })
        .where(eq(members.id, member.id));

      // Admins get MM system_admin role and membership in all branch teams
      if (member.systemRole === 'admin') {
        await mmUpdateUserRoles(mmUserId, 'system_user system_admin');
        for (const branch of allBranches) {
          const teamId = await getOrCreateBranchTeamId(db, branch.id);
          if (teamId) await mmAddUserToTeam(teamId, mmUserId);
        }
      } else if (member.homeBranchId) {
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

  return c.json(successResponse({ provisioned, passwordsUpdated, failed, total: unprovisioned.length }));
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

    // Persist announcement to DB for the native Kairos feed
    const targetEntityId =
      input.target === 'fellowship' ? input.fellowshipId
      : input.target === 'department' ? input.branchDepartmentId
      : undefined;

    await db.insert(announcements).values({
      branchId: resolvedBranchId,
      authorId: auth.memberId,
      target: input.target,
      targetEntityId: targetEntityId ?? null,
      title: input.title ?? null,
      message: input.message,
    });

    return c.json(successResponse({ channelName, message: 'Broadcast sent' }));
  },
);

// ── GET /announcements ────────────────────────────────────────────────────────
// Returns paginated announcements visible to the caller:
//   - admin/pastor: all announcements for their branch
//   - leader/member: branch-wide + announcements targeting their fellowships/departments
messagingRouter.get('/announcements', async (c) => {
  const auth = getAuth(c);
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const rows = await db
    .select({
      id: announcements.id,
      branchId: announcements.branchId,
      authorId: announcements.authorId,
      authorName: sql<string>`concat(${members.firstName}, ' ', ${members.lastName})`,
      target: announcements.target,
      targetEntityId: announcements.targetEntityId,
      title: announcements.title,
      message: announcements.message,
      isActive: announcements.isActive,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
    })
    .from(announcements)
    .innerJoin(members, eq(announcements.authorId, members.id))
    .where(
      and(
        eq(announcements.branchId, auth.branchId),
        eq(announcements.isActive, true),
      )
    )
    .orderBy(desc(announcements.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json(successResponse(rows));
});
