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

const dateRangeSchema = {
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  programId: z.string().uuid().optional(),
};

/**
 * Parse optional ISO date strings into a date range filter.
 * Returns undefined dates if either is missing or invalid (filter is only applied when both are present).
 */
function parseDateRange(dateFrom?: string, dateTo?: string): { dateFrom?: Date; dateTo?: Date } {
  if (!dateFrom || !dateTo) return {};
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return {};
  return { dateFrom: from, dateTo: to };
}

/**
 * GET /dashboard/overview
 * Get souls pipeline overview with RAG counts
 */
router.get(
  '/overview',
  zValidator('query', z.object(dateRangeSchema)),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');
    const range = parseDateRange(query.dateFrom, query.dateTo);

    const overview = await getDashboardOverview(db, auth, { ...range, programId: query.programId });

    return c.json({
      success: true,
      data: {
        totalSouls: overview.totalSouls,
        ragCounts: overview.ragCounts,
        statusCounts: overview.statusCounts,
      },
    });
  },
);

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
      ...dateRangeSchema,
    }),
  ),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');
    const range = parseDateRange(query.dateFrom, query.dateTo);

    const result = await getSoulsWithRAGStatus(db, auth, {
      ragStatus: query.ragStatus,
      status: query.status,
      page: query.page,
      limit: query.limit,
      programId: query.programId,
      ...range,
    });

    return c.json({
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    });
  },
);

/**
 * GET /dashboard/follow-ups/overview
 * Get follow-up RAG overview
 */
router.get(
  '/follow-ups/overview',
  zValidator('query', z.object(dateRangeSchema)),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');
    const range = parseDateRange(query.dateFrom, query.dateTo);

    const overview = await getFollowUpRAGOverview(db, auth, { ...range, programId: query.programId });

    return c.json({
      success: true,
      data: {
        totalFollowUps: overview.totalFollowUps,
        ragCounts: overview.ragCounts,
      },
    });
  },
);

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
      ...dateRangeSchema,
    }),
  ),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');
    const range = parseDateRange(query.dateFrom, query.dateTo);

    const result = await getFollowUpsWithRAGStatus(db, auth, {
      ragStatus: query.ragStatus,
      page: query.page,
      limit: query.limit,
      programId: query.programId,
      ...range,
    });

    return c.json({
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    });
  },
);

/**
 * GET /dashboard/analytics
 * Get comprehensive analytics data
 */
router.get(
  '/analytics',
  zValidator('query', z.object(dateRangeSchema)),
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.valid('query');
    const range = parseDateRange(query.dateFrom, query.dateTo);

    const analytics = await getDashboardAnalytics(db, auth, { ...range, programId: query.programId });

    return c.json({
      success: true,
      data: analytics,
    });
  },
);

export default router;
