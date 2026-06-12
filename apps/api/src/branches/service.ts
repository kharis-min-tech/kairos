import { eq, and, count, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  branches,
  regions,
  branchLeadership,
  members,
  memberRoles,
  roles,
} from '@kairos/database';
import type { AuthContext, BranchRoleAssignment } from '@kairos/types';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '@kairos/utils';

const BRANCH_SYSTEM_ADMIN_ROLE = 'Branch System Admin';

// ── Region CRUD ────────────────────────────────────────────

export async function listRegions(db: Database) {
  return db.select().from(regions).orderBy(regions.regionName);
}

export async function createRegion(db: Database, input: { regionName: string; country: string }) {
  const [existing] = await db.select().from(regions).where(eq(regions.regionName, input.regionName));
  if (existing) throw new ConflictError('Region name already exists');

  const [region] = await db.insert(regions).values(input).returning();
  return region;
}

// ── Branch CRUD ────────────────────────────────────────────

export async function listBranches(db: Database, auth: AuthContext) {
  const rows = await db
    .select({
      id: branches.id,
      branchName: branches.branchName,
      regionId: branches.regionId,
      regionName: regions.regionName,
      branchType: branches.branchType,
      address: branches.address,
      city: branches.city,
      postalCode: branches.postalCode,
      phone: branches.phone,
      email: branches.email,
      establishedDate: branches.establishedDate,
      serviceSchedule: branches.serviceSchedule,
      isActive: branches.isActive,
      createdAt: branches.createdAt,
      updatedAt: branches.updatedAt,
    })
    .from(branches)
    .innerJoin(regions, eq(branches.regionId, regions.id))
    .where(
      auth.systemRole === 'admin'
        ? eq(branches.isActive, true)
        : and(eq(branches.isActive, true), eq(branches.id, auth.branchId)),
    )
    .orderBy(branches.branchName);

  return rows;
}

export async function getBranch(db: Database, branchId: string, auth: AuthContext) {
  enforceBranchAccess(auth, branchId);

  const [row] = await db
    .select({
      id: branches.id,
      branchName: branches.branchName,
      regionId: branches.regionId,
      regionName: regions.regionName,
      branchType: branches.branchType,
      address: branches.address,
      city: branches.city,
      postalCode: branches.postalCode,
      phone: branches.phone,
      email: branches.email,
      establishedDate: branches.establishedDate,
      serviceSchedule: branches.serviceSchedule,
      isActive: branches.isActive,
      createdAt: branches.createdAt,
      updatedAt: branches.updatedAt,
    })
    .from(branches)
    .innerJoin(regions, eq(branches.regionId, regions.id))
    .where(and(eq(branches.id, branchId), eq(branches.isActive, true)));

  if (!row) throw new NotFoundError('Branch not found');
  return row;
}

export async function createBranch(
  db: Database,
  input: {
    branchName: string;
    regionId: string;
    branchType?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    establishedDate?: string;
    serviceSchedule?: { day: string; time: string; type: string }[];
  },
) {
  // Verify region exists
  const [region] = await db.select().from(regions).where(eq(regions.id, input.regionId));
  if (!region) throw new ValidationError('Invalid region ID');

  const [branch] = await db.insert(branches).values({
    branchName: input.branchName,
    regionId: input.regionId,
    branchType: input.branchType ?? 'Main',
    address: input.address ?? null,
    city: input.city ?? null,
    postalCode: input.postalCode ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    establishedDate: input.establishedDate ?? null,
    serviceSchedule: input.serviceSchedule ?? null,
  }).returning();

  return branch;
}

export async function updateBranch(
  db: Database,
  branchId: string,
  input: Record<string, unknown>,
  auth: AuthContext,
) {
  enforceBranchAccess(auth, branchId);

  const [existing] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.isActive, true)));
  if (!existing) throw new NotFoundError('Branch not found');

  if (input.regionId) {
    const [region] = await db.select().from(regions).where(eq(regions.id, input.regionId as string));
    if (!region) throw new ValidationError('Invalid region ID');
  }

  const [updated] = await db
    .update(branches)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(branches.id, branchId))
    .returning();

  return updated;
}

export async function deleteBranch(db: Database, branchId: string) {
  const [existing] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.isActive, true)));
  if (!existing) throw new NotFoundError('Branch not found');

  // Check for active members
  const [memberCount] = await db
    .select({ count: count() })
    .from(members)
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.isActive, true),
        eq(members.memberType, 'member'),
      ),
    );

  if (memberCount && memberCount.count > 0) {
    throw new ValidationError('Cannot deactivate branch with active members');
  }

  const [updated] = await db
    .update(branches)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(branches.id, branchId))
    .returning();

  return updated;
}

// ── Leadership ─────────────────────────────────────────────

export async function getBranchLeadership(
  db: Database,
  branchId: string,
  auth: AuthContext,
  options?: { includeHistory?: boolean },
) {
  enforceBranchAccess(auth, branchId);

  const conditions = [eq(branchLeadership.branchId, branchId)];
  if (!options?.includeHistory) {
    conditions.push(eq(branchLeadership.isCurrent, true));
  }

  return db
    .select({
      id: branchLeadership.id,
      branchId: branchLeadership.branchId,
      memberId: branchLeadership.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberPhotoUrl: members.photoUrl,
      role: branchLeadership.role,
      startDate: branchLeadership.startDate,
      endDate: branchLeadership.endDate,
      isCurrent: branchLeadership.isCurrent,
    })
    .from(branchLeadership)
    .innerJoin(members, eq(branchLeadership.memberId, members.id))
    .where(and(...conditions))
    .orderBy(branchLeadership.startDate);
}

export async function assignLeadership(
  db: Database,
  branchId: string,
  input: { memberId: string; role: string; startDate?: string },
) {
  // Verify branch exists
  const [branch] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.isActive, true)));
  if (!branch) throw new NotFoundError('Branch not found');

  // Verify member exists and is active
  const [member] = await db.select().from(members).where(and(eq(members.id, input.memberId), eq(members.isActive, true)));
  if (!member) throw new NotFoundError('Member not found or inactive');

  // If assigning Main Pastor, deactivate current one
  if (input.role === 'Main Pastor') {
    await db
      .update(branchLeadership)
      .set({ isCurrent: false, endDate: new Date().toISOString().split('T')[0] })
      .where(
        and(
          eq(branchLeadership.branchId, branchId),
          sql`${branchLeadership.role} = 'Main Pastor'`,
          eq(branchLeadership.isCurrent, true),
        ),
      );
  }

  // Check if this member already holds this role in this branch
  const [existing] = await db
    .select()
    .from(branchLeadership)
    .where(
      and(
        eq(branchLeadership.branchId, branchId),
        eq(branchLeadership.memberId, input.memberId),
        eq(branchLeadership.role, input.role),
        eq(branchLeadership.isCurrent, true),
      ),
    );
  if (existing) throw new ConflictError('Member already holds this role in this branch');

  const [assignment] = await db
    .insert(branchLeadership)
    .values({
      branchId,
      memberId: input.memberId,
      role: input.role,
      startDate: input.startDate ?? new Date().toISOString().split('T')[0],
    })
    .returning();

  return assignment;
}

export async function removeLeadership(db: Database, branchId: string, leadershipId: string) {
  const [existing] = await db
    .select()
    .from(branchLeadership)
    .where(and(eq(branchLeadership.id, leadershipId), eq(branchLeadership.branchId, branchId), eq(branchLeadership.isCurrent, true)));

  if (!existing) throw new NotFoundError('Leadership assignment not found');

  const [updated] = await db
    .update(branchLeadership)
    .set({ isCurrent: false, endDate: new Date().toISOString().split('T')[0] })
    .where(eq(branchLeadership.id, leadershipId))
    .returning();

  return updated;
}

// ── Branch System Admin role management ────────────────────
// Three operations gated by requireBranchAdmin/requireBranchSystemAdmin at
// the router boundary. The service trusts that gate and only enforces the
// "last-active-BSA" lockout guard on revoke.

async function getBranchSystemAdminRoleId(db: Database): Promise<string> {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.roleName, BRANCH_SYSTEM_ADMIN_ROLE), eq(roles.isActive, true)))
    .limit(1);
  if (!role) {
    throw new NotFoundError('Branch System Admin role is not configured');
  }
  return role.id;
}

export async function listBranchRoleAssignments(
  db: Database,
  branchId: string,
): Promise<BranchRoleAssignment[]> {
  // Branch existence is intentionally not asserted here — the router gate
  // already requires admin authority on this branch, so the caller knows
  // the branch exists. An empty list for an unknown branch is acceptable.
  const rows = await db
    .select({
      id: memberRoles.id,
      memberId: memberRoles.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      roleName: roles.roleName,
      assignedDate: memberRoles.assignedDate,
      isActive: memberRoles.isActive,
    })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .innerJoin(members, eq(memberRoles.memberId, members.id))
    .where(
      and(
        eq(memberRoles.branchId, branchId),
        eq(roles.roleName, BRANCH_SYSTEM_ADMIN_ROLE),
        eq(memberRoles.isActive, true),
      ),
    )
    .orderBy(memberRoles.assignedDate);

  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    member: {
      id: r.memberId,
      firstName: r.memberFirstName,
      lastName: r.memberLastName,
      email: r.memberEmail,
    },
    roleName: r.roleName,
    assignedDate: r.assignedDate,
    isActive: r.isActive,
  }));
}

export async function assignBranchSystemAdmin(
  db: Database,
  branchId: string,
  memberId: string,
): Promise<BranchRoleAssignment> {
  // Verify branch exists and is active
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.isActive, true)))
    .limit(1);
  if (!branch) throw new NotFoundError('Branch not found');

  // Verify member exists and is active
  const [member] = await db
    .select({ id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)))
    .limit(1);
  if (!member) throw new NotFoundError('Member not found or inactive');

  const roleId = await getBranchSystemAdminRoleId(db);

  // Reject duplicate active assignment in the same branch
  const [existing] = await db
    .select({ id: memberRoles.id })
    .from(memberRoles)
    .where(
      and(
        eq(memberRoles.memberId, memberId),
        eq(memberRoles.roleId, roleId),
        eq(memberRoles.branchId, branchId),
        eq(memberRoles.isActive, true),
      ),
    )
    .limit(1);
  if (existing) {
    throw new ConflictError('Member is already a Branch System Admin for this branch');
  }

  const [created] = await db
    .insert(memberRoles)
    .values({ memberId, roleId, branchId })
    .returning();
  if (!created) throw new Error('Failed to create member role');

  return {
    id: created.id,
    memberId: created.memberId,
    member: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
    },
    roleName: BRANCH_SYSTEM_ADMIN_ROLE,
    assignedDate: created.assignedDate,
    isActive: created.isActive,
  };
}

export async function revokeBranchSystemAdmin(
  db: Database,
  branchId: string,
  assignmentId: string,
): Promise<BranchRoleAssignment> {
  const roleId = await getBranchSystemAdminRoleId(db);

  // Find the assignment scoped to this branch + role
  const [assignment] = await db
    .select({
      id: memberRoles.id,
      memberId: memberRoles.memberId,
      branchId: memberRoles.branchId,
      roleId: memberRoles.roleId,
      isActive: memberRoles.isActive,
      assignedDate: memberRoles.assignedDate,
    })
    .from(memberRoles)
    .where(
      and(
        eq(memberRoles.id, assignmentId),
        eq(memberRoles.branchId, branchId),
        eq(memberRoles.roleId, roleId),
        eq(memberRoles.isActive, true),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw new NotFoundError('Branch System Admin assignment not found');
  }

  // Lockout guard: refuse to revoke the last active BSA in the branch
  const countRows = await db
    .select({ count: count() })
    .from(memberRoles)
    .where(
      and(
        eq(memberRoles.branchId, branchId),
        eq(memberRoles.roleId, roleId),
        eq(memberRoles.isActive, true),
      ),
    );
  const activeCount = countRows[0]?.count ?? 0;

  if (activeCount <= 1) {
    throw new ValidationError(
      'Cannot revoke the last active Branch System Admin for this branch',
    );
  }

  // Pull member display info for the response envelope
  const [member] = await db
    .select({ id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email })
    .from(members)
    .where(eq(members.id, assignment.memberId))
    .limit(1);

  const [updated] = await db
    .update(memberRoles)
    .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: new Date() })
    .where(eq(memberRoles.id, assignmentId))
    .returning();
  if (!updated) throw new Error('Failed to revoke member role');

  return {
    id: updated.id,
    memberId: updated.memberId,
    member: {
      id: member?.id ?? assignment.memberId,
      firstName: member?.firstName ?? '',
      lastName: member?.lastName ?? '',
      email: member?.email ?? '',
    },
    roleName: BRANCH_SYSTEM_ADMIN_ROLE,
    assignedDate: updated.assignedDate,
    isActive: updated.isActive,
  };
}

// ── Helpers ────────────────────────────────────────────────

function enforceBranchAccess(auth: AuthContext, branchId: string) {
  if (auth.systemRole === 'admin') return;
  // Branch System / Data Admins also have access to the branches they admin,
  // even if it differs from their current activeBranch.
  const bsa = auth.branchSystemAdminBranchIds ?? [];
  const bda = auth.branchDataAdminBranchIds ?? [];
  if (bsa.includes(branchId) || bda.includes(branchId)) return;
  if (auth.branchId !== branchId) {
    throw new ForbiddenError('Access denied to this branch');
  }
}
