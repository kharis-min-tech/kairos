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
import { enforceScopeAllows } from '../lib/scope';
import { authHasCapability } from '../lib/grants';

const BRANCH_SYSTEM_ADMIN_ROLE = 'Branch System Admin';

// ── Region CRUD ────────────────────────────────────────────

export async function listRegions(db: Database) {
  // LEFT JOIN + COUNT so each region carries its branchCount for the admin
  // page — used to disable Edit/Delete when a region has dependents (both
  // operations are only allowed on empty regions; see [[assertRegionEmpty]]).
  const rows = await db
    .select({
      id: regions.id,
      regionName: regions.regionName,
      country: regions.country,
      createdAt: regions.createdAt,
      updatedAt: regions.updatedAt,
      branchCount: count(branches.id),
    })
    .from(regions)
    .leftJoin(branches, eq(branches.regionId, regions.id))
    .groupBy(regions.id)
    .orderBy(regions.regionName);
  return rows.map((r) => ({ ...r, branchCount: Number(r.branchCount) }));
}

export async function createRegion(db: Database, input: { regionName: string; country: string }) {
  const [existing] = await db
    .select()
    .from(regions)
    .where(and(eq(regions.regionName, input.regionName), eq(regions.country, input.country)));
  if (existing) throw new ConflictError('A region already exists for that continent and country');

  const [region] = await db.insert(regions).values(input).returning();
  return region;
}

/**
 * Both edit and delete require the region to be empty (no branches attached).
 * Editing a region with branches would silently relabel every branch under
 * it; deleting one is blocked at the DB level by ON DELETE RESTRICT. Same
 * rule keeps the two operations consistent.
 */
async function assertRegionEmpty(db: Database, regionId: string): Promise<void> {
  const [row] = await db
    .select({ value: count() })
    .from(branches)
    .where(eq(branches.regionId, regionId));
  const attached = row ? Number(row.value) : 0;
  if (attached > 0) {
    throw new ConflictError(
      `${attached} branch${attached === 1 ? ' is' : 'es are'} still assigned to this region. Move them first.`,
    );
  }
}

export async function updateRegion(
  db: Database,
  regionId: string,
  input: { regionName?: string; country?: string },
) {
  const [existing] = await db.select().from(regions).where(eq(regions.id, regionId));
  if (!existing) throw new NotFoundError('Region not found');

  await assertRegionEmpty(db, regionId);

  // Nothing to change — return the row unchanged rather than issue a no-op update.
  const hasChanges = input.regionName !== undefined || input.country !== undefined;
  if (!hasChanges) return existing;

  try {
    const [updated] = await db
      .update(regions)
      .set({
        ...(input.regionName !== undefined ? { regionName: input.regionName } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        updatedAt: new Date(),
      })
      .where(eq(regions.id, regionId))
      .returning();
    return updated;
  } catch (err) {
    // 23505 = composite unique violation on (region_name, country).
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new ConflictError('A region already exists for that continent and country');
    }
    throw err;
  }
}

export async function deleteRegion(db: Database, regionId: string): Promise<void> {
  const [existing] = await db.select({ id: regions.id }).from(regions).where(eq(regions.id, regionId));
  if (!existing) throw new NotFoundError('Region not found');

  await assertRegionEmpty(db, regionId);

  await db.delete(regions).where(eq(regions.id, regionId));
}

// ── Branch CRUD ────────────────────────────────────────────

export async function listBranches(db: Database, auth: AuthContext) {
  // When auth.scope narrows to a single branch (e.g. a BSA-of-Accra logged
  // in scoped to Accra), the list must restrict to that branch even for
  // systemRole='admin' — the scope is the authoritative narrowing.
  const scopedBranchId =
    auth.scope?.kind === 'branch' ? auth.scope.id : null;

  const targetBranchId =
    scopedBranchId ?? (auth.systemRole === 'admin' ? null : auth.branchId);

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
      targetBranchId === null
        ? eq(branches.isActive, true)
        : and(eq(branches.isActive, true), eq(branches.id, targetBranchId)),
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

export async function deleteBranch(db: Database, branchId: string, auth: AuthContext) {
  // Defense-in-depth: middleware (requireRole('admin')) gates entry, but a
  // scope-bound session (e.g. system admin who selected "Branch System Admin —
  // London") must still be narrowed to its scoped branch even if the URL
  // somehow references a different one.
  enforceScopeAllows(auth, 'branch', branchId);

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
  auth: AuthContext,
) {
  // Defense-in-depth: requireBranchSystemAdmin('id') middleware already gates
  // entry. This second check refuses cross-branch writes from a scope-bound
  // session if the URL is ever decoupled from the middleware param.
  enforceScopeAllows(auth, 'branch', branchId);

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

export async function removeLeadership(db: Database, branchId: string, leadershipId: string, auth: AuthContext) {
  // Defense-in-depth: see assignLeadership above.
  enforceScopeAllows(auth, 'branch', branchId);

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
  auth: AuthContext,
): Promise<BranchRoleAssignment> {
  // Defense-in-depth: requireBranchSystemAdmin('id') gates this at the router.
  // The scope re-check refuses BSA grants targeting a different branch than
  // the caller's scoped session.
  enforceScopeAllows(auth, 'branch', branchId);

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

  // Partial unique index `uq_member_roles_active_assignment` catches the
  // race where two concurrent assigns both pass the duplicate check above.
  // Translate Postgres error 23505 into the same friendly ConflictError.
  let created;
  try {
    [created] = await db
      .insert(memberRoles)
      .values({ memberId, roleId, branchId, scopeKind: 'branch', scopeId: branchId })
      .returning();
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new ConflictError('Member is already a Branch System Admin for this branch');
    }
    throw err;
  }
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
  auth: AuthContext,
): Promise<BranchRoleAssignment> {
  // Defense-in-depth: requireBranchSystemAdmin('id') gates this at the router.
  // The scope re-check refuses BSA revokes targeting a different branch than
  // the caller's scoped session.
  enforceScopeAllows(auth, 'branch', branchId);

  const roleId = await getBranchSystemAdminRoleId(db);

  // NOTE on JWT staleness: revoking BSA flips `is_active=false` on the role row,
  // but the revoked admin's outstanding access tokens still carry the old
  // branchSystemAdminBranchIds list until they expire (TTL window). Their
  // authority disappears on next token refresh. If a tighter cut-off is ever
  // required, gate via a tokenVersion column on members and bump it here.
  return await db.transaction(async (tx) => {
    // Lock all active BSA rows for this branch+role. Two concurrent revokes
    // can't both observe `activeCount == 2` because the FOR UPDATE clause
    // serialises them — the second waits for the first to commit, then sees
    // the post-update state.
    const activeRows = await tx
      .select({
        id: memberRoles.id,
        memberId: memberRoles.memberId,
        assignedDate: memberRoles.assignedDate,
      })
      .from(memberRoles)
      .where(
        and(
          eq(memberRoles.branchId, branchId),
          eq(memberRoles.roleId, roleId),
          eq(memberRoles.isActive, true),
        ),
      )
      .for('update');

    const target = activeRows.find((r) => r.id === assignmentId);
    if (!target) {
      throw new NotFoundError('Branch System Admin assignment not found');
    }
    if (activeRows.length <= 1) {
      throw new ValidationError(
        'Cannot revoke the last active Branch System Admin for this branch',
      );
    }

    // Pull member display info for the response envelope
    const [member] = await tx
      .select({ id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email })
      .from(members)
      .where(eq(members.id, target.memberId))
      .limit(1);

    const [updated] = await tx
      .update(memberRoles)
      .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: new Date() })
      .where(eq(memberRoles.id, assignmentId))
      .returning();
    if (!updated) throw new Error('Failed to revoke member role');

    return {
      id: updated.id,
      memberId: updated.memberId,
      member: {
        id: member?.id ?? target.memberId,
        firstName: member?.firstName ?? '',
        lastName: member?.lastName ?? '',
        email: member?.email ?? '',
      },
      roleName: BRANCH_SYSTEM_ADMIN_ROLE,
      assignedDate: updated.assignedDate,
      isActive: updated.isActive,
    };
  });
}

// ── Helpers ────────────────────────────────────────────────

function enforceBranchAccess(auth: AuthContext, branchId: string) {
  // Phase 4: a branch-scoped session (e.g. "Branch System Admin — London")
  // is acting AS a single branch. Even system admins / multi-branch admins
  // are narrowed to that branch for the lifetime of the token. Any access to
  // a different branch is refused here — switch role to act elsewhere.
  enforceScopeAllows(auth, 'branch', branchId);

  if (auth.systemRole === 'admin') return;
  // RBAC Phase 4b: pastor narrowed via capability check. BSA/BDA also pass
  // because their grants include branch:read on this branch.
  if (authHasCapability(auth, 'branch:read', { kind: 'branch', id: branchId })) {
    return;
  }
  if (auth.branchId !== branchId) {
    throw new ForbiddenError('Access denied to this branch');
  }
}
