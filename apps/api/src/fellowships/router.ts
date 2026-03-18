import { Hono } from 'hono';

export const fellowshipsRouter = new Hono();

// GET    /api/fellowships
// GET    /api/fellowships/:id
// POST   /api/fellowships
// PATCH  /api/fellowships/:id
// DELETE /api/fellowships/:id
// POST   /api/fellowships/:id/meetings
// POST   /api/fellowships/:id/meetings/:meetingId/attendance

fellowshipsRouter.get('/', (c) => {
  return c.json({ success: true, message: 'Fellowships module placeholder' });
});
