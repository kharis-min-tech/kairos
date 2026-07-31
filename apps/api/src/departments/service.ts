import { eq, and, or, count, sql, exists, ne, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '@kairos/database';
import { authHasCapability } from '../lib/grants';
import {
  departments,
  branchDepartments,
  departmentMembers,
  departmentJoinRequests,
  members,
  branches,
  newBelieverEnrollments,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  sendJoinRequestReceivedEmail,
  sendJoinRequestRejectedEmail,
  sendInterviewScheduledEmail,
  sendOfferExtendedEmail,
  sendProbationStartedEmail,
  sendProbationPassedEmail,
  logger,
} from '@kairos/utils';
import { enforceScopeAllows } from '../lib/scope';
import { syncDepartmentLeadGrants, syncDepartmentDeputyGrants } from '../lib/role-sync';
import { authHasAnyCapability } from '../lib/grants';
import { dispatchNotification } from '../notifications/service';
import {
  resolveBranchAuthority,
  resolveDepartmentLeads,
} from '../notifications/recipients';
import { NotificationEventType } from '@kairos/types';

function departmentPortalUrl(branchDepartmentId: string): string {
  const base = process.env['FRONTEND_URL'] ?? 'http://localhost:3002';
  return `${base}/departments/${branchDepartmentId}`;
}

// ── Recruitment pipeline constants ─────────────────────────

const OPEN_STATUSES = [
  'applied',
  'interview_scheduled',
  'interviewed',
  'offered',
  'probation',
] as const;

// ── Helpers ────────────────────────────────────────────────

function enforceBranchScope(auth: AuthContext, branchId?: string | null) {
  if (authHasCapability(auth, 'branch:read')) return;
  if (branchId && branchId !== auth.branchId) {
    throw new ForbiddenError(
      'This department belongs to a different branch. You can only join departments in your own branch.',
    );
  }
}

function isLead(
  auth: AuthContext,
  bd: { leadMemberId: string | null; deputyMemberId: string | null },
) {
  return (
    authHasAnyCapability(auth, 'fellowship:read', 'department:read') &&
    (bd.leadMemberId === auth.memberId || bd.deputyMemberId === auth.memberId)
  );
}

/**
 * Gate writes that require department leadership. System admins and pastors
 * always pass. A `leader` whose memberId matches the department lead or
 * deputy passes, UNLESS the request carries a department scope tied to a
 * different department — Phase 4's per-request narrowing
 * (`enforceScopeAllows`) rejects so a scope-bound lead can't act on a
 * department outside their picked scope (even if they technically lead it).
 */
function enforceLeaderOrAbove(
  auth: AuthContext,
  bd: { id: string; leadMemberId: string | null; deputyMemberId: string | null },
) {
  if (authHasCapability(auth, 'branch:read')) return;
  if (isLead(auth, bd)) {
    enforceScopeAllows(auth, 'department', bd.id);
    return;
  }
  throw new ForbiddenError('Only department leads or above can perform this action');
}

const MAX_DEPARTMENTS_PER_MEMBER = 2;

async function countActiveDepartmentsForMember(db: Database, memberId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(departmentMembers)
    .where(
      and(eq(departmentMembers.memberId, memberId), eq(departmentMembers.isActive, true)),
    );
  return row!.value;
}

// ── Global Department Catalogue ────────────────────────────

export async function listGlobalDepartments(db: Database) {
  return db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(departments.departmentName);
}

export async function createGlobalDepartment(
  db: Database,
  auth: AuthContext,
  data: { departmentName: string; description?: string; iconKey?: string },
) {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can create global departments');
  }
  const [existing] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.departmentName, data.departmentName));
  if (existing) throw new ConflictError('Department with this name already exists');

  const [created] = await db.insert(departments).values(data).returning();
  return created!;
}

export async function updateGlobalDepartment(
  db: Database,
  auth: AuthContext,
  id: string,
  data: Record<string, unknown>,
) {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can update global departments');
  }
  const [updated] = await db
    .update(departments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();
  if (!updated) throw new NotFoundError('Department not found');
  return updated;
}

// ── Branch Department CRUD ─────────────────────────────────

export async function listBranchDepartments(
  db: Database,
  auth: AuthContext,
  query: {
    page: number;
    limit: number;
    branchId?: string;
    departmentId?: string;
    memberId?: string;
  },
) {
  const conditions = [eq(branchDepartments.isActive, true)];

  if (authHasCapability(auth, 'branch:read')) {
    if (query.branchId) {
      conditions.push(eq(branchDepartments.branchId, query.branchId));
    }
  } else if (authHasAnyCapability(auth, 'fellowship:read', 'department:read')) {
    // Leaders see only departments they lead or co-lead, scoped to their branch.
    // A department-only leader who doesn't lead anything (e.g. a fellowship leader)
    // gets an empty list.
    conditions.push(eq(branchDepartments.branchId, auth.branchId));
    conditions.push(
      or(
        eq(branchDepartments.leadMemberId, auth.memberId),
        eq(branchDepartments.deputyMemberId, auth.memberId),
      )!,
    );
  } else {
    conditions.push(eq(branchDepartments.branchId, auth.branchId));
  }

  if (query.departmentId) {
    conditions.push(eq(branchDepartments.departmentId, query.departmentId));
  }

  if (query.memberId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(departmentMembers)
          .where(
            and(
              eq(departmentMembers.branchDepartmentId, branchDepartments.id),
              eq(departmentMembers.memberId, query.memberId),
              eq(departmentMembers.isActive, true),
            ),
          ),
      ),
    );
  }

  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: branchDepartments.id,
        branchId: branchDepartments.branchId,
        branchName: branches.branchName,
        departmentId: branchDepartments.departmentId,
        departmentName: departments.departmentName,
        iconKey: departments.iconKey,
        leadMemberId: branchDepartments.leadMemberId,
        leadFirstName: members.firstName,
        leadLastName: members.lastName,
        leadPhotoUrl: members.photoUrl,
        deputyMemberId: branchDepartments.deputyMemberId,
        description: branchDepartments.description,
        startDate: branchDepartments.startDate,
        endDate: branchDepartments.endDate,
        isActive: branchDepartments.isActive,
        probationDays: branchDepartments.probationDays,
        createdAt: branchDepartments.createdAt,
        updatedAt: branchDepartments.updatedAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM department_members dm
          WHERE dm.branch_department_id = ${branchDepartments.id} AND dm.is_active = true
        )`,
        pendingJoinRequestCount: sql<number>`(
          SELECT COUNT(*)::int FROM department_join_requests djr
          WHERE djr.branch_department_id = ${branchDepartments.id}
            AND djr.status IN ('applied','interview_scheduled','interviewed','offered','probation')
        )`,
      })
      .from(branchDepartments)
      .innerJoin(branches, eq(branchDepartments.branchId, branches.id))
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .leftJoin(members, eq(branchDepartments.leadMemberId, members.id))
      .where(where)
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(branchDepartments).where(where),
  ]);

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: total!.value,
      totalPages: Math.ceil(total!.value / query.limit),
    },
  };
}

export async function getBranchDepartment(db: Database, auth: AuthContext, id: string) {
  const [row] = await db
    .select({
      id: branchDepartments.id,
      branchId: branchDepartments.branchId,
      branchName: branches.branchName,
      departmentId: branchDepartments.departmentId,
      departmentName: departments.departmentName,
      iconKey: departments.iconKey,
      leadMemberId: branchDepartments.leadMemberId,
      leadFirstName: members.firstName,
      leadLastName: members.lastName,
      leadPhotoUrl: members.photoUrl,
      deputyMemberId: branchDepartments.deputyMemberId,
      description: branchDepartments.description,
      startDate: branchDepartments.startDate,
      endDate: branchDepartments.endDate,
      isActive: branchDepartments.isActive,
      probationDays: branchDepartments.probationDays,
      createdAt: branchDepartments.createdAt,
      updatedAt: branchDepartments.updatedAt,
    })
    .from(branchDepartments)
    .innerJoin(branches, eq(branchDepartments.branchId, branches.id))
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .leftJoin(members, eq(branchDepartments.leadMemberId, members.id))
    .where(and(eq(branchDepartments.id, id), eq(branchDepartments.isActive, true)));

  if (!row) throw new NotFoundError('Department not found');
  enforceBranchScope(auth, row.branchId);
  return row;
}

export async function createBranchDepartment(
  db: Database,
  auth: AuthContext,
  data: {
    branchId: string;
    departmentId: string;
    leadMemberId: string;
    deputyMemberId?: string;
    description?: string;
    startDate?: string;
  },
) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins and pastors can create department instances');
  }

  // Validate branch
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, data.branchId), eq(branches.isActive, true)));
  if (!branch) throw new ValidationError('Branch not found');

  // Validate global department
  const [dept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(and(eq(departments.id, data.departmentId), eq(departments.isActive, true)));
  if (!dept) throw new ValidationError('Department not found');

  // Validate lead member belongs to this branch
  const [lead] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId, secondaryBranchId: members.secondaryBranchId, isAtSecondaryBranch: members.isAtSecondaryBranch })
    .from(members)
    .where(and(eq(members.id, data.leadMemberId), eq(members.isActive, true)));
  if (!lead) throw new ValidationError('Lead member not found');

  const leadActiveBranch =
    lead.isAtSecondaryBranch && lead.secondaryBranchId !== null
      ? lead.secondaryBranchId
      : lead.homeBranchId;
  if (leadActiveBranch !== data.branchId) {
    throw new ValidationError('Lead member must belong to the same branch');
  }

  // Validate deputy if provided
  if (data.deputyMemberId) {
    if (data.deputyMemberId === data.leadMemberId) {
      throw new ValidationError('Deputy must be different from lead');
    }
    const [deputy] = await db
      .select({ id: members.id, homeBranchId: members.homeBranchId, secondaryBranchId: members.secondaryBranchId, isAtSecondaryBranch: members.isAtSecondaryBranch })
      .from(members)
      .where(and(eq(members.id, data.deputyMemberId), eq(members.isActive, true)));
    if (!deputy) throw new ValidationError('Deputy member not found');
    const deputyActiveBranch =
      deputy.isAtSecondaryBranch && deputy.secondaryBranchId !== null
        ? deputy.secondaryBranchId
        : deputy.homeBranchId;
    if (deputyActiveBranch !== data.branchId) {
      throw new ValidationError('Deputy member must belong to the same branch');
    }
  }

  // One active instance per (branch, department)
  const [existing] = await db
    .select({ id: branchDepartments.id })
    .from(branchDepartments)
    .where(
      and(
        eq(branchDepartments.branchId, data.branchId),
        eq(branchDepartments.departmentId, data.departmentId),
        eq(branchDepartments.isActive, true),
      ),
    );
  if (existing) {
    throw new ConflictError('This department already has an active instance in this branch');
  }

  const [created] = await db
    .insert(branchDepartments)
    .values({
      branchId: data.branchId,
      departmentId: data.departmentId,
      leadMemberId: data.leadMemberId,
      deputyMemberId: data.deputyMemberId,
      description: data.description,
      startDate: data.startDate,
    })
    .returning();

  // Auto-add lead (and deputy) as department members
  await db.insert(departmentMembers).values({
    branchDepartmentId: created!.id,
    memberId: data.leadMemberId,
  });
  if (data.deputyMemberId) {
    await db.insert(departmentMembers).values({
      branchDepartmentId: created!.id,
      memberId: data.deputyMemberId,
    });
  }

  // RBAC Phase 3d: mirror lead + deputy FKs into member_roles.
  await syncDepartmentLeadGrants(db, {
    branchDepartmentId: created!.id,
    branchId: created!.branchId,
    leadMemberId: created!.leadMemberId,
  });
  await syncDepartmentDeputyGrants(db, {
    branchDepartmentId: created!.id,
    branchId: created!.branchId,
    deputyMemberId: created!.deputyMemberId,
  });

  return created!;
}

export async function updateBranchDepartment(
  db: Database,
  auth: AuthContext,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await getBranchDepartment(db, auth, id);
  enforceLeaderOrAbove(auth, existing);

  // RBAC Phase 4c: only branch-tier admins can change leadership.
  if (
    (data.leadMemberId !== undefined || data.deputyMemberId !== undefined) &&
    !authHasCapability(auth, 'branch:write')
  ) {
    throw new ForbiddenError('Only branch admins can change department leadership');
  }

  const [updated] = await db
    .update(branchDepartments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(branchDepartments.id, existing.id))
    .returning();

  // RBAC Phase 3d: if leadership changed, sync member_roles.
  if ('leadMemberId' in data) {
    await syncDepartmentLeadGrants(db, {
      branchDepartmentId: updated!.id,
      branchId: updated!.branchId,
      leadMemberId: updated!.leadMemberId,
    });
  }
  if ('deputyMemberId' in data) {
    await syncDepartmentDeputyGrants(db, {
      branchDepartmentId: updated!.id,
      branchId: updated!.branchId,
      deputyMemberId: updated!.deputyMemberId,
    });
  }

  return updated!;
}

export async function deactivateBranchDepartment(db: Database, auth: AuthContext, id: string) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins and pastors can deactivate departments');
  }
  const existing = await getBranchDepartment(db, auth, id);

  await db
    .update(departmentMembers)
    .set({ isActive: false, leaveDate: sql`CURRENT_DATE` })
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, existing.id),
        eq(departmentMembers.isActive, true),
      ),
    );

  const [deactivated] = await db
    .update(branchDepartments)
    .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: new Date() })
    .where(eq(branchDepartments.id, existing.id))
    .returning();

  // RBAC Phase 3d: deactivate all DepartmentLead/Deputy grants on this dept.
  await syncDepartmentLeadGrants(db, {
    branchDepartmentId: deactivated!.id,
    branchId: deactivated!.branchId,
    leadMemberId: null,
  });
  await syncDepartmentDeputyGrants(db, {
    branchDepartmentId: deactivated!.id,
    branchId: deactivated!.branchId,
    deputyMemberId: null,
  });

  return deactivated!;
}

// ── Department Members ─────────────────────────────────────

export async function listDepartmentMembers(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);

  const isPrivileged =
    authHasCapability(auth, 'branch:read') || isLead(auth, bd);

  if (!isPrivileged) {
    const [active] = await db
      .select({ id: departmentMembers.id })
      .from(departmentMembers)
      .where(
        and(
          eq(departmentMembers.branchDepartmentId, branchDepartmentId),
          eq(departmentMembers.memberId, auth.memberId),
          eq(departmentMembers.isActive, true),
        ),
      );
    if (!active) return [];
  }

  const rows = await db
    .select({
      id: departmentMembers.id,
      branchDepartmentId: departmentMembers.branchDepartmentId,
      memberId: departmentMembers.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberPhotoUrl: members.photoUrl,
      memberEmail: members.email,
      memberPhone: members.phone,
      joinDate: departmentMembers.joinDate,
      leaveDate: departmentMembers.leaveDate,
      isActive: departmentMembers.isActive,
      notes: departmentMembers.notes,
      createdAt: departmentMembers.createdAt,
      updatedAt: departmentMembers.updatedAt,
      // NB enrollment stage for this member in this branch (null if not enrolled).
      // Surfaced as a "NB Stage" chip on the roster for privileged callers.
      nbStage: newBelieverEnrollments.stage,
    })
    .from(departmentMembers)
    .innerJoin(members, eq(departmentMembers.memberId, members.id))
    .leftJoin(
      newBelieverEnrollments,
      and(
        eq(newBelieverEnrollments.memberId, members.id),
        eq(newBelieverEnrollments.branchId, bd.branchId),
        eq(newBelieverEnrollments.isActive, true),
      ),
    )
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, bd.id),
        eq(departmentMembers.isActive, true),
      ),
    )
    .orderBy(members.lastName, members.firstName);

  // Peer members only see name + photo + no NB stage. Privileged callers (admin/pastor/lead/deputy)
  // keep email + phone + NB stage for rota / discipleship-tracking purposes.
  if (isPrivileged) return rows;
  return rows.map((r) => ({ ...r, memberEmail: null, memberPhone: null, nbStage: null }));
}

export async function addDepartmentMember(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  data: { memberId: string; notes?: string },
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);

  const [member] = await db
    .select({
      id: members.id,
      homeBranchId: members.homeBranchId,
      secondaryBranchId: members.secondaryBranchId,
      isAtSecondaryBranch: members.isAtSecondaryBranch,
    })
    .from(members)
    .where(and(eq(members.id, data.memberId), eq(members.isActive, true)));
  if (!member) throw new NotFoundError('Member not found');

  const memberActiveBranch =
    member.isAtSecondaryBranch && member.secondaryBranchId !== null
      ? member.secondaryBranchId
      : member.homeBranchId;
  if (memberActiveBranch !== bd.branchId) {
    throw new ValidationError('Member must be in the same branch as the department');
  }

  // Duplicate active membership
  const [active] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDepartmentId),
        eq(departmentMembers.memberId, data.memberId),
        eq(departmentMembers.isActive, true),
      ),
    );
  if (active) throw new ConflictError('Member is already in this department');

  // Max-departments cap
  const activeCount = await countActiveDepartmentsForMember(db, data.memberId);
  if (activeCount >= MAX_DEPARTMENTS_PER_MEMBER) {
    throw new ConflictError(
      `Member is already in ${MAX_DEPARTMENTS_PER_MEMBER} departments — remove from another first`,
    );
  }

  // Reactivate prior membership if exists
  const [prior] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDepartmentId),
        eq(departmentMembers.memberId, data.memberId),
      ),
    );

  if (prior) {
    const [reactivated] = await db
      .update(departmentMembers)
      .set({
        isActive: true,
        leaveDate: null,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(departmentMembers.id, prior.id))
      .returning();
    return reactivated!;
  }

  const [record] = await db
    .insert(departmentMembers)
    .values({
      branchDepartmentId,
      memberId: data.memberId,
      notes: data.notes,
    })
    .returning();
  return record!;
}

export async function removeDepartmentMember(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  memberId: string,
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);

  if (memberId === bd.leadMemberId) {
    throw new ValidationError('Cannot remove the department lead — reassign leadership first');
  }

  const [record] = await db
    .update(departmentMembers)
    .set({ isActive: false, leaveDate: sql`CURRENT_DATE`, updatedAt: new Date() })
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDepartmentId),
        eq(departmentMembers.memberId, memberId),
        eq(departmentMembers.isActive, true),
      ),
    )
    .returning();

  if (!record) throw new NotFoundError('Department member not found');
  return record;
}

// ── Join Requests ──────────────────────────────────────────

export async function createJoinRequest(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  data: { notes?: string },
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);

  // Applicant's branch must match the department's branch (defense-in-depth:
  // enforced even for admin/pastor roles, since enforceBranchScope skips them).
  const [applicant] = await db
    .select({
      homeBranchId: members.homeBranchId,
      secondaryBranchId: members.secondaryBranchId,
      isAtSecondaryBranch: members.isAtSecondaryBranch,
    })
    .from(members)
    .where(eq(members.id, auth.memberId));
  if (!applicant) throw new NotFoundError('Member not found');
  const applicantBranchId =
    applicant.isAtSecondaryBranch && applicant.secondaryBranchId !== null
      ? applicant.secondaryBranchId
      : applicant.homeBranchId;
  if (applicantBranchId !== bd.branchId) {
    throw new ForbiddenError(
      'You can only join departments in your own branch.',
    );
  }

  // Already a member
  const [active] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDepartmentId),
        eq(departmentMembers.memberId, auth.memberId),
        eq(departmentMembers.isActive, true),
      ),
    );
  if (active) throw new ConflictError('You are already a member of this department');

  // Pending request
  const [pending] = await db
    .select({ id: departmentJoinRequests.id })
    .from(departmentJoinRequests)
    .where(
      and(
        eq(departmentJoinRequests.branchDepartmentId, branchDepartmentId),
        eq(departmentJoinRequests.memberId, auth.memberId),
        inArray(departmentJoinRequests.status, OPEN_STATUSES as unknown as string[]),
      ),
    );
  if (pending) throw new ConflictError('You already have an open application for this department');

  // Max-departments cap
  const activeCount = await countActiveDepartmentsForMember(db, auth.memberId);
  if (activeCount >= MAX_DEPARTMENTS_PER_MEMBER) {
    throw new ConflictError(
      `You are already in ${MAX_DEPARTMENTS_PER_MEMBER} departments — leave one before requesting to join another`,
    );
  }

  const [request] = await db
    .insert(departmentJoinRequests)
    .values({
      branchDepartmentId,
      memberId: auth.memberId,
      notes: data.notes,
    })
    .returning();

  // Fire-and-forget confirmation email
  const [requester] = await db
    .select({ email: members.email, firstName: members.firstName, lastName: members.lastName })
    .from(members)
    .where(eq(members.id, auth.memberId));
  if (requester?.email) {
    try {
      await sendJoinRequestReceivedEmail(
        requester.email,
        requester.firstName,
        bd.departmentName,
      );
    } catch (err) {
      logger.warn('sendJoinRequestReceivedEmail failed', {
        memberId: auth.memberId,
        departmentName: bd.departmentName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const [branchAuth, deptLeads] = await Promise.all([
    resolveBranchAuthority(db, bd.branchId),
    resolveDepartmentLeads(db, branchDepartmentId),
  ]);
  const requesterName = requester
    ? `${requester.firstName} ${requester.lastName ?? ''}`.trim()
    : 'A member';
  await dispatchNotification(db, {
    eventType: NotificationEventType.WorkflowDepartmentJoinRequestReceived,
    recipientMemberIds: [...branchAuth, ...deptLeads],
    branchId: bd.branchId,
    subjectType: 'department_join_request',
    subjectId: request!.id,
    payload: {
      requesterName,
      targetName: bd.departmentName,
      targetKind: 'department',
      portalUrl: departmentPortalUrl(branchDepartmentId),
    },
  });

  return request!;
}

export async function listJoinRequests(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  query: { stage?: 'open' | 'all' | 'terminal' } = {},
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);

  const interviewerOne = alias(members, 'interviewer_one');
  const interviewerTwo = alias(members, 'interviewer_two');

  const stage = query.stage ?? 'all';
  const stageFilter =
    stage === 'open'
      ? inArray(departmentJoinRequests.status, OPEN_STATUSES as unknown as string[])
      : stage === 'terminal'
      ? inArray(departmentJoinRequests.status, ['rejected', 'withdrawn', 'active', 'probation_failed'])
      : undefined;

  const where = stageFilter
    ? and(eq(departmentJoinRequests.branchDepartmentId, bd.id), stageFilter)
    : eq(departmentJoinRequests.branchDepartmentId, bd.id);

  return db
    .select({
      id: departmentJoinRequests.id,
      branchDepartmentId: departmentJoinRequests.branchDepartmentId,
      memberId: departmentJoinRequests.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberPhotoUrl: members.photoUrl,
      memberEmail: members.email,
      memberPhone: members.phone,
      status: departmentJoinRequests.status,
      notes: departmentJoinRequests.notes,
      reviewedBy: departmentJoinRequests.reviewedBy,
      reviewedAt: departmentJoinRequests.reviewedAt,
      reviewNotes: departmentJoinRequests.reviewNotes,
      interviewScheduledAt: departmentJoinRequests.interviewScheduledAt,
      interviewFormat: departmentJoinRequests.interviewFormat,
      interviewLocation: departmentJoinRequests.interviewLocation,
      interviewerOneId: departmentJoinRequests.interviewerOneId,
      interviewerOneFirstName: interviewerOne.firstName,
      interviewerOneLastName: interviewerOne.lastName,
      interviewerTwoId: departmentJoinRequests.interviewerTwoId,
      interviewerTwoFirstName: interviewerTwo.firstName,
      interviewerTwoLastName: interviewerTwo.lastName,
      interviewOutcome: departmentJoinRequests.interviewOutcome,
      interviewNotes: departmentJoinRequests.interviewNotes,
      offeredAt: departmentJoinRequests.offeredAt,
      offerExpiresAt: departmentJoinRequests.offerExpiresAt,
      offerMessage: departmentJoinRequests.offerMessage,
      offerRespondedAt: departmentJoinRequests.offerRespondedAt,
      offerResponse: departmentJoinRequests.offerResponse,
      probationDays: departmentJoinRequests.probationDays,
      probationStartDate: departmentJoinRequests.probationStartDate,
      probationEndDate: departmentJoinRequests.probationEndDate,
      probationOutcome: departmentJoinRequests.probationOutcome,
      probationNotes: departmentJoinRequests.probationNotes,
      createdAt: departmentJoinRequests.createdAt,
      updatedAt: departmentJoinRequests.updatedAt,
    })
    .from(departmentJoinRequests)
    .innerJoin(members, eq(departmentJoinRequests.memberId, members.id))
    .leftJoin(interviewerOne, eq(departmentJoinRequests.interviewerOneId, interviewerOne.id))
    .leftJoin(interviewerTwo, eq(departmentJoinRequests.interviewerTwoId, interviewerTwo.id))
    .where(where)
    .orderBy(departmentJoinRequests.createdAt);
}

// ── Recruitment state machine ──────────────────────────────

async function loadJoinRequest(
  db: Database,
  branchDepartmentId: string,
  requestId: string,
  expectedStatuses: readonly string[],
) {
  const [request] = await db
    .select()
    .from(departmentJoinRequests)
    .where(
      and(
        eq(departmentJoinRequests.id, requestId),
        eq(departmentJoinRequests.branchDepartmentId, branchDepartmentId),
      ),
    );
  if (!request) throw new NotFoundError('Join request not found');
  if (!expectedStatuses.includes(request.status)) {
    throw new ConflictError(
      `Cannot perform this action on a request in '${request.status}' stage`,
    );
  }
  return request;
}

async function validateInterviewer(
  db: Database,
  interviewerId: string,
  branchId: string,
  field: 'interviewerOneId' | 'interviewerTwoId',
) {
  const [m] = await db
    .select({
      id: members.id,
      homeBranchId: members.homeBranchId,
      secondaryBranchId: members.secondaryBranchId,
      isAtSecondaryBranch: members.isAtSecondaryBranch,
    })
    .from(members)
    .where(and(eq(members.id, interviewerId), eq(members.isActive, true)));
  if (!m) throw new ValidationError(`${field}: interviewer not found`);
  const activeBranch =
    m.isAtSecondaryBranch && m.secondaryBranchId !== null
      ? m.secondaryBranchId
      : m.homeBranchId;
  if (activeBranch !== branchId) {
    throw new ValidationError(`${field}: interviewer must belong to the same branch`);
  }
}

async function fireRequesterEmail(
  db: Database,
  memberId: string,
  fn: (email: string, name: string, departmentName: string) => Promise<void>,
  departmentName: string,
) {
  const [m] = await db
    .select({ email: members.email, firstName: members.firstName })
    .from(members)
    .where(eq(members.id, memberId));
  if (!m?.email) return;
  // Must await: CF Workers cancel un-awaited promises the instant the
  // response returns, so a floating `.catch(...)` silently drops every
  // email. Failure is still non-fatal for the state change.
  try {
    await fn(m.email, m.firstName, departmentName);
  } catch (err) {
    logger.warn('Department email send failed', {
      memberId,
      departmentName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function scheduleJoinRequestInterview(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  requestId: string,
  data: {
    interviewScheduledAt: string;
    interviewFormat: 'in_person' | 'virtual';
    interviewLocation?: string;
    interviewerOneId: string;
    interviewerTwoId?: string;
  },
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);
  await loadJoinRequest(db, branchDepartmentId, requestId, ['applied']);

  if (data.interviewerTwoId && data.interviewerTwoId === data.interviewerOneId) {
    throw new ValidationError('Interviewers must be distinct');
  }
  await validateInterviewer(db, data.interviewerOneId, bd.branchId, 'interviewerOneId');
  if (data.interviewerTwoId) {
    await validateInterviewer(db, data.interviewerTwoId, bd.branchId, 'interviewerTwoId');
  }

  const [updated] = await db
    .update(departmentJoinRequests)
    .set({
      status: 'interview_scheduled',
      interviewScheduledAt: new Date(data.interviewScheduledAt),
      interviewFormat: data.interviewFormat,
      interviewLocation: data.interviewLocation ?? null,
      interviewerOneId: data.interviewerOneId,
      interviewerTwoId: data.interviewerTwoId ?? null,
      interviewOutcome: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(departmentJoinRequests.id, requestId))
    .returning();

  await fireRequesterEmail(
    db,
    updated!.memberId,
    (email, name, deptName) =>
      sendInterviewScheduledEmail(email, name, deptName, {
        scheduledAt: new Date(data.interviewScheduledAt),
        format: data.interviewFormat,
        location: data.interviewLocation,
      }),
    bd.departmentName,
  );

  return updated!;
}

export async function recordJoinRequestInterview(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  requestId: string,
  data: { interviewOutcome: 'pass' | 'fail'; interviewNotes?: string },
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);
  await loadJoinRequest(db, branchDepartmentId, requestId, ['interview_scheduled']);

  const [updated] = await db
    .update(departmentJoinRequests)
    .set({
      status: 'interviewed',
      interviewOutcome: data.interviewOutcome,
      interviewNotes: data.interviewNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(departmentJoinRequests.id, requestId))
    .returning();

  return updated!;
}

export async function extendJoinRequestOffer(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  requestId: string,
  data: { offerExpiresAt?: string; offerMessage?: string; probationDays?: number },
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);
  const request = await loadJoinRequest(db, branchDepartmentId, requestId, ['interviewed']);
  if (request.interviewOutcome !== 'pass') {
    throw new ConflictError('Cannot extend an offer when the interview did not pass');
  }

  const probationDays = data.probationDays ?? bd.probationDays ?? 28;
  if (probationDays < 1 || probationDays > 365) {
    throw new ValidationError('probationDays must be between 1 and 365');
  }

  const [updated] = await db
    .update(departmentJoinRequests)
    .set({
      status: 'offered',
      offeredAt: new Date(),
      offerExpiresAt: data.offerExpiresAt ? new Date(data.offerExpiresAt) : null,
      offerMessage: data.offerMessage ?? null,
      probationDays,
      updatedAt: new Date(),
    })
    .where(eq(departmentJoinRequests.id, requestId))
    .returning();

  await fireRequesterEmail(
    db,
    updated!.memberId,
    (email, name, deptName) =>
      sendOfferExtendedEmail(email, name, deptName, {
        expiresAt: data.offerExpiresAt ? new Date(data.offerExpiresAt) : null,
        probationDays,
        message: data.offerMessage,
      }),
    bd.departmentName,
  );

  return updated!;
}

export async function respondToJoinRequestOffer(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  requestId: string,
  data: { offerResponse: 'accepted' | 'declined' },
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  const request = await loadJoinRequest(db, branchDepartmentId, requestId, ['offered']);

  if (request.memberId !== auth.memberId) {
    throw new ForbiddenError('Only the applicant can respond to this offer');
  }

  if (request.offerExpiresAt && request.offerExpiresAt < new Date()) {
    throw new ConflictError('This offer has expired');
  }

  if (data.offerResponse === 'declined') {
    const [updated] = await db
      .update(departmentJoinRequests)
      .set({
        status: 'rejected',
        offerResponse: 'declined',
        offerRespondedAt: new Date(),
        reviewNotes: 'Offer declined by applicant',
        updatedAt: new Date(),
      })
      .where(eq(departmentJoinRequests.id, requestId))
      .returning();
    return updated!;
  }

  // Accepted → enter probation
  const activeCount = await countActiveDepartmentsForMember(db, auth.memberId);
  if (activeCount >= MAX_DEPARTMENTS_PER_MEMBER) {
    throw new ConflictError(
      `You are already in ${MAX_DEPARTMENTS_PER_MEMBER} departments — leave one before accepting`,
    );
  }

  const probationDays = request.probationDays ?? bd.probationDays ?? 28;
  const startDate = sql<string>`CURRENT_DATE`;
  const endDate = sql<string>`(CURRENT_DATE + INTERVAL '${sql.raw(String(probationDays))} days')::date`;

  const [updated] = await db
    .update(departmentJoinRequests)
    .set({
      status: 'probation',
      offerResponse: 'accepted',
      offerRespondedAt: new Date(),
      probationStartDate: startDate as unknown as string,
      probationEndDate: endDate as unknown as string,
      probationOutcome: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(departmentJoinRequests.id, requestId))
    .returning();

  // Reactivate or insert department member with probation status
  const [existing] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDepartmentId),
        eq(departmentMembers.memberId, auth.memberId),
      ),
    );
  if (existing) {
    await db
      .update(departmentMembers)
      .set({
        isActive: true,
        leaveDate: null,
        membershipStatus: 'probation',
        probationEndDate: endDate as unknown as string,
        updatedAt: new Date(),
      })
      .where(eq(departmentMembers.id, existing.id));
  } else {
    await db.insert(departmentMembers).values({
      branchDepartmentId,
      memberId: auth.memberId,
      membershipStatus: 'probation',
      probationEndDate: endDate as unknown as string,
    });
  }

  await fireRequesterEmail(
    db,
    auth.memberId,
    (email, name, deptName) =>
      sendProbationStartedEmail(email, name, deptName, { probationDays }),
    bd.departmentName,
  );

  return updated!;
}

export async function withdrawJoinRequest(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  requestId: string,
) {
  await getBranchDepartment(db, auth, branchDepartmentId);
  const request = await loadJoinRequest(db, branchDepartmentId, requestId, [
    'applied',
    'interview_scheduled',
    'interviewed',
    'offered',
  ]);
  if (request.memberId !== auth.memberId) {
    throw new ForbiddenError('Only the applicant can withdraw this request');
  }

  const [updated] = await db
    .update(departmentJoinRequests)
    .set({ status: 'withdrawn', updatedAt: new Date() })
    .where(eq(departmentJoinRequests.id, requestId))
    .returning();

  return updated!;
}

export async function rejectJoinRequest(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  requestId: string,
  data: { reviewNotes?: string } = {},
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);
  const request = await loadJoinRequest(db, branchDepartmentId, requestId, [
    'applied',
    'interview_scheduled',
    'interviewed',
    'offered',
  ]);

  const [updated] = await db
    .update(departmentJoinRequests)
    .set({
      status: 'rejected',
      reviewedBy: auth.memberId,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(departmentJoinRequests.id, requestId))
    .returning();

  await fireRequesterEmail(
    db,
    request.memberId,
    sendJoinRequestRejectedEmail,
    bd.departmentName,
  );

  return updated!;
}

export async function evaluateJoinRequestProbation(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  requestId: string,
  data: { probationOutcome: 'passed' | 'failed'; probationNotes?: string },
) {
  const bd = await getBranchDepartment(db, auth, branchDepartmentId);
  enforceLeaderOrAbove(auth, bd);
  const request = await loadJoinRequest(db, branchDepartmentId, requestId, ['probation']);

  const newStatus = data.probationOutcome === 'passed' ? 'active' : 'probation_failed';

  const [updated] = await db
    .update(departmentJoinRequests)
    .set({
      status: newStatus,
      probationOutcome: data.probationOutcome,
      probationNotes: data.probationNotes ?? null,
      reviewedBy: auth.memberId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(departmentJoinRequests.id, requestId))
    .returning();

  if (data.probationOutcome === 'passed') {
    await db
      .update(departmentMembers)
      .set({
        membershipStatus: 'active',
        probationEndDate: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(departmentMembers.branchDepartmentId, branchDepartmentId),
          eq(departmentMembers.memberId, request.memberId),
          eq(departmentMembers.isActive, true),
        ),
      );

    await fireRequesterEmail(
      db,
      request.memberId,
      (email, name, deptName) =>
        sendProbationPassedEmail(email, name, deptName),
      bd.departmentName,
    );
  } else {
    await db
      .update(departmentMembers)
      .set({
        isActive: false,
        leaveDate: sql`CURRENT_DATE`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(departmentMembers.branchDepartmentId, branchDepartmentId),
          eq(departmentMembers.memberId, request.memberId),
          eq(departmentMembers.isActive, true),
        ),
      );

    await fireRequesterEmail(
      db,
      request.memberId,
      sendJoinRequestRejectedEmail,
      bd.departmentName,
    );
  }

  return updated!;
}

// ── Member-facing: my departments ──────────────────────────

export async function listMyDepartments(db: Database, auth: AuthContext) {
  return db
    .select({
      id: branchDepartments.id,
      branchId: branchDepartments.branchId,
      departmentId: branchDepartments.departmentId,
      departmentName: departments.departmentName,
      iconKey: departments.iconKey,
      branchName: branches.branchName,
      joinDate: departmentMembers.joinDate,
    })
    .from(departmentMembers)
    .innerJoin(branchDepartments, eq(departmentMembers.branchDepartmentId, branchDepartments.id))
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .innerJoin(branches, eq(branchDepartments.branchId, branches.id))
    .where(
      and(
        eq(departmentMembers.memberId, auth.memberId),
        eq(departmentMembers.isActive, true),
        eq(branchDepartments.isActive, true),
      ),
    )
    .orderBy(departments.departmentName);
}

// silence unused import
void ne;

// ── Member-facing: my open join requests ───────────────────

export async function listMyJoinRequests(db: Database, auth: AuthContext) {
  return db
    .select({
      id: departmentJoinRequests.id,
      branchDepartmentId: departmentJoinRequests.branchDepartmentId,
      memberId: departmentJoinRequests.memberId,
      status: departmentJoinRequests.status,
      notes: departmentJoinRequests.notes,
      reviewedBy: departmentJoinRequests.reviewedBy,
      reviewedAt: departmentJoinRequests.reviewedAt,
      reviewNotes: departmentJoinRequests.reviewNotes,
      interviewScheduledAt: departmentJoinRequests.interviewScheduledAt,
      interviewFormat: departmentJoinRequests.interviewFormat,
      interviewLocation: departmentJoinRequests.interviewLocation,
      interviewerOneId: departmentJoinRequests.interviewerOneId,
      interviewerTwoId: departmentJoinRequests.interviewerTwoId,
      interviewOutcome: departmentJoinRequests.interviewOutcome,
      interviewNotes: departmentJoinRequests.interviewNotes,
      offeredAt: departmentJoinRequests.offeredAt,
      offerExpiresAt: departmentJoinRequests.offerExpiresAt,
      offerMessage: departmentJoinRequests.offerMessage,
      offerRespondedAt: departmentJoinRequests.offerRespondedAt,
      offerResponse: departmentJoinRequests.offerResponse,
      probationDays: departmentJoinRequests.probationDays,
      probationStartDate: departmentJoinRequests.probationStartDate,
      probationEndDate: departmentJoinRequests.probationEndDate,
      probationOutcome: departmentJoinRequests.probationOutcome,
      probationNotes: departmentJoinRequests.probationNotes,
      createdAt: departmentJoinRequests.createdAt,
      updatedAt: departmentJoinRequests.updatedAt,
      branchId: branchDepartments.branchId,
      branchName: branches.branchName,
      departmentId: branchDepartments.departmentId,
      departmentName: departments.departmentName,
      iconKey: departments.iconKey,
    })
    .from(departmentJoinRequests)
    .innerJoin(
      branchDepartments,
      eq(departmentJoinRequests.branchDepartmentId, branchDepartments.id),
    )
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .innerJoin(branches, eq(branchDepartments.branchId, branches.id))
    .where(
      and(
        eq(departmentJoinRequests.memberId, auth.memberId),
        inArray(
          departmentJoinRequests.status,
          OPEN_STATUSES as unknown as string[],
        ),
      ),
    )
    .orderBy(departmentJoinRequests.createdAt);
}
