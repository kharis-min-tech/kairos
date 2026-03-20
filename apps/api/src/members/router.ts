import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  updateMemberSchema,
  approveMemberSchema,
  assignRoleSchema,
  listMembersQuerySchema,
  createMemberSchema,
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

membersRouter.post('/', requireRole('admin', 'pastor'), zValidator('json', createMemberSchema), async (c) => {
  const auth = getAuth(c);
  const input = c.req.valid('json');
  const result = await createMember(db, input, auth);
  return c.json(successResponse(result, 'Member created'), 201);
});

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

membersRouter.delete('/:id', requireRole('admin'), async (c) => {
  const member = await deactivateMember(db, c.req.param('id')!, getAuth(c));
  return c.json(successResponse(member, 'Member deactivated'));
});

membersRouter.post('/:id/reactivate', requireRole('admin'), async (c) => {
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

membersRouter.post('/:id/approve', requireRole('admin', 'pastor'), zValidator('json', approveMemberSchema), async (c) => {
  const auth = getAuth(c);
  const { approved } = c.req.valid('json');
  const member = await approveMember(db, c.req.param('id'), approved, auth);
  return c.json(successResponse(member));
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
