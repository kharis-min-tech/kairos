import { eq, and, count, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { branches, regions, branchLeadership, members } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '@kairos/utils';

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
    .where(and(eq(members.homeBranchId, branchId), eq(members.isActive, true)));

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

// ── Helpers ────────────────────────────────────────────────

function enforceBranchAccess(auth: AuthContext, branchId: string) {
  if (auth.systemRole === 'admin') return;
  if (auth.branchId !== branchId) {
    throw new ForbiddenError('Access denied to this branch');
  }
}
