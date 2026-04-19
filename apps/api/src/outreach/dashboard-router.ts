import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthContext } from '@kairos/types';
import { db } from '../db';
import {
  getDashboardOverview,
  getSoulsWithRAGStatus,
  getFollowUpsWithRAGStatus,
  getFollowUpRAGOverview,
  getDashboardAnalytics,
} from './dashboard-service';

const router = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /dashboard/overview
 * Get souls pipeline overview with RAG counts
 */
router.get('/overview', async (c) => {
  const auth = c.get('auth');

  const overview = await getDashboardOverview(db, auth);

  return c.json({
    success: true,
    data: {
      totalSouls: overview.totalSouls,
      ragCounts: overview.ragCounts,
      statusCounts: overview.statusCounts,
    },
  });
});

/**
 * GET /dashboard/souls
 * Get souls list with RAG status and filters
 */
router.get(
  '/souls',
  zValidator(
    'query',
    z.object({
      ragStatus: z.enum(['RED', 'AMBER', 'GREEN']).optional(),
      status: z.string().optional(),
      page: z.string().transform(Number).optional(),
      limit: z.string().transform(Number).optional(),
    }),
  ),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');

    const result = await getSoulsWithRAGStatus(db, auth, {
      ragStatus: query.ragStatus,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return c.json({
      success: true,
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    });
  },
);

/**
 * GET /dashboard/follow-ups/overview
 * Get follow-up RAG overview
 */
router.get('/follow-ups/overview', async (c) => {
  const auth = c.get('auth');

  const overview = await getFollowUpRAGOverview(db, auth);

  return c.json({
    success: true,
    data: {
      totalFollowUps: overview.totalFollowUps,
      ragCounts: overview.ragCounts,
    },
  });
});

/**
 * GET /dashboard/follow-ups
 * Get follow-ups list with RAG status
 */
router.get(
  '/follow-ups',
  zValidator(
    'query',
    z.object({
      ragStatus: z.enum(['RED', 'AMBER', 'GREEN']).optional(),
      page: z.string().transform(Number).optional(),
      limit: z.string().transform(Number).optional(),
    }),
  ),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');

    const result = await getFollowUpsWithRAGStatus(db, auth, {
      ragStatus: query.ragStatus,
      page: query.page,
      limit: query.limit,
    });

    return c.json({
      success: true,
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    });
  },
);

/**
 * GET /dashboard/analytics
 * Get comprehensive analytics data
 */
router.get('/analytics', async (c) => {
  const auth = c.get('auth');

  const analytics = await getDashboardAnalytics(db, auth);

  return c.json({
    success: true,
    data: analytics,
  });
});

export default router;
