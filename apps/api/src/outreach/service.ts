import { eq, and, desc, sql, count, isNull, isNotNull, or } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  outreachPrograms,
  outreachParticipants,
  souls,
  followUps,
  members,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError } from '@kairos/utils';
import { autoEnroll } from '../new-believers/service';
import type {
  CreateProgramInput,
  ListProgramsQuery,
  CompleteProgramInput,
  CaptureSoulInput,
  ListSoulsQuery,
  UpdateSoulStatusInput,
  ReassignSoulInput,
  LogFollowUpInput,
  ListAlertsQuery,
  RegisterWorkerInput,
} from './schemas';

// ── Helpers ────────────────────────────────────────────────

function enforceBranchScope(auth: AuthContext, branchId: string) {
  if (auth.systemRole === 'admin') return;
  if (auth.branchId !== branchId) {
    throw new ForbiddenError('You can only access outreach data for your branch');
  }
}

// ── Outreach Programs ─────────────────────────────────────

export async function listPrograms(db: Database, auth: AuthContext, query: ListProgramsQuery) {
  const { page, limit, isCompleted } = query;
  const branchId = auth.systemRole === 'admin' ? undefined : auth.branchId;

  const conditions = [
    ...(branchId ? [eq(outreachPrograms.branchId, branchId)] : []),
    ...(isCompleted !== undefined ? [eq(outreachPrograms.isCompleted, isCompleted)] : []),
  ];

  const rows = await db
    .select()
    .from(outreachPrograms)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(outreachPrograms.programDate))
    .limit(limit)
    .offset((page - 1) * limit);

  const totalResult = await db
    .select({ total: count() })
    .from(outreachPrograms)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return { programs: rows, total: totalResult[0]?.total ?? 0, page, limit };
}

export async function createProgram(
  db: Database,
  auth: AuthContext,
  data: CreateProgramInput,
) {
  const branchId = auth.systemRole === 'admin'
    ? (data as { branchId?: string } & CreateProgramInput).branchId ?? auth.branchId
    : auth.branchId;

  // Duplicate check
  const existing = await db
    .select({ id: outreachPrograms.id })
    .from(outreachPrograms)
    .where(
      and(
        eq(outreachPrograms.branchId, branchId),
        eq(outreachPrograms.programName, data.programName),
        eq(outreachPrograms.programDate, data.programDate),
        eq(outreachPrograms.location, data.location),
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('An outreach program with the same name, date, and location already exists');
  }

  const [program] = await db
    .insert(outreachPrograms)
    .values({
      branchId,
      programName: data.programName,
      programDate: data.programDate,
      location: data.location,
      address: data.address,
      city: data.city,
      description: data.description,
      coordinatorId: data.coordinatorId,
      notes: data.notes,
    })
    .returning();

  return program;
}

export async function getProgram(db: Database, auth: AuthContext, id: string) {
  const [program] = await db
    .select()
    .from(outreachPrograms)
    .where(eq(outreachPrograms.id, id))
    .limit(1);

  if (!program) throw new NotFoundError('Outreach program not found');
  enforceBranchScope(auth, program.branchId);
  return program;
}

export async function completeProgram(
  db: Database,
  auth: AuthContext,
  id: string,
  data: CompleteProgramInput,
) {
  const program = await getProgram(db, auth, id);
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins or pastors can complete outreach programs');
  }

  const [updated] = await db
    .update(outreachPrograms)
    .set({
      isCompleted: true,
      totalSoulsReached: data.totalSoulsReached ?? program.totalSoulsReached,
      notes: data.notes ?? program.notes,
      updatedAt: new Date(),
    })
    .where(eq(outreachPrograms.id, id))
    .returning();

  return updated;
}

export async function registerWorker(
  db: Database,
  auth: AuthContext,
  outreachId: string,
  data: RegisterWorkerInput,
) {
  const program = await getProgram(db, auth, outreachId);
  enforceBranchScope(auth, program.branchId);

  const existing = await db
    .select({ outreachId: outreachParticipants.outreachId })
    .from(outreachParticipants)
    .where(
      and(
        eq(outreachParticipants.outreachId, outreachId),
        eq(outreachParticipants.memberId, auth.memberId),
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('You are already registered as a worker for this outreach');
  }

  await db.insert(outreachParticipants).values({
    outreachId,
    memberId: auth.memberId,
    role: data.role,
    notes: data.notes,
  });

  return { outreachId, memberId: auth.memberId };
}

// ── Souls ─────────────────────────────────────────────────

export async function captureSoul(db: Database, auth: AuthContext, data: CaptureSoulInput) {
  // If linked to an outreach, verify branch access
  if (data.outreachId) {
    const program = await getProgram(db, auth, data.outreachId);
    enforceBranchScope(auth, program.branchId);

    // Duplicate phone/email check within same outreach
    if (data.phone) {
      const dup = await db
        .select({ id: souls.id })
        .from(souls)
        .where(
          and(eq(souls.outreachId, data.outreachId), eq(souls.phone, data.phone))
        )
        .limit(1);
      if (dup.length > 0) {
        throw new ConflictError('A soul with this phone number already exists in this outreach');
      }
    }
  }

  const [soul] = await db
    .insert(souls)
    .values({
      outreachId: data.outreachId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      gender: data.gender,
      ageRange: data.ageRange,
      assignedMemberId: data.assignedMemberId ?? auth.memberId,
      status: 'New',
      notes: data.notes,
    })
    .returning();

  // Increment counter on the outreach program if linked
  if (data.outreachId) {
    await db
      .update(outreachPrograms)
      .set({
        totalSoulsReached: sql`${outreachPrograms.totalSoulsReached} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(outreachPrograms.id, data.outreachId));
  }

  return soul;
}

export async function listSouls(db: Database, auth: AuthContext, query: ListSoulsQuery) {
  const { page, limit, outreachId, status, assignedToMe } = query;

  const conditions = [];
  if (auth.systemRole !== 'admin') {
    // Non-admins see only souls linked to their branch's outreach programs
    // OR ad-hoc souls assigned to them
    conditions.push(
      or(
        and(
          isNotNull(souls.outreachId),
          sql`${souls.outreachId} IN (SELECT id FROM outreach_programs WHERE branch_id = ${auth.branchId})`
        ),
        and(isNull(souls.outreachId), eq(souls.assignedMemberId, auth.memberId)),
      )
    );
  }
  if (outreachId) conditions.push(eq(souls.outreachId, outreachId));
  if (status) conditions.push(eq(souls.status, status));
  if (assignedToMe) conditions.push(eq(souls.assignedMemberId, auth.memberId));

  const rows = await db
    .select()
    .from(souls)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(souls.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const totalResult = await db
    .select({ total: count() })
    .from(souls)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return { souls: rows, total: totalResult[0]?.total ?? 0, page, limit };
}

export async function getSoul(db: Database, auth: AuthContext, id: string) {
  const [soul] = await db.select().from(souls).where(eq(souls.id, id)).limit(1);
  if (!soul) throw new NotFoundError('Soul not found');

  // Branch access: if linked to outreach, check branch; otherwise check assigned member
  if (soul.outreachId) {
    const [program] = await db
      .select({ branchId: outreachPrograms.branchId })
      .from(outreachPrograms)
      .where(eq(outreachPrograms.id, soul.outreachId))
      .limit(1);
    if (program) enforceBranchScope(auth, program.branchId);
  } else {
    // Ad-hoc: only assigned member or admin/pastor can view
    if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
      if (soul.assignedMemberId !== auth.memberId) {
        throw new ForbiddenError('You can only view souls assigned to you');
      }
    }
  }

  // Load follow-ups
  const followUpRows = await db
    .select()
    .from(followUps)
    .where(eq(followUps.soulId, id))
    .orderBy(desc(followUps.followUpDate));

  return { ...soul, followUps: followUpRows };
}

export async function updateSoulStatus(
  db: Database,
  auth: AuthContext,
  id: string,
  data: UpdateSoulStatusInput,
) {
  // Load soul to verify access
  const soulDetail = await getSoul(db, auth, id);

  // Status transition validation
  const STATUS_ORDER: Record<string, number> = {
    'New': 0,
    'Following Up': 1,
    'Interested': 2,
    'Converted': 3,
    'Not Interested': 3,
    'Lost Contact': 3,
  };
  const newOrder = STATUS_ORDER[data.status];
  const currentOrder = STATUS_ORDER[soulDetail.status];
  if (
    newOrder !== undefined &&
    currentOrder !== undefined &&
    newOrder < currentOrder &&
    !['admin', 'pastor'].includes(auth.systemRole)
  ) {
    throw new ForbiddenError(`Cannot move soul status backward from '${soulDetail.status}' to '${data.status}'`);
  }

  const updateValues: Record<string, unknown> = {
    status: data.status,
    notes: data.notes ?? soulDetail.notes,
    updatedAt: new Date(),
  };

  if (data.status === 'Converted' && data.convertedToMemberId) {
    updateValues.convertedToMemberId = data.convertedToMemberId;
  }

  const [updated] = await db
    .update(souls)
    .set(updateValues)
    .where(eq(souls.id, id))
    .returning();

  // Wire autoEnroll: when a soul is marked Converted, enrol them in the New Believers class
  if (data.status === 'Converted' && data.convertedToMemberId) {
    // Look up the member's home branch to use as the enrolment branch
    const memberResult = await db
      .select({ homeBranchId: members.homeBranchId })
      .from(members)
      .where(eq(members.id, data.convertedToMemberId))
      .limit(1);

    const enrollBranch = memberResult[0]?.homeBranchId ?? auth.branchId;
    await autoEnroll(db, data.convertedToMemberId, enrollBranch);
  }

  return updated;
}

export async function reassignSoul(
  db: Database,
  auth: AuthContext,
  id: string,
  data: ReassignSoulInput,
) {
  // Verify access
  await getSoul(db, auth, id);

  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins or pastors can reassign souls');
  }

  const [updated] = await db
    .update(souls)
    .set({ assignedMemberId: data.assignedMemberId, updatedAt: new Date() })
    .where(eq(souls.id, id))
    .returning();

  return updated;
}

export async function logFollowUp(
  db: Database,
  auth: AuthContext,
  soulId: string,
  data: LogFollowUpInput,
) {
  // Verify soul access
  await getSoul(db, auth, soulId);

  const [followUp] = await db
    .insert(followUps)
    .values({
      soulId,
      memberId: auth.memberId,
      contactMethod: data.contactMethod,
      contactStatus: data.contactStatus,
      durationMinutes: data.durationMinutes,
      notes: data.notes,
      nextFollowUpDate: data.nextFollowUpDate,
    })
    .returning();

  // Auto-advance soul status based on follow-up outcome
  if (data.contactStatus === 'Interested') {
    const [soul] = await db.select({ status: souls.status }).from(souls).where(eq(souls.id, soulId)).limit(1);
    if (soul?.status === 'New' || soul?.status === 'Following Up') {
      await db
        .update(souls)
        .set({ status: 'Interested', updatedAt: new Date() })
        .where(eq(souls.id, soulId));
    }
  } else if (data.contactStatus === 'Successful' || data.contactStatus === 'Call Back Later') {
    const [soul] = await db.select({ status: souls.status }).from(souls).where(eq(souls.id, soulId)).limit(1);
    if (soul?.status === 'New') {
      await db
        .update(souls)
        .set({ status: 'Following Up', updatedAt: new Date() })
        .where(eq(souls.id, soulId));
    }
  }

  return followUp;
}

export async function getSoulAlerts(
  db: Database,
  auth: AuthContext,
  query: ListAlertsQuery,
) {
  const { page, limit, daysSinceLastContact } = query;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastContact);

  // Souls with active status that haven't had a follow-up recently
  const activeStatuses = ['New', 'Following Up', 'Interested'];

  const branchCondition = auth.systemRole === 'admin' ? sql`1=1` :
    sql`${souls.outreachId} IN (SELECT id FROM outreach_programs WHERE branch_id = ${auth.branchId})
        OR (${souls.outreachId} IS NULL AND ${souls.assignedMemberId} = ${auth.memberId})`;

  const rows = await db
    .select({
      soul: souls,
      lastFollowUp: sql<string>`(SELECT MAX(follow_up_date) FROM follow_ups WHERE soul_id = ${souls.id})`,
    })
    .from(souls)
    .where(
      and(
        sql`${souls.status} = ANY(${sql.raw(`ARRAY['${activeStatuses.join("','")}'::text]`)})`,
        sql`NOT EXISTS (
          SELECT 1 FROM follow_ups
          WHERE soul_id = ${souls.id}
          AND follow_up_date > ${cutoffDate.toISOString()}
        )`,
        branchCondition,
      )
    )
    .orderBy(souls.createdAt)
    .limit(limit)
    .offset((page - 1) * limit);

  const totalResult = await db
    .select({ total: count() })
    .from(souls)
    .where(
      and(
        sql`${souls.status} = ANY(${sql.raw(`ARRAY['${activeStatuses.join("','")}'::text]`)})`,
        sql`NOT EXISTS (
          SELECT 1 FROM follow_ups
          WHERE soul_id = ${souls.id}
          AND follow_up_date > ${cutoffDate.toISOString()}
        )`,
        branchCondition,
      )
    );

  return { alerts: rows, total: totalResult[0]?.total ?? 0, page, limit };
}
