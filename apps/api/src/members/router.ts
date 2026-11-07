import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, requireCapability, requireAnyCapability, getAuth } from '../middleware/auth';
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
 * The directory is leadership reading. It carried `authMiddleware` and nothing
 * else, so a brand-new self-registered member with no grant at all could page
 * it — and a row is the whole contact record: email, phone, address, and
 * emergency contact name / phone / relationship. Both clients already gate the
 * /members page on `branch:write`, so the surface they offer was far narrower
 * than the surface the server allowed.
 *
 * Unscoped on purpose, two ways:
 *
 *  - `requireCapability`'s scopeFn is synchronous and gets no database, so it
 *    can only name a target the URL already carries. A list route has no
 *    target id, so there is nothing correct for it to return here. Deriving a
 *    scope from `getAuth(c).branchId` would be wrong in a second way:
 *    `getActiveBranchId` returns `secondaryBranchId` when the member is at
 *    their secondary branch, so a BranchAdmin who had toggled branches would
 *    be refused their own directory.
 *  - So this asks only "does this caller hold a directory-shaped capability at
 *    all", and `listMembers` keeps the row-level narrowing it already does:
 *    anyone without `branch:read` sees only their own branch, and minors stay
 *    behind the safeguarding redaction.
 *
 * The list is every grant with a real reason to read the roll — branch admins
 * and the approval queue, fellowship and department leaders picking members
 * into their group, the membership-class programme, the new-believers team
 * choosing a mentor, and safeguarding. A caller with no grant has a legitimate
 * need to *reference* a person (a form's "Who invited you?"), and that is
 * already served by the purpose-built, minimal `GET /api/forms/member-search`
 * — not by the directory.
 */
membersRouter.get(
  '/',
  requireAnyCapability(
    'branch:read',
    'signup:approve',
    'fellowship:read',
    'department:read',
    'membership:admin',
    'membership:branch:read',
    'newbelievers:mentor',
    'newbelievers:teach',
    'safeguarding:read',
  ),
  zValidator('query', listMembersQuerySchema),
  async (c) => {
    const auth = getAuth(c);
    const query = c.req.valid('query');
    const result = await listMembers(db, auth, query);
    return c.json(successResponse(result));
  },
);

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
