import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, requireRole, getAuth } from '../middleware/auth';
import { db } from '../db';
import { successResponse } from '@kairos/utils';
import {
  listDonations,
  recordManualDonation,
  getDonationReports,
  exportDonationsCsv,
} from './service';

export const donationsRouter = new Hono();

donationsRouter.use('*', authMiddleware);

const recordManualSchema = z.object({
  memberId: z.string().uuid().nullable().optional(),
  amount: z.number().positive(),
  donationPurpose: z.enum(['Offering', 'Tithe', 'Building Fund', 'Other']),
  paymentMethod: z.enum(['Cash', 'Check', 'Bank Transfer', 'Mobile Money']),
  donationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isAnonymous: z.boolean().optional().default(false),
  description: z.string().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  memberId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  purpose: z.enum(['Offering', 'Tithe', 'Building Fund', 'Other']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const reportsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// List donations
donationsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const result = await listDonations(db, auth, query);
  return c.json(successResponse(result));
});

// Record manual donation
donationsRouter.post('/manual', requireRole('admin', 'pastor'), zValidator('json', recordManualSchema), async (c) => {
  const auth = getAuth(c);
  const input = c.req.valid('json');
  const donation = await recordManualDonation(db, auth, input);
  return c.json(successResponse(donation, 'Donation recorded'), 201);
});

// Reports
donationsRouter.get('/reports', zValidator('query', reportsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const report = await getDonationReports(db, auth, query);
  return c.json(successResponse(report));
});

// Export CSV
donationsRouter.get('/export', zValidator('query', reportsQuerySchema), async (c) => {
  const auth = getAuth(c);
  const query = c.req.valid('query');
  const csv = await exportDonationsCsv(db, auth, query);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="donations.csv"',
    },
  });
});
