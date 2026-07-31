import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { souls, followUps, members, outreachPrograms } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { buildSoulsScopeFilter } from './souls-service';

/**
 * Combine branch isolation filter with optional date range filter.
 */
function combineFilters(...filters: Array<SQL | undefined>): SQL | undefined {
  const defined = filters.filter((f): f is SQL => f !== undefined);
  if (defined.length === 0) return undefined;
  if (defined.length === 1) return defined[0];
  return and(...defined);
}

/**
 * RAG Status Calculation for Souls Pipeline
 * 
 * Souls Pipeline RAG:
 * 🔴 RED - Critical (Intervention Required):
 *   - No follow-up logged yet
 *   - New/Following Up status: 3+ days since last contact
 *   - Interested status: 5+ days since last contact
 * 
 * 🟡 AMBER - Monitor (Monitoring Required):
 *   - New/Following Up status: 2 days since last contact
 *   - Interested status: 3-4 days since last contact
 * 
 * 🟢 GREEN - On track:
 *   - New/Following Up status: < 2 days since last contact
 *   - Interested status: < 3 days since last contact
 *   - Converted/Not Interested/Lost Contact (no follow-up needed)
 */

type RAGStatus = 'RED' | 'AMBER' | 'GREEN';

interface SoulWithRAG {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: string;
  assignedMemberId: string | null;
  assignedMemberName: string | null;
  assignedMemberBranchName: string | null;
  outreachName: string | null;
  lastFollowUpDate: Date | null;
  daysSinceLastFollowUp: number | null;
  ragStatus: RAGStatus;
  ragReason: string;
  createdAt: Date;
}

interface FollowUpWithRAG {
  id: string;
  soulId: string;
  soulName: string;
  contactStatus: string;
  contactMethod: string | null;
  followUpDate: Date;
  memberName: string | null;
  ragStatus: RAGStatus;
  ragReason: string;
}

export function calculateSoulRAGStatus(
  status: string,
  daysSinceLastFollowUp: number | null,
  hasFollowUp: boolean,
): { ragStatus: RAGStatus; ragReason: string } {
  // No follow-up needed statuses
  const noFollowUpNeeded = ['Converted', 'Not Interested', 'Lost Contact'];
  if (noFollowUpNeeded.includes(status)) {
    return { ragStatus: 'GREEN', ragReason: 'No follow-up needed' };
  }

  // No follow-up logged yet
  if (!hasFollowUp || daysSinceLastFollowUp === null) {
    return { ragStatus: 'RED', ragReason: 'No follow-up logged yet' };
  }

  // New or Following Up status
  if (status === 'New' || status === 'Following Up') {
    if (daysSinceLastFollowUp >= 3) {
      return { ragStatus: 'RED', ragReason: `${daysSinceLastFollowUp} days since last contact` };
    }
    if (daysSinceLastFollowUp === 2) {
      return { ragStatus: 'AMBER', ragReason: '2 days since last contact' };
    }
    return { ragStatus: 'GREEN', ragReason: 'Recent contact' };
  }

  // Interested status
  if (status === 'Interested') {
    if (daysSinceLastFollowUp >= 5) {
      return { ragStatus: 'RED', ragReason: `${daysSinceLastFollowUp} days since last contact` };
    }
    if (daysSinceLastFollowUp >= 3) {
      return { ragStatus: 'AMBER', ragReason: `${daysSinceLastFollowUp} days since last contact` };
    }
    return { ragStatus: 'GREEN', ragReason: 'Recent contact' };
  }

  return { ragStatus: 'GREEN', ragReason: 'On track' };
}

export function calculateFollowUpRAGStatus(contactStatus: string): { ragStatus: RAGStatus; ragReason: string } {
  const redStatuses = ['Wrong Number', 'Declined'];
  const amberStatuses = ['No Answer', 'Busy'];
  const greenStatuses = ['Successful', 'Scheduled', 'Completed'];

  if (redStatuses.includes(contactStatus)) {
    return { ragStatus: 'RED', ragReason: contactStatus };
  }
  if (amberStatuses.includes(contactStatus)) {
    return { ragStatus: 'AMBER', ragReason: contactStatus };
  }
  if (greenStatuses.includes(contactStatus)) {
    return { ragStatus: 'GREEN', ragReason: contactStatus };
  }
  return { ragStatus: 'AMBER', ragReason: 'Unknown status' };
}

/**
 * Get dashboard overview with RAG status counts
 */
export async function getDashboardOverview(
  db: Database,
  auth: AuthContext,
  filters?: { dateFrom?: Date; dateTo?: Date; programId?: string },
) {
  const branchFilter = await buildSoulsScopeFilter(db, auth);
  const dateFilter =
    filters?.dateFrom && filters?.dateTo
      ? and(gte(souls.createdAt, filters.dateFrom), lte(souls.createdAt, filters.dateTo))
      : undefined;
  const programFilter = filters?.programId ? eq(souls.outreachId, filters.programId) : undefined;
  const whereClause = combineFilters(branchFilter, dateFilter, programFilter);

  const soulsData = await db
    .select({
      id: souls.id,
      status: souls.status,
      assignedMemberId: souls.assignedMemberId,
      branchId: outreachPrograms.branchId,
      assignedMemberBranchId: members.homeBranchId,
      lastFollowUpDate: sql<Date>`(
        SELECT MAX(follow_up_date) 
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
      daysSinceLastFollowUp: sql<number>`(
        SELECT EXTRACT(DAY FROM NOW() - MAX(follow_up_date))::integer
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
      hasFollowUp: sql<boolean>`(
        SELECT COUNT(*) > 0
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .leftJoin(members, eq(souls.assignedMemberId, members.id))
    .where(whereClause);

  // Calculate RAG for each soul
  const ragCounts = { RED: 0, AMBER: 0, GREEN: 0 };
  const statusCounts: Record<string, number> = {};

  soulsData.forEach((soul) => {
    const { ragStatus } = calculateSoulRAGStatus(
      soul.status,
      soul.daysSinceLastFollowUp,
      soul.hasFollowUp,
    );
    ragCounts[ragStatus]++;
    statusCounts[soul.status] = (statusCounts[soul.status] || 0) + 1;
  });

  return {
    totalSouls: soulsData.length,
    ragCounts,
    statusCounts,
    criticalCount: ragCounts.RED,
    monitorCount: ragCounts.AMBER,
    allGoodCount: ragCounts.GREEN,
  };
}

/**
 * Get detailed souls list with RAG status
 */
export async function getSoulsWithRAGStatus(
  db: Database,
  auth: AuthContext,
  filters?: {
    ragStatus?: RAGStatus;
    status?: string;
    page?: number;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
    programId?: string;
  },
): Promise<{ data: SoulWithRAG[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;
  const branchFilter = await buildSoulsScopeFilter(db, auth);
  const dateFilter =
    filters?.dateFrom && filters?.dateTo
      ? and(gte(souls.createdAt, filters.dateFrom), lte(souls.createdAt, filters.dateTo))
      : undefined;
  const programFilter = filters?.programId ? eq(souls.outreachId, filters.programId) : undefined;
  const whereClause = combineFilters(branchFilter, dateFilter, programFilter);

  const soulsData = await db
    .select({
      id: souls.id,
      firstName: souls.firstName,
      lastName: souls.lastName,
      phone: souls.phone,
      email: souls.email,
      status: souls.status,
      assignedMemberId: souls.assignedMemberId,
      assignedMemberName: sql<string>`CONCAT(${members.firstName}, ' ', ${members.lastName})`,
      assignedMemberBranchName: sql<string>`(
        SELECT b.branch_name 
        FROM branches b 
        WHERE b.id = ${members.homeBranchId}
      )`,
      outreachName: outreachPrograms.programName,
      branchId: outreachPrograms.branchId,
      assignedMemberBranchId: members.homeBranchId,
      lastFollowUpDate: sql<Date>`(
        SELECT MAX(follow_up_date) 
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
      daysSinceLastFollowUp: sql<number>`(
        SELECT EXTRACT(DAY FROM NOW() - MAX(follow_up_date))::integer
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
      hasFollowUp: sql<boolean>`(
        SELECT COUNT(*) > 0
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
      createdAt: souls.createdAt,
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .leftJoin(members, eq(souls.assignedMemberId, members.id))
    .where(whereClause)
    .orderBy(souls.createdAt);

  // Calculate RAG and filter
  let filteredSouls = soulsData.map((soul) => {
    const { ragStatus, ragReason } = calculateSoulRAGStatus(
      soul.status,
      soul.daysSinceLastFollowUp,
      soul.hasFollowUp,
    );

    return {
      id: soul.id,
      firstName: soul.firstName,
      lastName: soul.lastName,
      phone: soul.phone,
      email: soul.email,
      status: soul.status,
      assignedMemberId: soul.assignedMemberId,
      assignedMemberName: soul.assignedMemberName,
      assignedMemberBranchName: soul.assignedMemberBranchName,
      outreachName: soul.outreachName,
      lastFollowUpDate: soul.lastFollowUpDate,
      daysSinceLastFollowUp: soul.daysSinceLastFollowUp,
      ragStatus,
      ragReason,
      createdAt: soul.createdAt,
    };
  });

  // Apply filters
  if (filters?.ragStatus) {
    filteredSouls = filteredSouls.filter((s) => s.ragStatus === filters.ragStatus);
  }
  if (filters?.status) {
    filteredSouls = filteredSouls.filter((s) => s.status === filters.status);
  }

  const total = filteredSouls.length;
  const paginatedData = filteredSouls.slice(offset, offset + limit);

  return {
    data: paginatedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get follow-ups with RAG status
 */
export async function getFollowUpsWithRAGStatus(
  db: Database,
  auth: AuthContext,
  filters?: {
    ragStatus?: RAGStatus;
    page?: number;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
    programId?: string;
  },
): Promise<{ data: FollowUpWithRAG[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;
  const branchFilter = await buildSoulsScopeFilter(db, auth);
  const dateFilter =
    filters?.dateFrom && filters?.dateTo
      ? and(gte(followUps.followUpDate, filters.dateFrom), lte(followUps.followUpDate, filters.dateTo))
      : undefined;
  const programFilter = filters?.programId ? eq(souls.outreachId, filters.programId) : undefined;
  const whereClause = combineFilters(branchFilter, dateFilter, programFilter);

  const followUpsData = await db
    .select({
      id: followUps.id,
      soulId: followUps.soulId,
      soulFirstName: souls.firstName,
      soulLastName: souls.lastName,
      contactStatus: followUps.contactStatus,
      contactMethod: followUps.contactMethod,
      followUpDate: followUps.followUpDate,
      memberName: sql<string>`CONCAT(${members.firstName}, ' ', ${members.lastName})`,
      branchId: outreachPrograms.branchId,
      assignedMemberBranchId: members.homeBranchId,
    })
    .from(followUps)
    .innerJoin(souls, eq(followUps.soulId, souls.id))
    .leftJoin(members, eq(followUps.memberId, members.id))
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .where(whereClause)
    .orderBy(sql`${followUps.followUpDate} DESC`)
    .limit(1000);

  // Calculate RAG and filter
  let filteredFollowUps = followUpsData.map((fu) => {
    const { ragStatus, ragReason } = calculateFollowUpRAGStatus(fu.contactStatus);

    return {
      id: fu.id,
      soulId: fu.soulId,
      soulName: `${fu.soulFirstName} ${fu.soulLastName}`,
      contactStatus: fu.contactStatus,
      contactMethod: fu.contactMethod,
      followUpDate: fu.followUpDate,
      memberName: fu.memberName,
      ragStatus,
      ragReason,
    };
  });

  // Apply filters
  if (filters?.ragStatus) {
    filteredFollowUps = filteredFollowUps.filter((f) => f.ragStatus === filters.ragStatus);
  }

  const total = filteredFollowUps.length;
  const paginatedData = filteredFollowUps.slice(offset, offset + limit);

  return {
    data: paginatedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get follow-up RAG overview
 */
export async function getFollowUpRAGOverview(
  db: Database,
  auth: AuthContext,
  filters?: { dateFrom?: Date; dateTo?: Date; programId?: string },
) {
  const branchFilter = await buildSoulsScopeFilter(db, auth);
  const dateFilter =
    filters?.dateFrom && filters?.dateTo
      ? and(gte(followUps.followUpDate, filters.dateFrom), lte(followUps.followUpDate, filters.dateTo))
      : undefined;
  const programFilter = filters?.programId ? eq(souls.outreachId, filters.programId) : undefined;
  const whereClause = combineFilters(branchFilter, dateFilter, programFilter);

  const followUpsData = await db
    .select({
      contactStatus: followUps.contactStatus,
    })
    .from(followUps)
    .innerJoin(souls, eq(followUps.soulId, souls.id))
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .leftJoin(members, eq(souls.assignedMemberId, members.id))
    .where(whereClause);

  const ragCounts = { RED: 0, AMBER: 0, GREEN: 0 };

  followUpsData.forEach((fu) => {
    const { ragStatus } = calculateFollowUpRAGStatus(fu.contactStatus);
    ragCounts[ragStatus]++;
  });

  return {
    totalFollowUps: followUpsData.length,
    ragCounts,
    criticalCount: ragCounts.RED,
    monitorCount: ragCounts.AMBER,
    successfulCount: ragCounts.GREEN,
  };
}

/**
 * Get comprehensive analytics for dashboard
 */
export async function getDashboardAnalytics(
  db: Database,
  auth: AuthContext,
  filters?: { dateFrom?: Date; dateTo?: Date; programId?: string },
) {
  const branchFilter = await buildSoulsScopeFilter(db, auth);
  const soulsDateFilter =
    filters?.dateFrom && filters?.dateTo
      ? and(gte(souls.createdAt, filters.dateFrom), lte(souls.createdAt, filters.dateTo))
      : undefined;
  const followUpsDateFilter =
    filters?.dateFrom && filters?.dateTo
      ? and(gte(followUps.followUpDate, filters.dateFrom), lte(followUps.followUpDate, filters.dateTo))
      : undefined;
  const programFilter = filters?.programId ? eq(souls.outreachId, filters.programId) : undefined;
  const soulsWhere = combineFilters(branchFilter, soulsDateFilter, programFilter);
  const followUpsWhere = combineFilters(branchFilter, followUpsDateFilter, programFilter);

  // Get all souls with RAG status
  const soulsData = await db
    .select({
      id: souls.id,
      status: souls.status,
      createdAt: souls.createdAt,
      assignedMemberId: souls.assignedMemberId,
      branchId: outreachPrograms.branchId,
      assignedMemberBranchId: members.homeBranchId,
      lastFollowUpDate: sql<Date>`(
        SELECT MAX(follow_up_date) 
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
      daysSinceLastFollowUp: sql<number>`(
        SELECT EXTRACT(DAY FROM NOW() - MAX(follow_up_date))::integer
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
      hasFollowUp: sql<boolean>`(
        SELECT COUNT(*) > 0
        FROM follow_ups 
        WHERE follow_ups.soul_id = ${souls.id}
      )`,
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .leftJoin(members, eq(souls.assignedMemberId, members.id))
    .where(soulsWhere);

  // Calculate RAG for each soul
  const ragByStatus: Record<string, { RED: number; AMBER: number; GREEN: number }> = {};
  const ragTrend: Array<{ date: string; RED: number; AMBER: number; GREEN: number }> = [];
  const statusDistribution: Record<string, number> = {};
  const conversionFunnel = {
    New: 0,
    'Following Up': 0,
    Interested: 0,
    Converted: 0,
    'Not Interested': 0,
    'Lost Contact': 0,
  };

  // Group by date for trend analysis - dynamic window based on filter date range
  // Defaults to last 30 days; capped at 90 days for chart readability
  const trendStart = filters?.dateFrom ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const trendEnd = filters?.dateTo ?? new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const dayCount = Math.min(
    90,
    Math.max(1, Math.floor((trendEnd.getTime() - trendStart.getTime()) / msPerDay) + 1),
  );
  const trendDays: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    if (dateStr) {
      trendDays.push(dateStr);
    }
  }

  const trendMap: Record<string, { RED: number; AMBER: number; GREEN: number }> = {};
  trendDays.forEach((date) => {
    trendMap[date] = { RED: 0, AMBER: 0, GREEN: 0 };
  });

  soulsData.forEach((soul) => {
    const { ragStatus } = calculateSoulRAGStatus(
      soul.status,
      soul.daysSinceLastFollowUp,
      soul.hasFollowUp,
    );

    // RAG by status
    if (!ragByStatus[soul.status]) {
      ragByStatus[soul.status] = { RED: 0, AMBER: 0, GREEN: 0 };
    }
    const statusRag = ragByStatus[soul.status];
    if (statusRag) {
      statusRag[ragStatus]++;
    }

    // Status distribution
    statusDistribution[soul.status] = (statusDistribution[soul.status] || 0) + 1;

    // Conversion funnel
    if (soul.status in conversionFunnel) {
      const statusKey = soul.status as keyof typeof conversionFunnel;
      conversionFunnel[statusKey]++;
    }

    // Trend analysis - count souls by their creation date
    const soulDateParts = new Date(soul.createdAt).toISOString().split('T');
    const soulDate = soulDateParts[0];
    if (soulDate) {
      const trendEntry = trendMap[soulDate];
      if (trendEntry) {
        trendEntry[ragStatus]++;
      }
    }
  });

  // Convert trend map to array
  Object.entries(trendMap).forEach(([date, counts]) => {
    ragTrend.push({ date, ...counts });
  });

  // Calculate predictive metrics
  const totalSouls = soulsData.length;
  const converted = conversionFunnel.Converted;
  const conversionRate = totalSouls > 0 ? (converted / totalSouls) * 100 : 0;

  // Average days to conversion
  const convertedSouls = soulsData.filter((s) => s.status === 'Converted');
  const avgDaysToConversion =
    convertedSouls.length > 0
      ? convertedSouls.reduce((sum, s) => {
          const days = Math.floor(
            (new Date().getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }, 0) / convertedSouls.length
      : 0;

  // Predict conversions for next 30 days based on current rate
  const last30DaysSouls = soulsData.filter((s) => {
    const daysAgo = Math.floor(
      (new Date().getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysAgo <= 30;
  });
  const recentConversionRate =
    last30DaysSouls.length > 0
      ? (last30DaysSouls.filter((s) => s.status === 'Converted').length / last30DaysSouls.length) * 100
      : 0;
  const predictedConversions = Math.round((last30DaysSouls.length * recentConversionRate) / 100);

  // Response rate by contact method
  const followUpsData = await db
    .select({
      contactMethod: followUps.contactMethod,
      contactStatus: followUps.contactStatus,
    })
    .from(followUps)
    .innerJoin(souls, eq(followUps.soulId, souls.id))
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .leftJoin(members, eq(souls.assignedMemberId, members.id))
    .where(followUpsWhere);

  const responseRateByMethod: Record<string, { total: number; successful: number }> = {};
  followUpsData.forEach((fu) => {
    const method = fu.contactMethod || 'Unknown';
    if (!responseRateByMethod[method]) {
      responseRateByMethod[method] = { total: 0, successful: 0 };
    }
    responseRateByMethod[method].total++;
    if (fu.contactStatus === 'Successful') {
      responseRateByMethod[method].successful++;
    }
  });

  const responseRates = Object.entries(responseRateByMethod).map(([method, data]) => ({
    method,
    rate: data.total > 0 ? (data.successful / data.total) * 100 : 0,
    total: data.total,
  }));

  // Stage assimilation rates: percentage of souls who advanced from one funnel
  // stage to the next. Uses cumulative "reached at least this stage" counts so
  // 'New' = total entering the funnel, 'Converted' = those who finished. A high
  // rate indicates a healthy hand-off; a low rate flags where coaching is needed.
  const funnelStages = ['New', 'Following Up', 'Interested', 'Converted'] as const;
  const cumulative = funnelStages.map((_, i) =>
    funnelStages.slice(i).reduce((sum, key) => sum + (conversionFunnel[key] || 0), 0),
  );
  const assimilationRates: Record<string, number> = {};
  for (let i = 0; i < funnelStages.length - 1; i++) {
    const from = cumulative[i] ?? 0;
    const to = cumulative[i + 1] ?? 0;
    const key = `${funnelStages[i]} → ${funnelStages[i + 1]}`;
    assimilationRates[key] = from > 0 ? Math.round((to / from) * 1000) / 10 : 0;
  }

  return {
    overview: {
      totalSouls,
      converted,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgDaysToConversion: Math.round(avgDaysToConversion),
      activeFollowUps: soulsData.filter((s) =>
        ['New', 'Following Up', 'Interested'].includes(s.status),
      ).length,
    },
    ragByStatus,
    ragTrend,
    statusDistribution,
    conversionFunnel,
    assimilationRates,
    predictive: {
      predictedConversions,
      recentConversionRate: Math.round(recentConversionRate * 10) / 10,
      trendDirection: recentConversionRate > conversionRate ? 'up' : 'down',
    },
    responseRates,
  };
}

