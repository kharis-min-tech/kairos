import { Hono } from 'hono';

export const membersRouter = new Hono();

// GET    /api/members
// GET    /api/members/:id
// PATCH  /api/members/:id
// POST   /api/members/:id/approve
// PATCH  /api/members/:id/role

membersRouter.get('/', (c) => {
  return c.json({ success: true, message: 'Members module placeholder' });
});
