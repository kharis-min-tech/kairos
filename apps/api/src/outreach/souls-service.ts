import { eq, and, or, ilike, count, sql, inArray, type SQL } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { souls, members, outreachPrograms } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@kairos/utils';

/**
 * Capture a new soul
 * - Auto-assigns to capturing worker
 * - Initializes status to 'New'
 * - Supports ad-hoc capture (outreach_id = null)
 * - Normalizes email to lowercase
 */
export async function captureSoul(
  db: Database,
  input: {
    outreachId?: string | null;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    gender?: 'Male' | 'Female';
    ageRange?: string;
    notes?: string;
  },
  auth: AuthContext,
) {
  const [soul] = await db
    .insert(souls)
    .values({
      outreachId: input.outreachId ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email ? input.email.toLowerCase() : null,
      address: input.address ?? null,
      city: input.city ?? null,
      gender: input.gender ?? null,
      ageRange: input.ageRange ?? null,
      assignedMemberId: auth.memberId,
      status: 'New',
      notes: input.notes ?? null,
    })
    .returning();

  return soul;
}

/**
 * Update soul status
 * - Allows all six status values
 * - Supports bidirectional transitions
 * - Requires converted_to_member_id for 'Converted' status
 * - Normalizes status value (trim)
 */
export async function updateSoulStatus(
  db: Database,
  soulId: string,
  input: {
    status: string;
    convertedToMemberId?: string;
  },
  _auth: AuthContext,
) {
  // Normalize status
  const status = input.status.trim();

  // Validate status
  const validStatuses = ['New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Require converted_to_member_id for Converted status
  if (status === 'Converted' && !input.convertedToMemberId) {
    throw new ValidationError('converted_to_member_id is required when status is Converted');
  }

  // Verify soul exists
  const [existing] = await db
    .select({ id: souls.id })
    .from(souls)
    .where(eq(souls.id, soulId));

  if (!existing) {
    throw new NotFoundError('Soul not found');
  }

  // Update status
  const [updated] = await db
    .update(souls)
    .set({
      status,
      convertedToMemberId: input.convertedToMemberId ?? null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(souls.id, soulId))
    .returning();

  return updated;
}

/**
 * List souls with pagination and filters
 * - Uses LEFT JOIN to include ad-hoc souls
 * - Applies role-based filtering (Member: assigned only, Pastor: branch only, Admin: all)
 * - Supports search by name, phone, email
 * - Calculates overdue indicators
 */
export async function listSouls(
  db: Database,
  auth: AuthContext,
  query: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    assignedMemberId?: string;
    outreachId?: string;
    overdueOnly?: boolean;
  },
) {
  const conditions: SQL[] = [];

  // Role-based filtering
  if (auth.systemRole === 'member') {
    // Members see only souls assigned to them
    conditions.push(eq(souls.assignedMemberId, auth.memberId));
  } else if (auth.systemRole === 'pastor' || auth.systemRole === 'leader') {
    // Pastors and Leaders see souls from their branch (via outreach program or assigned member)
    conditions.push(
      or(
        eq(outreachPrograms.branchId, auth.branchId),
        eq(members.homeBranchId, auth.branchId),
      )!,
    );
  }
  // Admin sees all

  // Filters
  if (query.status) {
    conditions.push(eq(souls.status, query.status));
  }

  if (query.assignedMemberId) {
    conditions.push(eq(souls.assignedMemberId, query.assignedMemberId));
  }

  if (query.outreachId) {
    conditions.push(eq(souls.outreachId, query.outreachId));
  }

  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(
      or(
        ilike(souls.firstName, term),
        ilike(souls.lastName, term),
        ilike(souls.phone, term),
        ilike(souls.email, term),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: souls.id,
        outreachId: souls.outreachId,
        outreachName: outreachPrograms.programName,
        firstName: souls.firstName,
        lastName: souls.lastName,
        phone: souls.phone,
        email: souls.email,
        address: souls.address,
        city: souls.city,
        gender: souls.gender,
        ageRange: souls.ageRange,
        assignedMemberId: souls.assignedMemberId,
        assignedMemberName: sql<string>`CONCAT(${members.firstName}, ' ', ${members.lastName})`,
        convertedToMemberId: souls.convertedToMemberId,
        status: souls.status,
        notes: souls.notes,
        createdAt: souls.createdAt,
        updatedAt: souls.updatedAt,
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
      })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
      .leftJoin(members, eq(souls.assignedMemberId, members.id))
      .where(where)
      .limit(query.limit)
      .offset(offset)
      .orderBy(souls.createdAt),
    db
      .select({ count: count() })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
      .leftJoin(members, eq(souls.assignedMemberId, members.id))
      .where(where),
  ]);

  return {
    data: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: total!.count,
      totalPages: Math.ceil(total!.count / query.limit),
    },
  };
}

/**
 * Get a single soul with details
 */
export async function getSoul(
  db: Database,
  soulId: string,
  auth: AuthContext,
) {
  const [soul] = await db
    .select({
      id: souls.id,
      outreachId: souls.outreachId,
      outreachName: outreachPrograms.programName,
      firstName: souls.firstName,
      lastName: souls.lastName,
      phone: souls.phone,
      email: souls.email,
      address: souls.address,
      city: souls.city,
      gender: souls.gender,
      ageRange: souls.ageRange,
      assignedMemberId: souls.assignedMemberId,
      assignedMemberName: sql<string>`CONCAT(${members.firstName}, ' ', ${members.lastName})`,
      convertedToMemberId: souls.convertedToMemberId,
      status: souls.status,
      notes: souls.notes,
      createdAt: souls.createdAt,
      updatedAt: souls.updatedAt,
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
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .leftJoin(members, eq(souls.assignedMemberId, members.id))
    .where(eq(souls.id, soulId));

  if (!soul) {
    throw new NotFoundError('Soul not found');
  }

  // Access control
  if (auth.systemRole === 'member' && soul.assignedMemberId !== auth.memberId) {
    throw new ForbiddenError('You can only access souls assigned to you');
  }

  return soul;
}

/**
 * Reassign a soul to a different worker
 * - Validates new member is active
 * - Enforces branch constraints for Pastor
 * - Preserves follow-up history
 */
export async function reassignSoul(
  db: Database,
  soulId: string,
  input: { assignedMemberId: string },
  auth: AuthContext,
) {
  // Get soul with branch info
  const [soul] = await db
    .select({
      id: souls.id,
      assignedMemberId: souls.assignedMemberId,
      branchId: outreachPrograms.branchId,
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .where(eq(souls.id, soulId));

  if (!soul) {
    throw new NotFoundError('Soul not found');
  }

  // Branch isolation for Pastor/Leader
  if ((auth.systemRole === 'pastor' || auth.systemRole === 'leader') && soul.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only reassign souls from your own branch');
  }

  // Validate new member
  const [newMember] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(and(eq(members.id, input.assignedMemberId), eq(members.isActive, true)));

  if (!newMember) {
    throw new ValidationError('New assigned member not found or inactive');
  }

  // For Pastor/Leader, ensure new member is from same branch
  if ((auth.systemRole === 'pastor' || auth.systemRole === 'leader') && newMember.homeBranchId !== auth.branchId) {
    throw new ForbiddenError('You can only assign souls to members from your own branch');
  }

  // Update assignment
  const [updated] = await db
    .update(souls)
    .set({
      assignedMemberId: input.assignedMemberId,
      updatedAt: sql`NOW()`,
    })
    .where(eq(souls.id, soulId))
    .returning();

  return updated;
}

/**
 * Search souls by name, phone, or email
 */
export async function searchSouls(
  db: Database,
  searchTerm: string,
  auth: AuthContext,
) {
  return listSouls(db, auth, {
    page: 1,
    limit: 50,
    search: searchTerm,
  });
}

/**
 * Filter souls by status
 */
export async function filterSoulsByStatus(
  db: Database,
  status: string,
  auth: AuthContext,
) {
  return listSouls(db, auth, {
    page: 1,
    limit: 100,
    status,
  });
}

/**
 * Bulk reassign multiple souls to a worker
 * - Validates all soul IDs exist
 * - Validates new member is active
 * - Enforces branch constraints for Pastor/Leader
 * - Returns count of successfully reassigned souls
 */
export async function bulkReassignSouls(
  db: Database,
  input: {
    soulIds: string[];
    assignedMemberId: string;
  },
  auth: AuthContext,
) {
  if (!input.soulIds || input.soulIds.length === 0) {
    throw new ValidationError('At least one soul ID is required');
  }

  // Validate new member
  const [newMember] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(and(eq(members.id, input.assignedMemberId), eq(members.isActive, true)));

  if (!newMember) {
    throw new ValidationError('New assigned member not found or inactive');
  }

  // For Pastor/Leader, ensure new member is from same branch
  if ((auth.systemRole === 'pastor' || auth.systemRole === 'leader') && newMember.homeBranchId !== auth.branchId) {
    throw new ForbiddenError('You can only assign souls to members from your own branch');
  }

  // Get all souls with branch info
  const soulsList = await db
    .select({
      id: souls.id,
      branchId: outreachPrograms.branchId,
      assignedMemberBranchId: members.homeBranchId,
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .leftJoin(members, eq(souls.assignedMemberId, members.id))
    .where(inArray(souls.id, input.soulIds));

  if (soulsList.length === 0) {
    throw new NotFoundError('No souls found with provided IDs');
  }

  // Branch isolation check for Pastor/Leader
  if (auth.systemRole === 'pastor' || auth.systemRole === 'leader') {
    const invalidSouls = soulsList.filter(
      (soul) => soul.branchId !== auth.branchId && soul.assignedMemberBranchId !== auth.branchId
    );
    if (invalidSouls.length > 0) {
      throw new ForbiddenError('You can only reassign souls from your own branch');
    }
  }

  // Bulk update
  const result = await db
    .update(souls)
    .set({
      assignedMemberId: input.assignedMemberId,
      updatedAt: sql`NOW()`,
    })
    .where(inArray(souls.id, input.soulIds))
    .returning({ id: souls.id });

  return {
    reassignedCount: result.length,
    soulIds: result.map((s) => s.id),
  };
}

/**
 * Export souls to CSV
 */
export async function exportSoulsToCSV(
  db: Database,
  auth: AuthContext,
  filters?: {
    status?: string;
    outreachId?: string;
    assignedMemberId?: string;
  },
): Promise<string> {
  const result = await listSouls(db, auth, {
    page: 1,
    limit: 10000,
    ...filters,
  });

  const headers = [
    'firstName',
    'lastName',
    'phone',
    'email',
    'address',
    'city',
    'gender',
    'ageRange',
    'status',
    'assignedMemberName',
    'outreachName',
    'createdAt',
  ];

  const escapeCSV = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(','),
    ...result.data.map((soul) =>
      headers.map((h) => escapeCSV((soul as Record<string, unknown>)[h])).join(',')
    ),
  ];

  return lines.join('\n');
}
