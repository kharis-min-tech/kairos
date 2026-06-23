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
} from './service';
import { getMemberStats } from '../analytics/service';

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

membersRouter.post('/import', requireCapability('branch:write'), async (c) => {
  const auth = getAuth(c);
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || typeof file === 'string') {
    return c.json({ success: false, message: 'CSV file is required' }, 400);
  }
  const text = await (file as File).text();
  const result = await importMembers(db, text, auth);
  return c.json(successResponse(result, 'Import complete'), 201);
});

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

// ── Approval ───────────────────────────────────────────────

membersRouter.post('/:id/approve', requireCapability('member:approve'), zValidator('json', approveMemberSchema), async (c) => {
  const auth = getAuth(c);
  const { approved } = c.req.valid('json');
  const member = await approveMember(db, c.req.param('id'), approved, auth);
  return c.json(successResponse(member));
});

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
