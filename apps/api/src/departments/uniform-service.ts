import { eq, and, gte, lte, desc, asc, sql, ne } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  branchDepartments,
  departmentUniformOutfits,
  departmentUniformSchedule,
  members,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@kairos/utils';

// ── Helpers ────────────────────────────────────────────────

async function loadBranchDepartment(db: Database, branchDeptId: string) {
  const [bd] = await db
    .select({
      id: branchDepartments.id,
      branchId: branchDepartments.branchId,
      leadMemberId: branchDepartments.leadMemberId,
      deputyMemberId: branchDepartments.deputyMemberId,
      isActive: branchDepartments.isActive,
    })
    .from(branchDepartments)
    .where(eq(branchDepartments.id, branchDeptId));
  if (!bd) throw new NotFoundError('Department not found');
  return bd;
}

function enforceLeaderOrAbove(
  auth: AuthContext,
  bd: { branchId: string; leadMemberId: string | null; deputyMemberId: string | null },
) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  const isLead =
    auth.systemRole === 'leader' &&
    (bd.leadMemberId === auth.memberId || bd.deputyMemberId === auth.memberId);
  if (isLead) return;
  throw new ForbiddenError('Only department leads or above can perform this action');
}

function enforceBranchScope(auth: AuthContext, bd: { branchId: string }) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (bd.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access departments in your branch');
  }
}

// ── Outfit gallery ─────────────────────────────────────────

export async function listOutfits(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  query: { includeInactive?: boolean } = {},
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);

  const conditions = [eq(departmentUniformOutfits.branchDepartmentId, branchDeptId)];
  if (!query.includeInactive) {
    conditions.push(eq(departmentUniformOutfits.isActive, true));
  }

  return db
    .select()
    .from(departmentUniformOutfits)
    .where(and(...conditions))
    .orderBy(desc(departmentUniformOutfits.createdAt));
}

export interface CreateOutfitInput {
  name: string;
  imageUrl: string;
  genderTarget?: 'Male' | 'Female' | 'Unisex';
  notes?: string | null;
}

export async function createOutfit(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  input: CreateOutfitInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  const [created] = await db
    .insert(departmentUniformOutfits)
    .values({
      branchDepartmentId: branchDeptId,
      name: input.name,
      imageUrl: input.imageUrl,
      genderTarget: input.genderTarget ?? 'Unisex',
      notes: input.notes ?? null,
      uploadedById: auth.memberId,
    })
    .returning();
  return created!;
}

export interface UpdateOutfitInput {
  name?: string;
  imageUrl?: string;
  genderTarget?: 'Male' | 'Female' | 'Unisex';
  notes?: string | null;
  isActive?: boolean;
}

export async function updateOutfit(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  outfitId: string,
  input: UpdateOutfitInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  const [existing] = await db
    .select({
      id: departmentUniformOutfits.id,
      branchDepartmentId: departmentUniformOutfits.branchDepartmentId,
    })
    .from(departmentUniformOutfits)
    .where(eq(departmentUniformOutfits.id, outfitId));
  if (!existing || existing.branchDepartmentId !== branchDeptId) {
    throw new NotFoundError('Outfit not found');
  }

  const [updated] = await db
    .update(departmentUniformOutfits)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(departmentUniformOutfits.id, outfitId))
    .returning();
  return updated!;
}

export async function deactivateOutfit(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  outfitId: string,
) {
  return updateOutfit(db, auth, branchDeptId, outfitId, { isActive: false });
}

// ── Schedule ───────────────────────────────────────────────

export async function listSchedule(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  query: { from?: string; to?: string },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);

  const conditions = [eq(departmentUniformSchedule.branchDepartmentId, branchDeptId)];
  if (query.from) conditions.push(gte(departmentUniformSchedule.serviceDate, query.from));
  if (query.to) conditions.push(lte(departmentUniformSchedule.serviceDate, query.to));

  return db
    .select({
      id: departmentUniformSchedule.id,
      branchDepartmentId: departmentUniformSchedule.branchDepartmentId,
      outfitId: departmentUniformSchedule.outfitId,
      outfitName: departmentUniformOutfits.name,
      outfitImageUrl: departmentUniformOutfits.imageUrl,
      serviceDate: departmentUniformSchedule.serviceDate,
      genderTarget: departmentUniformSchedule.genderTarget,
      notes: departmentUniformSchedule.notes,
      assignedById: departmentUniformSchedule.assignedById,
      createdAt: departmentUniformSchedule.createdAt,
      updatedAt: departmentUniformSchedule.updatedAt,
    })
    .from(departmentUniformSchedule)
    .leftJoin(
      departmentUniformOutfits,
      eq(departmentUniformSchedule.outfitId, departmentUniformOutfits.id),
    )
    .where(and(...conditions))
    .orderBy(asc(departmentUniformSchedule.serviceDate));
}

export interface AssignScheduleInput {
  outfitId: string;
  serviceDate: string;
  genderTarget?: 'Male' | 'Female' | 'Unisex';
  notes?: string;
}

export async function assignSchedule(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  input: AssignScheduleInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  // outfit must belong to this dept and be active
  const [outfit] = await db
    .select({
      id: departmentUniformOutfits.id,
      branchDepartmentId: departmentUniformOutfits.branchDepartmentId,
      isActive: departmentUniformOutfits.isActive,
    })
    .from(departmentUniformOutfits)
    .where(eq(departmentUniformOutfits.id, input.outfitId));
  if (!outfit || outfit.branchDepartmentId !== branchDeptId) {
    throw new NotFoundError('Outfit not found');
  }
  if (!outfit.isActive) {
    throw new ConflictError('Cannot assign an archived outfit');
  }

  const genderTarget = input.genderTarget ?? 'Unisex';

  // conflict check on (branch_dept, date, gender) — DB has unique idx but pre-check for nicer error
  const [conflict] = await db
    .select({ id: departmentUniformSchedule.id })
    .from(departmentUniformSchedule)
    .where(
      and(
        eq(departmentUniformSchedule.branchDepartmentId, branchDeptId),
        eq(departmentUniformSchedule.serviceDate, input.serviceDate),
        eq(departmentUniformSchedule.genderTarget, genderTarget),
      ),
    );
  if (conflict) {
    throw new ConflictError(
      `An outfit is already assigned to ${input.serviceDate} for ${genderTarget}`,
    );
  }

  const [created] = await db
    .insert(departmentUniformSchedule)
    .values({
      branchDepartmentId: branchDeptId,
      outfitId: input.outfitId,
      serviceDate: input.serviceDate,
      genderTarget,
      notes: input.notes ?? null,
      assignedById: auth.memberId,
    })
    .returning();
  return created!;
}

export async function removeAssignment(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  assignmentId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  const [existing] = await db
    .select({
      id: departmentUniformSchedule.id,
      branchDepartmentId: departmentUniformSchedule.branchDepartmentId,
    })
    .from(departmentUniformSchedule)
    .where(eq(departmentUniformSchedule.id, assignmentId));
  if (!existing || existing.branchDepartmentId !== branchDeptId) {
    throw new NotFoundError('Assignment not found');
  }

  await db.delete(departmentUniformSchedule).where(eq(departmentUniformSchedule.id, assignmentId));
  return { id: assignmentId };
}

/**
 * Returns the next upcoming assignment per gender target (Male / Female / Unisex)
 * for use on member-facing pages ("This Sunday's uniform").
 */
export async function listUpcomingAssignments(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);

  const today = new Date().toISOString().slice(0, 10);

  // Pull all assignments from today onward, then pick the earliest per gender in JS.
  const rows = await db
    .select({
      id: departmentUniformSchedule.id,
      outfitId: departmentUniformSchedule.outfitId,
      outfitName: departmentUniformOutfits.name,
      outfitImageUrl: departmentUniformOutfits.imageUrl,
      serviceDate: departmentUniformSchedule.serviceDate,
      genderTarget: departmentUniformSchedule.genderTarget,
      notes: departmentUniformSchedule.notes,
    })
    .from(departmentUniformSchedule)
    .leftJoin(
      departmentUniformOutfits,
      eq(departmentUniformSchedule.outfitId, departmentUniformOutfits.id),
    )
    .where(
      and(
        eq(departmentUniformSchedule.branchDepartmentId, branchDeptId),
        gte(departmentUniformSchedule.serviceDate, today),
      ),
    )
    .orderBy(asc(departmentUniformSchedule.serviceDate));

  const earliestByGender = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!earliestByGender.has(r.genderTarget)) {
      earliestByGender.set(r.genderTarget, r);
    }
  }
  return Array.from(earliestByGender.values());
}

// keep imports honest
void ne;
void members;
void sql;
