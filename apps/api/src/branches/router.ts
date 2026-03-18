import { Hono } from 'hono';

export const branchesRouter = new Hono();

// GET    /api/branches
// GET    /api/branches/:id
// POST   /api/branches
// PATCH  /api/branches/:id
// DELETE /api/branches/:id

branchesRouter.get('/', (c) => {
  return c.json({ success: true, message: 'Branches module placeholder' });
});
