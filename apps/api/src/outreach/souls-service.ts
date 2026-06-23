import { eq, and, or, ilike, count, sql, inArray, exists, type SQL } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  souls,
  members,
  outreachPrograms,
  outreachParticipants,
  fellowships,
  fellowshipMembers,
  branchDepartments,
  departmentMembers,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@kairos/utils';
import { authHasCapability } from '../lib/grants';
import { authHasAnyCapability } from '../lib/grants';

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
    fellowshipId?: string | null;
    branchDepartmentId?: string | null;
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
      fellowshipId: input.fellowshipId ?? null,
      branchDepartmentId: input.branchDepartmentId ?? null,
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
    branchId?: string;
    fellowshipId?: string;
    branchDepartmentId?: string;
  },
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;
  const conditions: SQL[] = [];

  // RBAC Phase 4c filtering: admin → no filter (shim); BSA/BDA → branch-wide;
  // fellowship/dept leader → leader-scoped; everyone else → only assigned.
  if (effectiveRole === 'admin') {
    // no scope filter — admin sees everything
  } else if (authHasCapability(auth, 'branch:read')) {
    // Branch-tier admins see souls from their branch — via the program OR
    // via the assignee. (Pre-Phase-4c: 'pastor' systemRole.)
    conditions.push(
      or(
        eq(outreachPrograms.branchId, auth.branchId),
        eq(members.homeBranchId, auth.branchId),
      )!,
    );
  } else if (authHasAnyCapability(auth, 'fellowship:read', 'department:read')) {
    // Leaders see souls connected to fellowships / departments they lead OR co-lead.
    // Connection paths (any one is enough):
    //   1. The soul is assigned to ME directly.
    //   2. The soul is assigned to a member of one of MY fellowships/depts.
    //   3. The soul's outreach program coordinator is a member of one of MY groups.
    //   4. The soul's outreach program has a participant who is a member of one of MY groups.
    //   5. The outreach program OR the soul itself is directly attributed to one of MY groups.
    const ledFellowshipIds = (
      await db
        .select({ id: fellowships.id })
        .from(fellowships)
        .where(
          and(
            eq(fellowships.isActive, true),
            or(
              eq(fellowships.leaderId, auth.memberId),
              eq(fellowships.coLeaderId, auth.memberId),
            )!,
          ),
        )
    ).map((r) => r.id);

    const ledDepartmentIds = (
      await db
        .select({ id: branchDepartments.id })
        .from(branchDepartments)
        .where(
          and(
            eq(branchDepartments.isActive, true),
            or(
              eq(branchDepartments.leadMemberId, auth.memberId),
              eq(branchDepartments.deputyMemberId, auth.memberId),
            )!,
          ),
        )
    ).map((r) => r.id);

    if (ledFellowshipIds.length === 0 && ledDepartmentIds.length === 0) {
      // Leader doesn't lead any group — fall back to own-assigned souls.
      conditions.push(eq(souls.assignedMemberId, auth.memberId));
    } else {
      const groupMemberIds = sql`(
        SELECT ${fellowshipMembers.memberId} FROM ${fellowshipMembers}
        WHERE ${fellowshipMembers.isActive} = true
        ${ledFellowshipIds.length > 0
          ? sql`AND ${inArray(fellowshipMembers.fellowshipId, ledFellowshipIds)}`
          : sql`AND false`}
        UNION
        SELECT ${departmentMembers.memberId} FROM ${departmentMembers}
        WHERE ${departmentMembers.isActive} = true
        ${ledDepartmentIds.length > 0
          ? sql`AND ${inArray(departmentMembers.branchDepartmentId, ledDepartmentIds)}`
          : sql`AND false`}
      )`;

      const orParts: SQL[] = [
        // Path 1: assigned to me
        eq(souls.assignedMemberId, auth.memberId),
        // Path 2: assigned to a group member
        sql`${souls.assignedMemberId} IN ${groupMemberIds}`,
        // Path 3: program coordinator is a group member
        exists(
          db
            .select({ one: sql`1` })
            .from(outreachPrograms)
            .where(
              and(
                eq(outreachPrograms.id, souls.outreachId),
                sql`${outreachPrograms.coordinatorId} IN ${groupMemberIds}`,
              ),
            ),
        ),
        // Path 4: program has a participant who is a group member
        exists(
          db
            .select({ one: sql`1` })
            .from(outreachParticipants)
            .where(
              and(
                eq(outreachParticipants.outreachId, souls.outreachId),
                sql`${outreachParticipants.memberId} IN ${groupMemberIds}`,
              ),
            ),
        ),
      ];
      // Path 5a: direct attribution on the soul itself
      if (ledFellowshipIds.length > 0) {
        orParts.push(inArray(souls.fellowshipId, ledFellowshipIds));
      }
      if (ledDepartmentIds.length > 0) {
        orParts.push(inArray(souls.branchDepartmentId, ledDepartmentIds));
      }
      // Path 5b: direct attribution on the program
      const programAttributionConds: SQL[] = [];
      if (ledFellowshipIds.length > 0) {
        programAttributionConds.push(inArray(outreachPrograms.fellowshipId, ledFellowshipIds));
      }
      if (ledDepartmentIds.length > 0) {
        programAttributionConds.push(
          inArray(outreachPrograms.branchDepartmentId, ledDepartmentIds),
        );
      }
      if (programAttributionConds.length > 0) {
        orParts.push(
          exists(
            db
              .select({ one: sql`1` })
              .from(outreachPrograms)
              .where(
                and(
                  eq(outreachPrograms.id, souls.outreachId),
                  or(...programAttributionConds)!,
                ),
              ),
          ),
        );
      }
      conditions.push(or(...orParts)!);
    }
  } else {
    // RBAC Phase 4c: plain members see only souls assigned to them.
    conditions.push(eq(souls.assignedMemberId, auth.memberId));
  }
  // Admin sees all (no condition pushed in the admin branch above)

  // Filters
  if (query.status) {
    conditions.push(eq(souls.status, query.status));
  }

  // Branch filter — useful for admin (and harmless for everyone else; their role
  // scope already constrains the result, this just narrows further).
  if (query.branchId) {
    conditions.push(
      or(
        eq(outreachPrograms.branchId, query.branchId),
        eq(members.homeBranchId, query.branchId),
      )!,
    );
  }

  // Fellowship attribution filter — covers BOTH direct soul attribution AND
  // the soul being assigned to a member of that fellowship.
  if (query.fellowshipId) {
    conditions.push(
      or(
        eq(souls.fellowshipId, query.fellowshipId),
        eq(outreachPrograms.fellowshipId, query.fellowshipId),
        exists(
          db
            .select({ one: sql`1` })
            .from(fellowshipMembers)
            .where(
              and(
                eq(fellowshipMembers.memberId, souls.assignedMemberId),
                eq(fellowshipMembers.fellowshipId, query.fellowshipId),
                eq(fellowshipMembers.isActive, true),
              ),
            ),
        ),
      )!,
    );
  }

  // Department attribution filter — symmetric to fellowship.
  if (query.branchDepartmentId) {
    conditions.push(
      or(
        eq(souls.branchDepartmentId, query.branchDepartmentId),
        eq(outreachPrograms.branchDepartmentId, query.branchDepartmentId),
        exists(
          db
            .select({ one: sql`1` })
            .from(departmentMembers)
            .where(
              and(
                eq(departmentMembers.memberId, souls.assignedMemberId),
                eq(departmentMembers.branchDepartmentId, query.branchDepartmentId),
                eq(departmentMembers.isActive, true),
              ),
            ),
        ),
      )!,
    );
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
  const effectiveRole = auth.activeRole ?? auth.systemRole;
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
  if (effectiveRole === 'member' && soul.assignedMemberId !== auth.memberId) {
    throw new ForbiddenError('You can only access souls assigned to you');
  }

  // Branch isolation for pastor/leader — they must not see souls outside their branch,
  // either via the soul's outreach program OR via an assignee from another branch.
  if (effectiveRole !== 'admin' && authHasAnyCapability(auth, 'branch:read', 'fellowship:read', 'department:read')) {
    // Need branchIds for both the program and the assignee.
    const [scope] = await db
      .select({
        programBranchId: outreachPrograms.branchId,
        assigneeBranchId: members.homeBranchId,
      })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
      .leftJoin(members, eq(souls.assignedMemberId, members.id))
      .where(eq(souls.id, soulId));
    const inBranch =
      scope?.programBranchId === auth.branchId || scope?.assigneeBranchId === auth.branchId;
    if (!inBranch) {
      throw new ForbiddenError('You can only access souls from your branch');
    }
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
  const effectiveRole = auth.activeRole ?? auth.systemRole;
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
  if ((effectiveRole !== 'admin' && authHasAnyCapability(auth, 'branch:read', 'fellowship:read', 'department:read')) && soul.branchId !== auth.branchId) {
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
  if ((effectiveRole !== 'admin' && authHasAnyCapability(auth, 'branch:read', 'fellowship:read', 'department:read')) && newMember.homeBranchId !== auth.branchId) {
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
  const effectiveRole = auth.activeRole ?? auth.systemRole;
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
  if ((effectiveRole !== 'admin' && authHasAnyCapability(auth, 'branch:read', 'fellowship:read', 'department:read')) && newMember.homeBranchId !== auth.branchId) {
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
  if (effectiveRole !== 'admin' && authHasAnyCapability(auth, 'branch:read', 'fellowship:read', 'department:read')) {
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
