import { eq, and, or, ilike, count, sql, inArray, type SQL } from 'drizzle-orm';
import { authHasAnyCapability } from '../lib/grants';
import { authHasCapability } from '../lib/grants';
import type { Database } from '@kairos/database';
import { outreachPrograms, members, branches, outreachParticipants, souls } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@kairos/utils';

/**
 * Create a new outreach program
 * - Auto-sets branch_id for Pastor users
 * - Requires branch_id for Admin users
 * - Validates coordinator is active member from correct branch
 * - Detects case-insensitive duplicate program names
 */
export async function createProgram(
  db: Database,
  input: {
    programName: string;
    programDate: string;
    location: string;
    address?: string;
    city?: string;
    description?: string;
    coordinatorId?: string;
    branchId?: string;
    fellowshipId?: string | null;
    branchDepartmentId?: string | null;
    notes?: string;
    isOpenToAllBranches?: boolean;
  },
  auth: AuthContext,
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  // Auto-set branch_id for Pastor/Leader, require for Admin
  let branchId = input.branchId;
  if (authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read')) {
    branchId = auth.branchId;
  } else if (effectiveRole === 'admin' && !branchId) {
    throw new ValidationError('branch_id is required for Admin users');
  }

  // Enforce branch isolation for Pastor/Leader
  if ((authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read')) && input.branchId && input.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only create programs for your own branch');
  }

  // Only admin can set isOpenToAllBranches
  const isOpenToAllBranches = effectiveRole === 'admin' ? (input.isOpenToAllBranches ?? false) : false;

  // Check for case-insensitive duplicate program name
  const normalizedName = input.programName.toLowerCase().trim();
  const [existing] = await db
    .select({ id: outreachPrograms.id })
    .from(outreachPrograms)
    .where(
      and(
        sql`LOWER(TRIM(${outreachPrograms.programName})) = ${normalizedName}`,
        eq(outreachPrograms.branchId, branchId!),
      ),
    );

  if (existing) {
    throw new ConflictError('A program with this name already exists in this branch');
  }

  // Validate coordinator if provided
  let finalCoordinatorId = null;
  let finalCoordinatorName = null;

  if (input.coordinatorId) {
    if (input.coordinatorId === 'KHARIS') {
      // Special case for admin: use "Kharis" as coordinator name
      if (effectiveRole !== 'admin') {
        throw new ForbiddenError('Only admin can set Kharis as coordinator');
      }
      finalCoordinatorName = 'Kharis';
    } else {
      // Regular member coordinator
      const [coordinator] = await db
        .select({ id: members.id, homeBranchId: members.homeBranchId, firstName: members.firstName, lastName: members.lastName })
        .from(members)
        .where(
          and(
            eq(members.id, input.coordinatorId),
            eq(members.isActive, true),
          ),
        );

      if (!coordinator) {
        throw new ValidationError('Coordinator not found or inactive');
      }

      if (coordinator.homeBranchId !== branchId) {
        throw new ValidationError('Coordinator must be from the same branch as the program');
      }

      finalCoordinatorId = coordinator.id;
    }
  }

  // Create program
  const [program] = await db
    .insert(outreachPrograms)
    .values({
      branchId: branchId!,
      programName: input.programName,
      programDate: input.programDate,
      location: input.location,
      address: input.address ?? null,
      city: input.city ?? null,
      description: input.description ?? null,
      coordinatorId: finalCoordinatorId,
      coordinatorName: finalCoordinatorName,
      createdBy: auth.memberId ?? null,
      fellowshipId: input.fellowshipId ?? null,
      branchDepartmentId: input.branchDepartmentId ?? null,
      notes: input.notes ?? null,
      totalSoulsReached: 0,
      isCompleted: false,
      isOpenToAllBranches,
    })
    .returning();

  return program;
}

/**
 * List outreach programs with pagination and filters
 * - Applies branch isolation for Pastor users
 * - Admin sees all branches
 * - Supports filtering by completion status, date range, coordinator
 * - Supports search by program name
 * - For members, includes their registration status (isRegistered field)
 * - For leaders/pastors/admin, includes participant count (participantCount field)
 */
export async function listPrograms(
  db: Database,
  auth: AuthContext,
  query: {
    page: number;
    limit: number;
    search?: string;
    branchId?: string;
    isCompleted?: boolean;
    coordinatorId?: string;
    startDate?: string;
    endDate?: string;
  },
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  const conditions: SQL[] = [];

  // Branch isolation with exception for programs open to all branches
  if (authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read') || effectiveRole === 'member') {
    // Show programs from own branch OR programs that are open to all branches
    conditions.push(
      or(
        eq(outreachPrograms.branchId, auth.branchId),
        eq(outreachPrograms.isOpenToAllBranches, true)
      )!
    );
  } else if (query.branchId) {
    conditions.push(eq(outreachPrograms.branchId, query.branchId));
  }

  // Filters
  if (query.isCompleted !== undefined) {
    conditions.push(eq(outreachPrograms.isCompleted, query.isCompleted));
  }

  if (query.coordinatorId) {
    conditions.push(eq(outreachPrograms.coordinatorId, query.coordinatorId));
  }

  if (query.startDate) {
    conditions.push(sql`${outreachPrograms.programDate} >= ${query.startDate}`);
  }

  if (query.endDate) {
    conditions.push(sql`${outreachPrograms.programDate} <= ${query.endDate}`);
  }

  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(ilike(outreachPrograms.programName, term));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: outreachPrograms.id,
        branchId: outreachPrograms.branchId,
        branchName: branches.branchName,
        programName: outreachPrograms.programName,
        programDate: outreachPrograms.programDate,
        location: outreachPrograms.location,
        address: outreachPrograms.address,
        city: outreachPrograms.city,
        description: outreachPrograms.description,
        coordinatorId: outreachPrograms.coordinatorId,
        coordinatorName: sql<string>`COALESCE(${outreachPrograms.coordinatorName}, CONCAT(${members.firstName}, ' ', ${members.lastName}))`,
        createdBy: outreachPrograms.createdBy,
        totalSoulsReached: outreachPrograms.totalSoulsReached,
        isCompleted: outreachPrograms.isCompleted,
        isOpenToAllBranches: outreachPrograms.isOpenToAllBranches,
        notes: outreachPrograms.notes,
        createdAt: outreachPrograms.createdAt,
        updatedAt: outreachPrograms.updatedAt,
      })
      .from(outreachPrograms)
      .leftJoin(branches, eq(outreachPrograms.branchId, branches.id))
      .leftJoin(members, eq(outreachPrograms.coordinatorId, members.id))
      .where(where)
      .limit(query.limit)
      .offset(offset)
      .orderBy(outreachPrograms.programDate),
    db
      .select({ count: count() })
      .from(outreachPrograms)
      .where(where),
  ]);

  // Fetch creator names for programs that have a createdBy value
  const creatorIds = [...new Set(rows.filter(r => r.createdBy).map(r => r.createdBy!))];
  let creatorNamesMap = new Map<string, { name: string; role: string }>();
  
  if (creatorIds.length > 0) {
    const creators = await db
      .select({
        id: members.id,
        name: sql<string>`CONCAT(${members.firstName}, ' ', ${members.lastName})`,
        systemRole: members.systemRole,
      })
      .from(members)
      .where(inArray(members.id, creatorIds));
    
    creatorNamesMap = new Map(creators.map(c => [c.id, { name: c.name, role: c.systemRole }]));
  }

  // Add creator names to rows
  // For leaders/pastors viewing: only show creator name if creator is also a leader or pastor (not admin)
  // For admin viewing: always show creator name
  // Also include creatorRole so frontend can determine registration eligibility
  const rowsWithCreatorNames = rows.map(row => {
    if (!row.createdBy) {
      return { ...row, createdByName: null, creatorRole: null };
    }
    
    const creator = creatorNamesMap.get(row.createdBy);
    if (!creator) {
      return { ...row, createdByName: null, creatorRole: null };
    }
    
    // If current user is admin, always show creator name
    if (effectiveRole === 'admin') {
      return { ...row, createdByName: creator.name, creatorRole: creator.role };
    }
    
    // If current user is leader/pastor, only show creator name if creator is also leader/pastor (not admin)
    if ((authHasAnyCapability(auth, 'fellowship:read', 'department:read') || authHasCapability(auth, 'branch:read')) && 
        (creator.role === 'leader' || creator.role === 'pastor')) {
      return { ...row, createdByName: creator.name, creatorRole: creator.role };
    }
    
    // Otherwise, don't show creator name but still include role for registration logic
    return { ...row, createdByName: null, creatorRole: creator.role };
  });

  // For members, check registration status for each program
  // For leaders/pastors/admin, get participant counts
  let programsWithRegistration = rowsWithCreatorNames;
  
  if (effectiveRole === 'member' && auth.memberId) {
    const programIds = rowsWithCreatorNames.map(r => r.id);
    
    if (programIds.length > 0) {
      // Fetch all registrations for this member in one query
      const registrations = await db
        .select({ outreachId: outreachParticipants.outreachId })
        .from(outreachParticipants)
        .where(
          and(
            eq(outreachParticipants.memberId, auth.memberId),
            inArray(outreachParticipants.outreachId, programIds)
          )
        );

      const registeredProgramIds = new Set(registrations.map(r => r.outreachId));

      programsWithRegistration = rowsWithCreatorNames.map(program => ({
        ...program,
        isRegistered: registeredProgramIds.has(program.id),
      }));
    }
  } else {
    // For non-members (admin, pastor, leader), get participant counts and total member counts
    const programIds = rowsWithCreatorNames.map(r => r.id);
    
    if (programIds.length > 0) {
      // Get participant counts
      const participantCounts = await db
        .select({
          outreachId: outreachParticipants.outreachId,
          count: count(),
        })
        .from(outreachParticipants)
        .where(inArray(outreachParticipants.outreachId, programIds))
        .groupBy(outreachParticipants.outreachId);

      const countsMap = new Map(participantCounts.map(pc => [pc.outreachId, pc.count]));

      // Get total active members
      // For programs open to all branches: count ALL active members
      // For branch-specific programs: count only members from that branch
      const branchIds = [...new Set(rowsWithCreatorNames.map(r => r.branchId))];
      
      let totalMembersMap = new Map();
      let totalMembersAllBranches = 0;
      
      if (branchIds.length > 0) {
        // Get total members per branch
        const totalMembersByBranch = await db
          .select({
            branchId: members.homeBranchId,
            count: count(),
          })
          .from(members)
          .where(
            and(
              inArray(members.homeBranchId, branchIds),
              eq(members.isActive, true),
            )
          )
          .groupBy(members.homeBranchId);

        totalMembersMap = new Map(totalMembersByBranch.map(tm => [tm.branchId, tm.count]));
        
        // Get total members across ALL branches for open programs
        const hasOpenPrograms = rowsWithCreatorNames.some(r => r.isOpenToAllBranches);
        if (hasOpenPrograms) {
          const [totalAllBranches] = await db
            .select({ count: count() })
            .from(members)
            .where(and(eq(members.isActive, true)));
          
          totalMembersAllBranches = totalAllBranches?.count || 0;
        }
      }

      programsWithRegistration = rowsWithCreatorNames.map(program => ({
        ...program,
        participantCount: countsMap.get(program.id) || 0,
        // If open to all branches, show total across all branches; otherwise show branch total
        totalMembers: program.isOpenToAllBranches 
          ? totalMembersAllBranches 
          : (totalMembersMap.get(program.branchId) || 0),
      }));
    }
  }

  return {
    data: programsWithRegistration,
    meta: {
      page: query.page,
      limit: query.limit,
      total: total!.count,
      totalPages: Math.ceil(total!.count / query.limit),
    },
  };
}

/**
 * Get a single outreach program with details
 * Includes souls, participants, and statistics
 */
export async function getProgram(
  db: Database,
  programId: string,
  auth: AuthContext,
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  const [program] = await db
    .select({
      id: outreachPrograms.id,
      branchId: outreachPrograms.branchId,
      branchName: branches.branchName,
      programName: outreachPrograms.programName,
      programDate: outreachPrograms.programDate,
      location: outreachPrograms.location,
      address: outreachPrograms.address,
      city: outreachPrograms.city,
      description: outreachPrograms.description,
      coordinatorId: outreachPrograms.coordinatorId,
      coordinatorName: sql<string>`COALESCE(${outreachPrograms.coordinatorName}, CONCAT(${members.firstName}, ' ', ${members.lastName}))`,
      createdBy: outreachPrograms.createdBy,
      isOpenToAllBranches: outreachPrograms.isOpenToAllBranches,
      totalSoulsReached: outreachPrograms.totalSoulsReached,
      isCompleted: outreachPrograms.isCompleted,
      notes: outreachPrograms.notes,
      createdAt: outreachPrograms.createdAt,
      updatedAt: outreachPrograms.updatedAt,
    })
    .from(outreachPrograms)
    .leftJoin(branches, eq(outreachPrograms.branchId, branches.id))
    .leftJoin(members, eq(outreachPrograms.coordinatorId, members.id))
    .where(eq(outreachPrograms.id, programId));

  if (!program) {
    throw new NotFoundError('Program not found');
  }

  // Branch isolation - allow access if from own branch OR program is open to all branches
  if (authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read') || effectiveRole === 'member') {
    if (program.branchId !== auth.branchId && !program.isOpenToAllBranches) {
      throw new ForbiddenError('You can only access programs from your own branch');
    }
  }

  // Fetch souls for this program
  const programSouls = await db
    .select({
      id: souls.id,
      firstName: souls.firstName,
      lastName: souls.lastName,
      phone: souls.phone,
      email: souls.email,
      status: souls.status,
      assignedMemberId: souls.assignedMemberId,
      createdAt: souls.createdAt,
    })
    .from(souls)
    .where(eq(souls.outreachId, programId))
    .orderBy(souls.createdAt);

  // Fetch participants for this program
  // For leaders/pastors: only show participants from their own branch
  // For admin: show all participants
  const participantConditions = [eq(outreachParticipants.outreachId, programId)];
  
  if (authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read')) {
    // Only show participants from own branch
    participantConditions.push(eq(members.homeBranchId, auth.branchId));
  }
  
  const programParticipants = await db
    .select({
      memberId: outreachParticipants.memberId,
      memberName: sql<string>`CONCAT(${members.firstName}, ' ', ${members.lastName})`,
      branchId: members.homeBranchId,
      branchName: branches.branchName,
      role: outreachParticipants.role,
      notes: outreachParticipants.notes,
      createdAt: outreachParticipants.createdAt,
    })
    .from(outreachParticipants)
    .leftJoin(members, eq(outreachParticipants.memberId, members.id))
    .leftJoin(branches, eq(members.homeBranchId, branches.id))
    .where(and(...participantConditions))
    .orderBy(outreachParticipants.createdAt);

  // Calculate statistics
  const soulsByStatus: Record<string, number> = {};
  programSouls.forEach((soul) => {
    soulsByStatus[soul.status] = (soulsByStatus[soul.status] || 0) + 1;
  });

  const convertedCount = soulsByStatus['Converted'] || 0;
  const conversionRate = programSouls.length > 0 
    ? Math.round((convertedCount / programSouls.length) * 100) 
    : 0;

  return {
    ...program,
    souls: programSouls,
    participants: programParticipants,
    statistics: {
      totalWorkers: programParticipants.length,
      totalSouls: programSouls.length,
      soulsByStatus,
      conversionRate,
    },
  };
}

/**
 * Update an outreach program
 */
export async function updateProgram(
  db: Database,
  programId: string,
  input: Record<string, unknown>,
  auth: AuthContext,
) {
  const program = await getProgram(db, programId, auth);
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  // Authorization: Admin, Pastor, Leader, or Coordinator can update
  const canUpdate =
    effectiveRole === 'admin' ||
    authHasCapability(auth, 'branch:read') ||
    authHasAnyCapability(auth, 'fellowship:read', 'department:read') ||
    program.coordinatorId === auth.memberId;

  if (!canUpdate) {
    throw new ForbiddenError('Only Admin, Pastor, Leader, or Coordinator can update this program');
  }

  const [updated] = await db
    .update(outreachPrograms)
    .set({ ...input, updatedAt: sql`NOW()` })
    .where(eq(outreachPrograms.id, programId))
    .returning();

  return updated;
}

/**
 * Register a worker for an outreach program
 * - Members can self-register
 * - Pastors/Leaders/Admin can register others
 */
export async function registerWorker(
  db: Database,
  programId: string,
  input: { memberId: string; role?: string; notes?: string },
  auth: AuthContext,
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  // Verify program exists and user has access
  const program = await getProgram(db, programId, auth);

  // Verify member exists and is active
  const [member] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(and(eq(members.id, input.memberId), eq(members.isActive, true)));

  if (!member) {
    throw new ValidationError('Member not found or inactive');
  }

  // Members can only register themselves
  if (effectiveRole === 'member' && input.memberId !== auth.memberId) {
    throw new ForbiddenError('You can only register yourself for outreach programs');
  }

  // Ensure member is from the same branch as the program
  if (member.homeBranchId !== program.branchId) {
    throw new ValidationError('You can only register for programs in your branch');
  }

  try {
    const [participant] = await db
      .insert(outreachParticipants)
      .values({
        outreachId: programId,
        memberId: input.memberId,
        role: input.role ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    return participant;
  } catch (err) {
    // Handle duplicate registration
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new ConflictError('You are already registered for this program');
    }
    throw err;
  }
}
