import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  authMiddleware,
  requireRole,
  requireBranchAdmin,
  requireBranchSystemAdmin,
  getAuth,
} from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  createBranchSchema,
  updateBranchSchema,
  createRegionSchema,
  assignLeadershipSchema,
  getLeadershipQuerySchema,
  assignBranchRoleSchema,
} from './schemas';
import {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchLeadership,
  assignLeadership,
  removeLeadership,
  listRegions,
  createRegion,
  listBranchRoleAssignments,
  assignBranchSystemAdmin,
  revokeBranchSystemAdmin,
} from './service';

export const branchesRouter = new Hono();

// All branch routes require authentication
branchesRouter.use('*', authMiddleware);

// ── Regions ────────────────────────────────────────────────

branchesRouter.get('/regions', async (c) => {
  const regions = await listRegions(db);
  return c.json(successResponse(regions));
});

branchesRouter.post('/regions', requireRole('admin'), zValidator('json', createRegionSchema), async (c) => {
  const input = c.req.valid('json');
  const region = await createRegion(db, input);
  return c.json(successResponse(region), 201);
});

// ── Branches CRUD ──────────────────────────────────────────

branchesRouter.get('/', async (c) => {
  const auth = getAuth(c);
  const data = await listBranches(db, auth);
  return c.json(successResponse(data));
});

branchesRouter.get('/:id', async (c) => {
  const auth = getAuth(c);
  const branch = await getBranch(db, c.req.param('id'), auth);
  return c.json(successResponse(branch));
});

branchesRouter.post('/', requireRole('admin'), zValidator('json', createBranchSchema), async (c) => {
  const input = c.req.valid('json');
  const branch = await createBranch(db, input);
  return c.json(successResponse(branch), 201);
});

// Branch admins (system OR data) can edit operational branch info for their branch;
// system admins retain global access. Migrated from requireRole('admin','pastor').
branchesRouter.patch('/:id', requireBranchAdmin('id'), zValidator('json', updateBranchSchema), async (c) => {
  const auth = getAuth(c);
  const branch = await updateBranch(db, c.req.param('id'), c.req.valid('json'), auth);
  return c.json(successResponse(branch));
});

// Branch deactivation stays system-wide — it's destructive and cross-branch.
branchesRouter.delete('/:id', requireRole('admin'), async (c) => {
  const auth = getAuth(c);
  await deleteBranch(db, c.req.param('id')!, auth);
  return c.json(successResponse(null, 'Branch deactivated'));
});

// ── Leadership (Main Pastor / Elder) ───────────────────────

branchesRouter.get('/:id/leadership', zValidator('query', getLeadershipQuerySchema), async (c) => {
  const auth = getAuth(c);
  const { includeHistory } = c.req.valid('query');
  const leadership = await getBranchLeadership(db, c.req.param('id')!, auth, { includeHistory });
  return c.json(successResponse(leadership));
});

// Appointing the Main Pastor / Elder is a branch-system-admin decision (and
// global admins). Branch Data Admin alone is not enough. Migrated from
// requireRole('admin').
branchesRouter.post('/:id/leadership', requireBranchSystemAdmin('id'), zValidator('json', assignLeadershipSchema), async (c) => {
  const auth = getAuth(c);
  const input = c.req.valid('json');
  const assignment = await assignLeadership(db, c.req.param('id'), input, auth);
  return c.json(successResponse(assignment), 201);
});

branchesRouter.delete('/:id/leadership/:leadershipId', requireBranchSystemAdmin('id'), async (c) => {
  const auth = getAuth(c);
  const leadershipId = c.req.param('leadershipId');
  if (!leadershipId) return c.json({ success: false, error: 'Leadership ID required' }, 400);
  await removeLeadership(db, c.req.param('id')!, leadershipId, auth);
  return c.json(successResponse(null, 'Leadership assignment removed'));
});

// ── Branch System Admin role management ────────────────────

// Any branch admin (system or data) can VIEW who holds BSA in their branch.
branchesRouter.get('/:id/roles', requireBranchAdmin('id'), async (c) => {
  const assignments = await listBranchRoleAssignments(db, c.req.param('id')!);
  return c.json(successResponse(assignments));
});

// Only system admins or existing Branch System Admins can grant BSA.
branchesRouter.post(
  '/:id/roles',
  requireBranchSystemAdmin('id'),
  zValidator('json', assignBranchRoleSchema),
  async (c) => {
    const auth = getAuth(c);
    const { memberId } = c.req.valid('json');
    const assignment = await assignBranchSystemAdmin(db, c.req.param('id')!, memberId, auth);
    return c.json(successResponse(assignment), 201);
  },
);

// Only system admins or existing Branch System Admins can revoke BSA.
// Service-layer guard refuses to remove the last active BSA for the branch.
branchesRouter.delete('/:id/roles/:assignmentId', requireBranchSystemAdmin('id'), async (c) => {
  const auth = getAuth(c);
  const assignmentId = c.req.param('assignmentId');
  if (!assignmentId) return c.json({ success: false, error: 'Assignment ID required' }, 400);
  const result = await revokeBranchSystemAdmin(db, c.req.param('id')!, assignmentId, auth);
  return c.json(successResponse(result, 'Branch System Admin assignment revoked'));
});
