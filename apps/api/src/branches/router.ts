import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '../lib/response';
import {
  createBranchSchema,
  updateBranchSchema,
  createRegionSchema,
  assignLeadershipSchema,
  getLeadershipQuerySchema,
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

branchesRouter.patch('/:id', requireRole('admin', 'pastor'), zValidator('json', updateBranchSchema), async (c) => {
  const auth = getAuth(c);
  const branch = await updateBranch(db, c.req.param('id'), c.req.valid('json'), auth);
  return c.json(successResponse(branch));
});

branchesRouter.delete('/:id', requireRole('admin'), async (c) => {
  await deleteBranch(db, c.req.param('id')!);
  return c.json(successResponse(null, 'Branch deactivated'));
});

// ── Leadership ─────────────────────────────────────────────

branchesRouter.get('/:id/leadership', zValidator('query', getLeadershipQuerySchema), async (c) => {
  const auth = getAuth(c);
  const { includeHistory } = c.req.valid('query');
  const leadership = await getBranchLeadership(db, c.req.param('id')!, auth, { includeHistory });
  return c.json(successResponse(leadership));
});

branchesRouter.post('/:id/leadership', requireRole('admin'), zValidator('json', assignLeadershipSchema), async (c) => {
  const input = c.req.valid('json');
  const assignment = await assignLeadership(db, c.req.param('id'), input);
  return c.json(successResponse(assignment), 201);
});

branchesRouter.delete('/:id/leadership/:leadershipId', requireRole('admin'), async (c) => {
  const leadershipId = c.req.param('leadershipId');
  if (!leadershipId) return c.json({ success: false, error: 'Leadership ID required' }, 400);
  await removeLeadership(db, c.req.param('id')!, leadershipId);
  return c.json(successResponse(null, 'Leadership assignment removed'));
});
