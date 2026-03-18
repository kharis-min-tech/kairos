import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './auth/router';
import { branchesRouter } from './branches/router';
import { membersRouter } from './members/router';
import { fellowshipsRouter } from './fellowships/router';
import { analyticsRouter } from './analytics/router';

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use('*', honoLogger());
  app.use('*', cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  }));

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Module routers
  app.route('/api/auth', authRouter);
  app.route('/api/branches', branchesRouter);
  app.route('/api/members', membersRouter);
  app.route('/api/fellowships', fellowshipsRouter);
  app.route('/api/analytics', analyticsRouter);

  // Error handler
  app.onError(errorHandler);

  return app;
}
