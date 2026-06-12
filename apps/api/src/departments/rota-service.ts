import { eq, and, gte, lte, asc, desc, inArray, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  branchDepartments,
  rotaTemplates,
  rotaTemplateSlots,
  rotaPoolMembers,
  rotaInstances,
  rotaAssignments,
  rotaSwapRequests,
  members,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@kairos/utils';
import {
  computeServiceDates,
  planAssignments,
  type FairnessPoolMember,
  type FairnessSlot,
} from './rota-fairness';
import { enforceScopeAllows } from '../lib/scope';

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
  bd: { id: string; branchId: string; leadMemberId: string | null; deputyMemberId: string | null },
) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  const isLead =
    auth.systemRole === 'leader' &&
    (bd.leadMemberId === auth.memberId || bd.deputyMemberId === auth.memberId);
  if (isLead) {
    enforceScopeAllows(auth, 'department', bd.id);
    return;
  }
  throw new ForbiddenError('Only department leads or above can perform this action');
}

function enforceBranchScope(auth: AuthContext, bd: { branchId: string }) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (bd.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access departments in your branch');
  }
}

async function loadTemplate(db: Database, templateId: string) {
  const [tpl] = await db
    .select()
    .from(rotaTemplates)
    .where(eq(rotaTemplates.id, templateId));
  if (!tpl) throw new NotFoundError('Rota template not found');
  return tpl;
}

// ── Templates ──────────────────────────────────────────────

export interface CreateTemplateInput {
  name: string;
  weekday: number;
  defaultStartTime?: string | null;
  notes?: string | null;
}

export async function listTemplates(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  query: { includeArchived?: boolean } = {},
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);

  const conditions = [eq(rotaTemplates.branchDepartmentId, branchDeptId)];
  if (!query.includeArchived) conditions.push(eq(rotaTemplates.isActive, true));

  const templates = await db
    .select()
    .from(rotaTemplates)
    .where(and(...conditions))
    .orderBy(desc(rotaTemplates.isActive), asc(rotaTemplates.name));

  if (templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);

  const slotCounts = await db
    .select({
      templateId: rotaTemplateSlots.templateId,
      count: sql<number>`count(*)::int`,
      positions: sql<number>`coalesce(sum(${rotaTemplateSlots.positionsRequired}), 0)::int`,
    })
    .from(rotaTemplateSlots)
    .where(inArray(rotaTemplateSlots.templateId, templateIds))
    .groupBy(rotaTemplateSlots.templateId);

  const poolCounts = await db
    .select({
      templateId: rotaPoolMembers.templateId,
      count: sql<number>`count(*)::int`,
    })
    .from(rotaPoolMembers)
    .where(
      and(
        inArray(rotaPoolMembers.templateId, templateIds),
        eq(rotaPoolMembers.isActive, true),
      ),
    )
    .groupBy(rotaPoolMembers.templateId);

  const lastGenerated = await db
    .select({
      templateId: rotaInstances.templateId,
      lastServiceDate: sql<string | null>`max(${rotaInstances.serviceDate})`,
    })
    .from(rotaInstances)
    .where(inArray(rotaInstances.templateId, templateIds))
    .groupBy(rotaInstances.templateId);

  const slotMap = new Map(slotCounts.map((r) => [r.templateId, r]));
  const poolMap = new Map(poolCounts.map((r) => [r.templateId, r.count]));
  const genMap = new Map(lastGenerated.map((r) => [r.templateId, r.lastServiceDate]));

  return templates.map((t) => ({
    ...t,
    slotCount: slotMap.get(t.id)?.count ?? 0,
    positionCount: slotMap.get(t.id)?.positions ?? 0,
    poolCount: poolMap.get(t.id) ?? 0,
    lastGeneratedAt: genMap.get(t.id) ?? null,
  }));
}

export async function createTemplate(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  input: CreateTemplateInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const [created] = await db
    .insert(rotaTemplates)
    .values({
      branchDepartmentId: branchDeptId,
      name: input.name,
      weekday: input.weekday,
      defaultStartTime: input.defaultStartTime ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return created!;
}

export interface UpdateTemplateInput {
  name?: string;
  weekday?: number;
  defaultStartTime?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export async function updateTemplate(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
  input: UpdateTemplateInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');
  const [updated] = await db
    .update(rotaTemplates)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(rotaTemplates.id, templateId))
    .returning();
  return updated!;
}

export async function deactivateTemplate(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
) {
  return updateTemplate(db, auth, branchDeptId, templateId, { isActive: false });
}

// ── Slots ──────────────────────────────────────────────────

export interface CreateSlotInput {
  roleName: string;
  positionsRequired?: number;
  notes?: string | null;
  sortOrder?: number;
}

export async function listSlots(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');
  return db
    .select()
    .from(rotaTemplateSlots)
    .where(
      and(
        eq(rotaTemplateSlots.templateId, templateId),
        eq(rotaTemplateSlots.isActive, true),
      ),
    )
    .orderBy(asc(rotaTemplateSlots.sortOrder));
}

export async function createSlot(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
  input: CreateSlotInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');
  const [created] = await db
    .insert(rotaTemplateSlots)
    .values({
      templateId,
      roleName: input.roleName,
      positionsRequired: input.positionsRequired ?? 1,
      notes: input.notes ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return created!;
}

export async function updateSlot(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
  slotId: string,
  input: Partial<CreateSlotInput> & { isActive?: boolean },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');
  const [existing] = await db
    .select({ id: rotaTemplateSlots.id, templateId: rotaTemplateSlots.templateId })
    .from(rotaTemplateSlots)
    .where(eq(rotaTemplateSlots.id, slotId));
  if (!existing || existing.templateId !== templateId) throw new NotFoundError('Slot not found');
  const [updated] = await db
    .update(rotaTemplateSlots)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(rotaTemplateSlots.id, slotId))
    .returning();
  return updated!;
}

export async function deleteSlot(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
  slotId: string,
) {
  return updateSlot(db, auth, branchDeptId, templateId, slotId, { isActive: false });
}

// ── Pool ───────────────────────────────────────────────────

export async function listPool(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');
  return db
    .select({
      id: rotaPoolMembers.id,
      memberId: rotaPoolMembers.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberPhotoUrl: members.photoUrl,
      preferredRoleName: rotaPoolMembers.preferredRoleName,
      lastScheduledAt: rotaPoolMembers.lastScheduledAt,
      notes: rotaPoolMembers.notes,
    })
    .from(rotaPoolMembers)
    .leftJoin(members, eq(rotaPoolMembers.memberId, members.id))
    .where(
      and(
        eq(rotaPoolMembers.templateId, templateId),
        eq(rotaPoolMembers.isActive, true),
      ),
    )
    .orderBy(asc(members.lastName));
}

export interface AddPoolMemberInput {
  memberId: string;
  preferredRoleName?: string | null;
  notes?: string | null;
}

export async function addPoolMember(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
  input: AddPoolMemberInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');

  const [existing] = await db
    .select({ id: rotaPoolMembers.id, isActive: rotaPoolMembers.isActive })
    .from(rotaPoolMembers)
    .where(
      and(
        eq(rotaPoolMembers.templateId, templateId),
        eq(rotaPoolMembers.memberId, input.memberId),
        eq(rotaPoolMembers.isActive, true),
      ),
    );
  if (existing) throw new ConflictError('Member is already in the pool for this template');

  const [created] = await db
    .insert(rotaPoolMembers)
    .values({
      templateId,
      memberId: input.memberId,
      preferredRoleName: input.preferredRoleName ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return created!;
}

export async function removePoolMember(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
  poolMemberId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');

  const [existing] = await db
    .select({ id: rotaPoolMembers.id, templateId: rotaPoolMembers.templateId })
    .from(rotaPoolMembers)
    .where(eq(rotaPoolMembers.id, poolMemberId));
  if (!existing || existing.templateId !== templateId) throw new NotFoundError('Pool member not found');

  await db
    .update(rotaPoolMembers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(rotaPoolMembers.id, poolMemberId));
  return { id: poolMemberId };
}

// ── Generation ─────────────────────────────────────────────

export interface GenerateRotaInput {
  weeks: number;
  startDate: string; // YYYY-MM-DD
}

export interface GeneratedRotaResult {
  instanceCount: number;
  assignmentCount: number;
  openSlotCount: number;
}

export async function generateRota(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  templateId: string,
  input: GenerateRotaInput,
): Promise<GeneratedRotaResult> {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const tpl = await loadTemplate(db, templateId);
  if (tpl.branchDepartmentId !== branchDeptId) throw new NotFoundError('Rota template not found');
  if (input.weeks < 1 || input.weeks > 52) {
    throw new ValidationError('weeks must be between 1 and 52');
  }

  const slotsRows = await db
    .select()
    .from(rotaTemplateSlots)
    .where(
      and(
        eq(rotaTemplateSlots.templateId, templateId),
        eq(rotaTemplateSlots.isActive, true),
      ),
    );
  if (slotsRows.length === 0) throw new ValidationError('Template has no active slots');

  const poolRows = await db
    .select()
    .from(rotaPoolMembers)
    .where(
      and(
        eq(rotaPoolMembers.templateId, templateId),
        eq(rotaPoolMembers.isActive, true),
      ),
    );

  const slots: FairnessSlot[] = slotsRows.map((s) => ({
    slotId: s.id,
    roleName: s.roleName,
    positionsRequired: s.positionsRequired,
    sortOrder: s.sortOrder,
  }));
  const pool: FairnessPoolMember[] = poolRows.map((p) => ({
    memberId: p.memberId,
    lastScheduledAt: p.lastScheduledAt,
    preferredRoleName: p.preferredRoleName,
  }));

  const dates = computeServiceDates(input.startDate, tpl.weekday, input.weeks);
  const planned = planAssignments(pool, slots, dates);

  // Find existing instances to skip
  const existing = await db
    .select({ id: rotaInstances.id, serviceDate: rotaInstances.serviceDate })
    .from(rotaInstances)
    .where(
      and(
        eq(rotaInstances.templateId, templateId),
        inArray(rotaInstances.serviceDate, dates),
      ),
    );
  const existingByDate = new Map(existing.map((e) => [e.serviceDate, e.id]));

  // Insert missing instances
  const datesToCreate = dates.filter((d) => !existingByDate.has(d));
  let createdInstances: { id: string; serviceDate: string }[] = [];
  if (datesToCreate.length > 0) {
    createdInstances = await db
      .insert(rotaInstances)
      .values(
        datesToCreate.map((serviceDate) => ({
          templateId,
          branchDepartmentId: branchDeptId,
          serviceDate,
          startTime: tpl.defaultStartTime,
          status: 'Draft' as const,
        })),
      )
      .returning({ id: rotaInstances.id, serviceDate: rotaInstances.serviceDate });
  }
  const instanceByDate = new Map<string, string>([
    ...existingByDate.entries(),
    ...createdInstances.map((c) => [c.serviceDate, c.id] as [string, string]),
  ]);

  // Insert assignments only for newly-created instances (don't overwrite existing manual edits)
  const newInstanceIds = new Set(createdInstances.map((c) => c.id));
  const newAssignments = planned
    .filter((p) => newInstanceIds.has(instanceByDate.get(p.serviceDate)!))
    .map((p) => ({
      instanceId: instanceByDate.get(p.serviceDate)!,
      slotId: p.slotId,
      memberId: p.memberId,
      status: p.memberId ? ('Assigned' as const) : ('Open' as const),
    }));

  let openSlotCount = 0;
  if (newAssignments.length > 0) {
    await db.insert(rotaAssignments).values(newAssignments);
    openSlotCount = newAssignments.filter((a) => a.memberId === null).length;

    // Update lastScheduledAt for assigned members
    const assignedByMember = new Map<string, string>();
    for (const p of planned) {
      if (!p.memberId) continue;
      const prev = assignedByMember.get(p.memberId);
      if (!prev || p.serviceDate > prev) assignedByMember.set(p.memberId, p.serviceDate);
    }
    for (const [memberId, date] of assignedByMember) {
      await db
        .update(rotaPoolMembers)
        .set({ lastScheduledAt: date, updatedAt: new Date() })
        .where(
          and(
            eq(rotaPoolMembers.templateId, templateId),
            eq(rotaPoolMembers.memberId, memberId),
          ),
        );
    }
  }

  return {
    instanceCount: createdInstances.length,
    assignmentCount: newAssignments.filter((a) => a.memberId !== null).length,
    openSlotCount,
  };
}

// ── Instances & assignments ────────────────────────────────

export async function listInstances(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  query: { from?: string; to?: string },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);
  const conditions = [eq(rotaInstances.branchDepartmentId, branchDeptId)];
  if (query.from) conditions.push(gte(rotaInstances.serviceDate, query.from));
  if (query.to) conditions.push(lte(rotaInstances.serviceDate, query.to));

  const rows = await db
    .select({
      id: rotaInstances.id,
      branchDepartmentId: rotaInstances.branchDepartmentId,
      templateId: rotaInstances.templateId,
      serviceDate: rotaInstances.serviceDate,
      status: rotaInstances.status,
      publishedAt: rotaInstances.publishedAt,
      notes: rotaInstances.notes,
      createdAt: rotaInstances.createdAt,
      updatedAt: rotaInstances.updatedAt,
      templateName: rotaTemplates.name,
      templateStartTime: rotaTemplates.defaultStartTime,
    })
    .from(rotaInstances)
    .leftJoin(rotaTemplates, eq(rotaInstances.templateId, rotaTemplates.id))
    .where(and(...conditions))
    .orderBy(asc(rotaInstances.serviceDate));

  if (rows.length === 0) return [];

  const instanceIds = rows.map((r) => r.id);

  const counts = await db
    .select({
      instanceId: rotaAssignments.instanceId,
      total: sql<number>`count(*)::int`,
      filled: sql<number>`count(${rotaAssignments.memberId})::int`,
    })
    .from(rotaAssignments)
    .where(inArray(rotaAssignments.instanceId, instanceIds))
    .groupBy(rotaAssignments.instanceId);

  const assignedRows = await db
    .select({
      instanceId: rotaAssignments.instanceId,
      memberId: rotaAssignments.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      photoUrl: members.photoUrl,
      sortOrder: rotaTemplateSlots.sortOrder,
    })
    .from(rotaAssignments)
    .leftJoin(rotaTemplateSlots, eq(rotaAssignments.slotId, rotaTemplateSlots.id))
    .leftJoin(members, eq(rotaAssignments.memberId, members.id))
    .where(
      and(
        inArray(rotaAssignments.instanceId, instanceIds),
        sql`${rotaAssignments.memberId} is not null`,
      ),
    )
    .orderBy(asc(rotaTemplateSlots.sortOrder));

  const countMap = new Map(counts.map((c) => [c.instanceId, c]));
  const memberMap = new Map<string, Array<{ memberId: string; firstName: string; lastName: string; photoUrl: string | null }>>();
  for (const r of assignedRows) {
    if (!r.memberId) continue;
    const arr = memberMap.get(r.instanceId) ?? [];
    if (arr.length < 6) {
      arr.push({
        memberId: r.memberId,
        firstName: r.firstName ?? '',
        lastName: r.lastName ?? '',
        photoUrl: r.photoUrl ?? null,
      });
    }
    memberMap.set(r.instanceId, arr);
  }

  return rows.map((r) => {
    const c = countMap.get(r.id);
    const total = c?.total ?? 0;
    const filled = c?.filled ?? 0;
    return {
      ...r,
      totalSlots: total,
      filledSlots: filled,
      openSlots: Math.max(total - filled, 0),
      assignedMembers: memberMap.get(r.id) ?? [],
    };
  });
}

export async function getInstance(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  instanceId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);
  const [instance] = await db
    .select()
    .from(rotaInstances)
    .where(eq(rotaInstances.id, instanceId));
  if (!instance || instance.branchDepartmentId !== branchDeptId) {
    throw new NotFoundError('Rota instance not found');
  }
  const assignments = await db
    .select({
      id: rotaAssignments.id,
      slotId: rotaAssignments.slotId,
      roleName: rotaTemplateSlots.roleName,
      sortOrder: rotaTemplateSlots.sortOrder,
      memberId: rotaAssignments.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberPhotoUrl: members.photoUrl,
      status: rotaAssignments.status,
      notes: rotaAssignments.notes,
      respondedAt: rotaAssignments.respondedAt,
    })
    .from(rotaAssignments)
    .leftJoin(rotaTemplateSlots, eq(rotaAssignments.slotId, rotaTemplateSlots.id))
    .leftJoin(members, eq(rotaAssignments.memberId, members.id))
    .where(eq(rotaAssignments.instanceId, instanceId))
    .orderBy(asc(rotaTemplateSlots.sortOrder));
  return { ...instance, assignments };
}

export async function regenerateInstance(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  instanceId: string,
): Promise<{ instanceId: string; assignmentCount: number; openSlotCount: number }> {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const [instance] = await db
    .select()
    .from(rotaInstances)
    .where(eq(rotaInstances.id, instanceId));
  if (!instance || instance.branchDepartmentId !== branchDeptId) {
    throw new NotFoundError('Rota instance not found');
  }
  if (instance.status !== 'Draft') {
    throw new ConflictError(
      'Only Draft instances can be regenerated. Set the instance back to Draft first.',
    );
  }

  const slotsRows = await db
    .select()
    .from(rotaTemplateSlots)
    .where(
      and(
        eq(rotaTemplateSlots.templateId, instance.templateId),
        eq(rotaTemplateSlots.isActive, true),
      ),
    );
  if (slotsRows.length === 0) throw new ValidationError('Template has no active slots');

  const poolRows = await db
    .select()
    .from(rotaPoolMembers)
    .where(
      and(
        eq(rotaPoolMembers.templateId, instance.templateId),
        eq(rotaPoolMembers.isActive, true),
      ),
    );

  const slots: FairnessSlot[] = slotsRows.map((s) => ({
    slotId: s.id,
    roleName: s.roleName,
    positionsRequired: s.positionsRequired,
    sortOrder: s.sortOrder,
  }));
  const pool: FairnessPoolMember[] = poolRows.map((p) => ({
    memberId: p.memberId,
    lastScheduledAt: p.lastScheduledAt,
    preferredRoleName: p.preferredRoleName,
  }));

  const planned = planAssignments(pool, slots, [instance.serviceDate]);

  // Wipe existing assignments for this instance, then insert fresh ones.
  await db.delete(rotaAssignments).where(eq(rotaAssignments.instanceId, instanceId));

  const newAssignments = planned.map((p) => ({
    instanceId,
    slotId: p.slotId,
    memberId: p.memberId,
    status: p.memberId ? ('Assigned' as const) : ('Open' as const),
  }));
  if (newAssignments.length > 0) {
    await db.insert(rotaAssignments).values(newAssignments);
  }

  // Refresh lastScheduledAt for picked members.
  for (const p of planned) {
    if (!p.memberId) continue;
    await db
      .update(rotaPoolMembers)
      .set({ lastScheduledAt: instance.serviceDate, updatedAt: new Date() })
      .where(
        and(
          eq(rotaPoolMembers.templateId, instance.templateId),
          eq(rotaPoolMembers.memberId, p.memberId),
        ),
      );
  }

  return {
    instanceId,
    assignmentCount: newAssignments.filter((a) => a.memberId !== null).length,
    openSlotCount: newAssignments.filter((a) => a.memberId === null).length,
  };
}

export async function updateInstanceStatus(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  instanceId: string,
  input: { status: 'Draft' | 'Published' | 'Cancelled'; notes?: string | null },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const [existing] = await db
    .select({ id: rotaInstances.id, branchDepartmentId: rotaInstances.branchDepartmentId })
    .from(rotaInstances)
    .where(eq(rotaInstances.id, instanceId));
  if (!existing || existing.branchDepartmentId !== branchDeptId) {
    throw new NotFoundError('Rota instance not found');
  }
  const set: Record<string, unknown> = {
    status: input.status,
    notes: input.notes ?? null,
    updatedAt: new Date(),
  };
  if (input.status === 'Published') set.publishedAt = new Date();
  const [updated] = await db
    .update(rotaInstances)
    .set(set)
    .where(eq(rotaInstances.id, instanceId))
    .returning();
  return updated!;
}

export async function updateAssignment(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  instanceId: string,
  assignmentId: string,
  input: {
    memberId?: string | null;
    status?: 'Assigned' | 'Confirmed' | 'Declined' | 'Swapped' | 'Open';
    notes?: string | null;
  },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);
  const [existing] = await db
    .select({
      id: rotaAssignments.id,
      instanceId: rotaAssignments.instanceId,
    })
    .from(rotaAssignments)
    .where(eq(rotaAssignments.id, assignmentId));
  if (!existing || existing.instanceId !== instanceId) throw new NotFoundError('Assignment not found');
  const set: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.status === 'Confirmed' || input.status === 'Declined') {
    set.respondedAt = new Date();
  }
  const [updated] = await db
    .update(rotaAssignments)
    .set(set)
    .where(eq(rotaAssignments.id, assignmentId))
    .returning();
  return updated!;
}

// ── Swap requests ──────────────────────────────────────────

export interface CreateSwapInput {
  proposedMemberId?: string | null;
  reason?: string | null;
}

export async function createSwapRequest(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  instanceId: string,
  assignmentId: string,
  input: CreateSwapInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);

  const [assignment] = await db
    .select({
      id: rotaAssignments.id,
      instanceId: rotaAssignments.instanceId,
      memberId: rotaAssignments.memberId,
    })
    .from(rotaAssignments)
    .where(eq(rotaAssignments.id, assignmentId));
  if (!assignment || assignment.instanceId !== instanceId) throw new NotFoundError('Assignment not found');

  // Only the assigned member, leader+, can request a swap
  const isOwner = assignment.memberId === auth.memberId;
  const isLead =
    auth.systemRole === 'admin' ||
    auth.systemRole === 'pastor' ||
    (auth.systemRole === 'leader' &&
      (bd.leadMemberId === auth.memberId || bd.deputyMemberId === auth.memberId));
  if (!isOwner && !isLead) {
    throw new ForbiddenError('Only the assigned member or a department lead can request a swap');
  }
  // Scope guard: a lead acting under a department-scoped session can only act
  // on assignments in their scoped department. Owners (the assigned member)
  // are always allowed to request a swap on their own assignment regardless.
  if (!isOwner && isLead) {
    enforceScopeAllows(auth, 'department', bd.id);
  }

  // Prevent duplicate pending requests for the same assignment
  const [pending] = await db
    .select({ id: rotaSwapRequests.id })
    .from(rotaSwapRequests)
    .where(
      and(
        eq(rotaSwapRequests.assignmentId, assignmentId),
        eq(rotaSwapRequests.status, 'pending'),
      ),
    );
  if (pending) throw new ConflictError('A pending swap request already exists for this assignment');

  const [created] = await db
    .insert(rotaSwapRequests)
    .values({
      assignmentId,
      requestedById: auth.memberId,
      proposedMemberId: input.proposedMemberId ?? null,
      reason: input.reason ?? null,
    })
    .returning();
  return created!;
}

export async function listSwapRequests(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  query: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled' },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);

  // Filter swap requests through assignment → instance → branchDepartment
  const conditions = [eq(rotaInstances.branchDepartmentId, branchDeptId)];
  if (query.status) conditions.push(eq(rotaSwapRequests.status, query.status));

  return db
    .select({
      id: rotaSwapRequests.id,
      assignmentId: rotaSwapRequests.assignmentId,
      instanceId: rotaAssignments.instanceId,
      serviceDate: rotaInstances.serviceDate,
      requestedById: rotaSwapRequests.requestedById,
      proposedMemberId: rotaSwapRequests.proposedMemberId,
      reason: rotaSwapRequests.reason,
      status: rotaSwapRequests.status,
      reviewedById: rotaSwapRequests.reviewedById,
      reviewedAt: rotaSwapRequests.reviewedAt,
      reviewNotes: rotaSwapRequests.reviewNotes,
      createdAt: rotaSwapRequests.createdAt,
    })
    .from(rotaSwapRequests)
    .innerJoin(rotaAssignments, eq(rotaSwapRequests.assignmentId, rotaAssignments.id))
    .innerJoin(rotaInstances, eq(rotaAssignments.instanceId, rotaInstances.id))
    .where(and(...conditions))
    .orderBy(desc(rotaSwapRequests.createdAt));
}

export async function reviewSwapRequest(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  requestId: string,
  input: { decision: 'approved' | 'rejected'; reviewNotes?: string | null },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  const [req] = await db
    .select({
      id: rotaSwapRequests.id,
      assignmentId: rotaSwapRequests.assignmentId,
      proposedMemberId: rotaSwapRequests.proposedMemberId,
      status: rotaSwapRequests.status,
      branchDepartmentId: rotaInstances.branchDepartmentId,
    })
    .from(rotaSwapRequests)
    .innerJoin(rotaAssignments, eq(rotaSwapRequests.assignmentId, rotaAssignments.id))
    .innerJoin(rotaInstances, eq(rotaAssignments.instanceId, rotaInstances.id))
    .where(eq(rotaSwapRequests.id, requestId));
  if (!req || req.branchDepartmentId !== branchDeptId) throw new NotFoundError('Swap request not found');
  if (req.status !== 'pending') throw new ConflictError(`Request is already ${req.status}`);

  const [updated] = await db
    .update(rotaSwapRequests)
    .set({
      status: input.decision,
      reviewedById: auth.memberId,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(rotaSwapRequests.id, requestId))
    .returning();

  // If approved + a proposed swap member exists, swap the assignment
  if (input.decision === 'approved' && req.proposedMemberId) {
    await db
      .update(rotaAssignments)
      .set({
        memberId: req.proposedMemberId,
        status: 'Swapped',
        updatedAt: new Date(),
      })
      .where(eq(rotaAssignments.id, req.assignmentId));
  }

  return updated!;
}

// ── Member-facing aggregation ──────────────────────────────

export async function listMyUpcomingRota(
  db: Database,
  auth: AuthContext,
  query: { from?: string; to?: string },
) {
  const today = new Date().toISOString().slice(0, 10);
  const from = query.from ?? today;
  const conditions = [
    eq(rotaAssignments.memberId, auth.memberId),
    gte(rotaInstances.serviceDate, from),
  ];
  if (query.to) conditions.push(lte(rotaInstances.serviceDate, query.to));

  return db
    .select({
      assignmentId: rotaAssignments.id,
      instanceId: rotaAssignments.instanceId,
      branchDepartmentId: rotaInstances.branchDepartmentId,
      templateId: rotaInstances.templateId,
      templateName: rotaTemplates.name,
      serviceDate: rotaInstances.serviceDate,
      startTime: rotaInstances.startTime,
      slotRoleName: rotaTemplateSlots.roleName,
      status: rotaAssignments.status,
      instanceStatus: rotaInstances.status,
    })
    .from(rotaAssignments)
    .innerJoin(rotaInstances, eq(rotaAssignments.instanceId, rotaInstances.id))
    .innerJoin(rotaTemplates, eq(rotaInstances.templateId, rotaTemplates.id))
    .leftJoin(rotaTemplateSlots, eq(rotaAssignments.slotId, rotaTemplateSlots.id))
    .where(and(...conditions))
    .orderBy(asc(rotaInstances.serviceDate));
}

void sql;
