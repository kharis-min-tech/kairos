import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler';
import { loggingMiddleware } from './middleware/logging';
import { authRouter } from './auth/router';
import { branchesRouter } from './branches/router';
import { membersRouter } from './members/router';
import { fellowshipsRouter } from './fellowships/router';
import { departmentsRouter } from './departments/router';
import { analyticsRouter } from './analytics/router';
import { reportsRouter } from './reports/router';
import { newBelieversRouter } from './new-believers/router';
import outreachRouter from './outreach/router';
import soulsRouter from './outreach/souls-router';
import { meRouter } from './me/router';
import { formsRouter } from './forms/router';
import { attendanceRouter } from './attendance/router';
import { db } from './db';
import { successResponse } from '@kairos/utils';
import { branches, regions } from '@kairos/database';
import { eq } from 'drizzle-orm';

export function createApp() {
  const app = new Hono();

  // Global middleware — logging runs FIRST so request entry/exit is captured
  // even on auth failures. It also seeds the AsyncLocalStorage context that
  // every subsequent `logger.*` call inherits (requestId, method, path).
  app.use('*', loggingMiddleware);
  app.use('*', cors({
    origin: (origin) => {
      if (origin && /^http:\/\/localhost:\d+$/.test(origin)) return origin;
      return 'http://localhost:3002';
    },
    credentials: true,
  }));

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Public routes (no auth required)
  app.get('/api/public/branches', async (c) => {
    const rows = await db
      .select({ id: branches.id, branchName: branches.branchName, regionName: regions.regionName })
      .from(branches)
      .innerJoin(regions, eq(branches.regionId, regions.id))
      .where(eq(branches.isActive, true))
      .orderBy(branches.branchName);
    return c.json(successResponse(rows));
  });

  // Module routers
  app.route('/api/auth', authRouter);
  app.route('/api/branches', branchesRouter);
  app.route('/api/members', membersRouter);
  app.route('/api/fellowships', fellowshipsRouter);
  app.route('/api/departments', departmentsRouter);
  app.route('/api/analytics', analyticsRouter);
  app.route('/api/reports', reportsRouter);
  app.route('/api/new-believers', newBelieversRouter);
  app.route('/api/outreach', outreachRouter);
  app.route('/api/souls', soulsRouter);
  app.route('/api/me', meRouter);
  app.route('/api/forms', formsRouter);
  app.route('/api/attendance', attendanceRouter);

  // Error handler
  app.onError(errorHandler);

  return app;
}
