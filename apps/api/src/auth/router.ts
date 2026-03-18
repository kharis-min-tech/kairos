import { Hono } from 'hono';

export const authRouter = new Hono();

// POST /api/auth/signup
// POST /api/auth/login
// POST /api/auth/refresh
// POST /api/auth/verify-email
// POST /api/auth/forgot-password
// POST /api/auth/reset-password

authRouter.get('/me', (c) => {
  return c.json({ success: true, message: 'Auth module placeholder' });
});
