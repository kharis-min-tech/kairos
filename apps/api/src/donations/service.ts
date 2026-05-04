import { eq, and, desc, count, sum, sql, gte, lte, type SQL } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { donations, members, branches } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { ForbiddenError, NotFoundError, ValidationError } from '@kairos/utils';

const VALID_PURPOSES = ['Offering', 'Tithe', 'Building Fund', 'Other'] as const;
const VALID_PAYMENT_METHODS = ['Cash', 'Check', 'Bank Transfer', 'Mobile Money'] as const;

export async function listDonations(
  db: Database,
  auth: AuthContext,
  query: {
    page: number;
    limit: number;
    memberId?: string;
    branchId?: string;
    purpose?: string;
    startDate?: string;
    endDate?: string;
  },
) {
  const conditions: SQL[] = [];

  // Branch isolation
  if (auth.systemRole === 'member') {
    conditions.push(eq(donations.memberId, auth.memberId));
  } else if (auth.systemRole === 'pastor') {
    conditions.push(eq(donations.branchId, auth.branchId));
  } else if (auth.systemRole === 'admin' && query.branchId) {
    conditions.push(eq(donations.branchId, query.branchId));
  }

  if (query.memberId && auth.systemRole !== 'member') {
    conditions.push(eq(donations.memberId, query.memberId));
  }
  if (query.purpose) conditions.push(eq(donations.donationPurpose, query.purpose));
  if (query.startDate) conditions.push(gte(donations.donationDate, query.startDate));
  if (query.endDate) conditions.push(lte(donations.donationDate, query.endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: donations.id,
        memberId: donations.memberId,
        branchId: donations.branchId,
        branchName: branches.branchName,
        amount: donations.amount,
        currency: donations.currency,
        donationPurpose: donations.donationPurpose,
        paymentMethod: donations.paymentMethod,
        donationDate: donations.donationDate,
        isAnonymous: donations.isAnonymous,
        description: donations.description,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .leftJoin(members, eq(donations.memberId, members.id))
      .innerJoin(branches, eq(donations.branchId, branches.id))
      .where(where)
      .orderBy(desc(donations.donationDate))
      .limit(query.limit)
      .offset(offset),
    db.select({ count: count() }).from(donations).where(where),
  ]);

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: total!.count,
      totalPages: Math.ceil(total!.count / query.limit),
    },
  };
}

export async function recordManualDonation(
  db: Database,
  auth: AuthContext,
  input: {
    memberId?: string | null;
    amount: number;
    donationPurpose: string;
    paymentMethod: string;
    donationDate: string;
    isAnonymous?: boolean;
    description?: string;
  },
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can record donations');
  }

  if (!VALID_PURPOSES.includes(input.donationPurpose as any)) {
    throw new ValidationError(`Invalid purpose. Must be one of: ${VALID_PURPOSES.join(', ')}`);
  }
  if (!VALID_PAYMENT_METHODS.includes(input.paymentMethod as any)) {
    throw new ValidationError(`Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
  }
  if (input.donationPurpose === 'Other' && !input.description) {
    throw new ValidationError('Description is required when purpose is "Other"');
  }

  const [donation] = await db
    .insert(donations)
    .values({
      memberId: input.memberId || null,
      branchId: auth.branchId,
      amount: String(input.amount),
      currency: 'GBP',
      donationPurpose: input.donationPurpose,
      paymentMethod: input.paymentMethod,
      donationDate: input.donationDate,
      isAnonymous: input.isAnonymous ?? false,
      description: input.description ?? null,
      recordedBy: auth.memberId,
    })
    .returning();

  return donation;
}

export async function getDonationReports(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; startDate?: string; endDate?: string },
) {
  const conditions: SQL[] = [];

  if (auth.systemRole === 'pastor') {
    conditions.push(eq(donations.branchId, auth.branchId));
  } else if (auth.systemRole === 'admin' && query.branchId) {
    conditions.push(eq(donations.branchId, query.branchId));
  } else if (auth.systemRole === 'member') {
    conditions.push(eq(donations.memberId, auth.memberId));
  }

  if (query.startDate) conditions.push(gte(donations.donationDate, query.startDate));
  if (query.endDate) conditions.push(lte(donations.donationDate, query.endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totals, byPurpose, byBranch, topDonors] = await Promise.all([
    // Total amount and count
    db
      .select({
        totalAmount: sum(donations.amount),
        totalCount: count(),
      })
      .from(donations)
      .where(where),

    // By purpose
    db
      .select({
        purpose: donations.donationPurpose,
        amount: sum(donations.amount),
        count: count(),
      })
      .from(donations)
      .where(where)
      .groupBy(donations.donationPurpose)
      .orderBy(desc(sum(donations.amount))),

    // By branch (admin only)
    auth.systemRole === 'admin'
      ? db
          .select({
            branchId: donations.branchId,
            branchName: branches.branchName,
            amount: sum(donations.amount),
            count: count(),
          })
          .from(donations)
          .innerJoin(branches, eq(donations.branchId, branches.id))
          .where(where)
          .groupBy(donations.branchId, branches.branchName)
          .orderBy(desc(sum(donations.amount)))
      : Promise.resolve([]),

    // Top donors
    db
      .select({
        memberId: donations.memberId,
        isAnonymous: donations.isAnonymous,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        amount: sum(donations.amount),
      })
      .from(donations)
      .leftJoin(members, eq(donations.memberId, members.id))
      .where(where)
      .groupBy(donations.memberId, donations.isAnonymous, members.firstName, members.lastName)
      .orderBy(desc(sum(donations.amount)))
      .limit(10),
  ]);

  return {
    totalAmount: Number(totals[0]?.totalAmount ?? 0),
    totalCount: totals[0]?.totalCount ?? 0,
    byPurpose: byPurpose.map((p) => ({
      purpose: p.purpose,
      amount: Number(p.amount ?? 0),
      count: p.count,
    })),
    byBranch: (byBranch as any[]).map((b) => ({
      branchId: b.branchId,
      branchName: b.branchName,
      amount: Number(b.amount ?? 0),
      count: b.count,
    })),
    topDonors: topDonors.map((d) => ({
      memberId: d.memberId,
      memberName: d.isAnonymous
        ? 'Anonymous'
        : d.memberFirstName && d.memberLastName
        ? `${d.memberFirstName} ${d.memberLastName}`
        : 'Walk-in',
      amount: Number(d.amount ?? 0),
      isAnonymous: d.isAnonymous,
    })),
  };
}

export async function exportDonationsCsv(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; startDate?: string; endDate?: string },
): Promise<string> {
  const conditions: SQL[] = [];

  if (auth.systemRole === 'pastor') {
    conditions.push(eq(donations.branchId, auth.branchId));
  } else if (auth.systemRole === 'admin' && query.branchId) {
    conditions.push(eq(donations.branchId, query.branchId));
  } else if (auth.systemRole === 'member') {
    conditions.push(eq(donations.memberId, auth.memberId));
  }

  if (query.startDate) conditions.push(gte(donations.donationDate, query.startDate));
  if (query.endDate) conditions.push(lte(donations.donationDate, query.endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      donationDate: donations.donationDate,
      amount: donations.amount,
      currency: donations.currency,
      donationPurpose: donations.donationPurpose,
      paymentMethod: donations.paymentMethod,
      isAnonymous: donations.isAnonymous,
      description: donations.description,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      branchName: branches.branchName,
    })
    .from(donations)
    .leftJoin(members, eq(donations.memberId, members.id))
    .innerJoin(branches, eq(donations.branchId, branches.id))
    .where(where)
    .orderBy(desc(donations.donationDate));

  const headers = ['date', 'amount', 'currency', 'purpose', 'paymentMethod', 'donor', 'branch', 'description'];
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.donationDate,
      r.amount,
      r.currency,
      r.donationPurpose,
      r.paymentMethod,
      r.isAnonymous ? 'Anonymous' : r.memberFirstName ? `${r.memberFirstName} ${r.memberLastName}` : 'Walk-in',
      r.branchName,
      r.description ?? '',
    ].join(',')),
  ];

  return lines.join('\n');
}
