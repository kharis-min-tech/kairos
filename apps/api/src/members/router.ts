import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, requireCapability, getAuth } from '../middleware/auth';
import { db } from '../db';
import { getAuthSecrets } from '../lib/auth-secrets';
import { successResponse } from '@kairos/utils';
import {
  updateMemberSchema,
  approveMemberSchema,
  assignRoleSchema,
  listMembersQuerySchema,
  createMemberSchema,
  upsertHealthRecordSchema,
  unguardedMinorsQuerySchema,
  reviewMinorSchema,
  setMembershipClassSchema,
  importMembersFormSchema,
} from './schemas';
import {
  listMembers,
  getMember,
  getMyProfile,
  updateMember,
  approveMember,
  assignRole,
  removeRole,
  getMemberRoles,
  deactivateMember,
  createMember,
  reactivateMember,
  importMembers,
  exportMembersCsv,
  listRoles,
  switchActiveBranch,
  getHealthRecord,
  upsertHealthRecord,
  listUnguardedMinors,
  listDormantMinors,
  reviewMinor,
  setMembershipClassCompleted,
} from './service';
import { getMemberStats } from '../analytics/service';
import { getMemberFollowupHistory } from './followups-history-service';

export const membersRouter = new Hono();

// All member routes require authentication
membersRouter.use('*', authMiddleware);

// ── Profile ────────────────────────────────────────────────

membersRouter.get('/me', async (c) => {
  const auth = getAuth(c);
  const profile = await getMyProfile(db, auth);
  return c.json(successResponse(profile));
});

// ── Members CRUD ───────────────────────────────────────────

/**
 * The directory answers every authenticated caller, but not with the same row.
 *
 * It used to carry `authMiddleware` and nothing else, and a row was the whole
 * contact record: email, phone, address, date of birth and all three emergency
 * contact fields. So a brand-new self-registered member could page their
 * branch's roll in full.
 *
 * A capability gate here closed that and took the mobile Community tab's
 * People segment with it — an ordinary member-facing browse on a tab every
 * user has, which displays nothing but an avatar, a name and a branch. So the
 * narrowing is by FIELD, not by access: `listMembers` serves the full record
 * to a caller holding one of the directory capabilities and
 * `MemberDirectoryCore` to everyone else, with the withheld fields absent
 * rather than null. The row-level branch narrowing and the minor redaction are
 * unchanged and still apply on top.
 *
 * What this endpoint now guarantees: a caller receives a field only if they
 * hold a grant that needs it, or the surface they are on displays it.
 *
 * The leader-facing directory screen — which does show contact details, and
 * offers approvals and exports — is a separate surface, gated client-side on
 * the same capability list (`apps/mobile/lib/capabilities.ts`).
 */
membersRouter.get('/', zValidator('query', listMembersQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const result = await listMembers(db, auth, query);
  return c.json(successResponse(result));
});

membersRouter.post('/', requireCapability('branch:write'), zValidator('json', createMemberSchema), async (c) => {
  const auth = getAuth(c);
  const input = c.req.valid('json');
  const result = await createMember(db, input, auth);
  return c.json(successResponse(result, 'Member created'), 201);
});

// This route had no validator at all — the handler hand-rolled the only
// check there was (file present and not a string). zValidator now owns the
// upload's shape, and `importMembers` validates each CSV row against
// `importMemberRowSchema` before it reaches the insert.
membersRouter.post(
  '/import',
  requireCapability('branch:write'),
  zValidator('form', importMembersFormSchema),
  async (c) => {
    const auth = getAuth(c);
    const { file } = c.req.valid('form');
    const text = await file.text();
    const result = await importMembers(db, text, auth);
    return c.json(successResponse(result, 'Import complete'), 201);
  },
);

membersRouter.get('/export', requireCapability('branch:write'), async (c) => {
  const auth = getAuth(c);
  const csv = await exportMembersCsv(db, auth);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="members.csv"',
    },
  });
});

// ── Roles Catalog ──────────────────────────────────────────

membersRouter.get('/roles', requireRole('admin'), async (c) => {
  const allRoles = await listRoles(db);
  return c.json(successResponse(allRoles));
});

// ── Safeguarding review ────────────────────────────────────
// Static path — must precede '/:id' so it isn't captured as an id.
membersRouter.get(
  '/safeguarding/unguarded-minors',
  zValidator('query', unguardedMinorsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await listUnguardedMinors(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

// Task #4 Phase B — dormant minors review (SG Lead surface)
membersRouter.get(
  '/safeguarding/dormant-minors',
  zValidator('query', unguardedMinorsQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const result = await listDormantMinors(db, auth, c.req.valid('query'));
    return c.json(successResponse(result));
  },
);

membersRouter.post(
  '/safeguarding/dormant-minors/:id/review',
  zValidator('json', reviewMinorSchema),
  async (c) => {
    const auth = getAuth(c);
    const { decision } = c.req.valid('json');
    const result = await reviewMinor(db, auth, c.req.param('id'), decision);
    return c.json(successResponse(result));
  },
);

membersRouter.get('/:id', async (c) => {
  const auth = getAuth(c);
  const member = await getMember(db, c.req.param('id'), auth);
  return c.json(successResponse(member));
});

membersRouter.patch('/:id', zValidator('json', updateMemberSchema), async (c) => {
  const auth = getAuth(c);
  const member = await updateMember(db, c.req.param('id'), c.req.valid('json'), auth);
  return c.json(successResponse(member));
});

membersRouter.patch('/:id/active-branch', async (c) => {
  const auth = getAuth(c);
  const result = await switchActiveBranch(db, auth, c.req.param('id'), getAuthSecrets(c));
  return c.json(successResponse(result, 'Active branch updated'));
});

membersRouter.delete('/:id', requireCapability('branch:write'), async (c) => {
  const member = await deactivateMember(db, c.req.param('id')!, getAuth(c));
  return c.json(successResponse(member, 'Member deactivated'));
});

membersRouter.post('/:id/reactivate', requireCapability('branch:write'), async (c) => {
  const auth = getAuth(c);
  const member = await reactivateMember(db, c.req.param('id')!, auth);
  return c.json(successResponse(member, 'Member reactivated'));
});

membersRouter.get('/:id/stats', async (c) => {
  const auth = getAuth(c);
  const memberId = c.req.param('id');
  const stats = await getMemberStats(db, { ...auth, memberId });
  return c.json(successResponse(stats));
});

// ── Follow-up history (0046) ───────────────────────────────
//
// Unified timeline of every follow-up recorded for this member across
// fellowships + departments. Self-view always allowed; leader-view needs
// branch:write on the member's home branch. Enforcement lives in the
// service function.
membersRouter.get('/:id/followups', async (c) => {
  const auth = getAuth(c);
  const memberId = c.req.param('id');
  const history = await getMemberFollowupHistory(db, auth, memberId);
  return c.json(successResponse(history));
});

// ── Approval ───────────────────────────────────────────────

membersRouter.post('/:id/approve', requireCapability('signup:approve'), zValidator('json', approveMemberSchema), async (c) => {
  const auth = getAuth(c);
  const { approved } = c.req.valid('json');
  const member = await approveMember(db, c.req.param('id'), approved, auth);
  return c.json(successResponse(member));
});

// ── Membership class (Task #33 P1) ─────────────────────────
// Stamp or clear the timestamp the member completed the 4-week class.
// `completedAt: null` clears. Branch-write gated; branch-narrowed in service.

membersRouter.post(
  '/:id/membership-class',
  requireCapability('branch:write'),
  zValidator('json', setMembershipClassSchema),
  async (c) => {
    const auth = getAuth(c);
    const { completedAt } = c.req.valid('json');
    const member = await setMembershipClassCompleted(
      db,
      c.req.param('id'),
      completedAt ? new Date(completedAt) : null,
      auth,
    );
    return c.json(successResponse(member, completedAt ? 'Membership certified' : 'Membership cleared'));
  },
);

// ── Health Records (minor data protection) ────────────────

membersRouter.get('/:id/health-record', async (c) => {
  const auth = getAuth(c);
  const record = await getHealthRecord(db, c.req.param('id'), auth);
  return c.json(successResponse(record));
});

membersRouter.put('/:id/health-record', zValidator('json', upsertHealthRecordSchema), async (c) => {
  const auth = getAuth(c);
  const record = await upsertHealthRecord(db, c.req.param('id'), c.req.valid('json'), auth);
  return c.json(successResponse(record, 'Health record saved'));
});

// ── Roles ──────────────────────────────────────────────────

membersRouter.get('/:id/roles', async (c) => {
  const auth = getAuth(c);
  const roles = await getMemberRoles(db, c.req.param('id'), auth);
  return c.json(successResponse(roles));
});

membersRouter.post('/:id/roles', requireRole('admin'), zValidator('json', assignRoleSchema), async (c) => {
  const auth = getAuth(c);
  const assignment = await assignRole(db, c.req.param('id'), c.req.valid('json'), auth);
  return c.json(successResponse(assignment), 201);
});

membersRouter.delete('/:id/roles/:roleAssignmentId', requireRole('admin'), async (c) => {
  const auth = getAuth(c);
  const result = await removeRole(db, c.req.param('id')!, c.req.param('roleAssignmentId')!, auth);
  return c.json(successResponse(result, 'Role removed'));
});
