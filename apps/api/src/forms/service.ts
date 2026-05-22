import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { formSubmissions, members, newBelieverEnrollments } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@kairos/utils';
import { createEnrollmentInternal } from '../new-believers/service';
import {
  payloadSchemaByFormType,
  type ListSubmissionsQuery,
  type UpdateSubmissionInput,
  type ExportSubmissionsQuery,
  type MemberSearchQuery,
  type ArchiveProspectsInput,
} from './schemas';

// ── Constants ──────────────────────────────────────────────

/** Prospect shells older than this with no engagement are eligible for manual archive. */
export const DORMANT_PROSPECT_DAYS = 30;

const MEMBER_SEARCH_LIMIT = 10;

// ── Helpers ────────────────────────────────────────────────

/** Admin/pastor bypass; everyone else must match their own branch. */
function enforceBranchScope(auth: AuthContext, branchId?: string) {
  if (auth.systemRole === 'admin') return;
  if (branchId && branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access forms data for your branch');
  }
}

/** Triage surfaces (list/detail/update/export/dormant) are leader-and-above. */
function enforceLeaderOrAbove(auth: AuthContext) {
  if (
    auth.systemRole !== 'admin' &&
    auth.systemRole !== 'pastor' &&
    auth.systemRole !== 'leader'
  ) {
    throw new ForbiddenError('Only leaders, pastors, or admins can perform this action');
  }
}

/** Resolve the branch admins/pastors may target via query, else the caller's own. */
function resolveScopedBranchId(auth: AuthContext, branchId?: string): string {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') {
    return branchId ?? auth.branchId;
  }
  enforceBranchScope(auth, branchId);
  return auth.branchId;
}

/** Mint a prospect member shell (temp email + temp password), returning its id.
 *  Mirrors the convention in outreach/conversion-service.ts, plus memberType='prospect'. */
async function createProspectShell(
  db: Database,
  branchId: string,
  data: { firstName: string; lastName: string; phone: string; email?: string },
): Promise<string> {
  const bcrypt = await import('bcrypt');
  const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
  const email =
    data.email && data.email.trim().length > 0
      ? data.email
      : `prospect_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}@temp.kairos.local`;

  const [newMember] = await db
    .insert(members)
    .values({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      email,
      homeBranchId: branchId,
      membershipDate: sql`CURRENT_DATE`,
      emailVerified: false,
      approvalStatus: 'approved',
      systemRole: 'member',
      memberType: 'prospect',
      isActive: true,
      mustChangePassword: true,
      passwordHash: tempPasswordHash,
    })
    .returning();

  return newMember!.id;
}

/** Find the linked member's active enrollment, or create one via the shared helper.
 *  Returns the enrollment id. Idempotent — never duplicates. */
async function ensureEnrollment(
  db: Database,
  memberId: string,
  branchId: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: newBelieverEnrollments.id })
    .from(newBelieverEnrollments)
    .where(
      and(
        eq(newBelieverEnrollments.memberId, memberId),
        eq(newBelieverEnrollments.branchId, branchId),
        eq(newBelieverEnrollments.isActive, true),
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  // The altar-call flow is open to any member and already branch-scoped at the submission
  // boundary, so it calls the gate-free enrollment core directly rather than the
  // admin/pastor-gated public createEnrollment.
  const enrollment = await createEnrollmentInternal(db, { memberId, branchId });
  return enrollment.id;
}

// ── Submit ─────────────────────────────────────────────────

export async function submitForm(
  db: Database,
  auth: AuthContext,
  formType: string,
  body: { subjectMemberId?: string; branchId?: string; payload: Record<string, unknown> },
) {
  const schema = payloadSchemaByFormType[formType as keyof typeof payloadSchemaByFormType];
  if (!schema) throw new NotFoundError('Form type');

  const parsed = schema.safeParse(body.payload);
  if (!parsed.success) {
    // Prefix the failing field so the message is actionable ("phone: Required")
    // rather than a bare "Required". Preserves Zod's own message (incl. the
    // helpful enum lists) and just names the offending field.
    const issue = parsed.error.errors[0];
    const field = issue?.path.join('.');
    throw new ValidationError(
      field ? `${field}: ${issue!.message}` : (issue?.message ?? 'Invalid form payload'),
    );
  }
  const payload = parsed.data;

  // branchId is always forced to the caller's branch — client value is ignored.
  const branchId = auth.branchId;

  if (formType !== 'altar_call') {
    const [row] = await db
      .insert(formSubmissions)
      .values({
        formType,
        branchId,
        submittedBy: auth.memberId,
        subjectMemberId: null,
        payload,
        status: 'new',
        linkedEntityType: null,
        linkedEntityId: null,
      })
      .returning();
    return row!;
  }

  // ── altar_call: create-or-link shell + ensure enrollment ──
  const ac = payload as { firstName: string; lastName: string; phone: string };
  let subjectMemberId: string;

  if (body.subjectMemberId) {
    // (a) explicit selection — verify it exists and is in the caller's branch
    const [subject] = await db
      .select({ id: members.id, branchId: members.homeBranchId })
      .from(members)
      .where(eq(members.id, body.subjectMemberId))
      .limit(1);
    if (!subject) throw new NotFoundError('Member');
    if (subject.branchId !== branchId) {
      throw new ForbiddenError('You can only link to members in your branch');
    }
    subjectMemberId = subject.id;
  } else {
    // (b) phone safety-net — active member in branch with exact phone match
    const [byPhone] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true),
          eq(members.phone, ac.phone),
        ),
      )
      .limit(1);

    if (byPhone) {
      subjectMemberId = byPhone.id;
    } else {
      // (c) The phone unique index (idx_members_phone_active) is GLOBAL across branches,
      //     so before minting a shell, check whether an active member elsewhere already
      //     owns this phone — otherwise the INSERT would hit the constraint as a raw 500.
      const [phoneOwner] = await db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.isActive, true), eq(members.phone, ac.phone)))
        .limit(1);
      if (phoneOwner) {
        throw new ConflictError(
          'A member with this phone number already exists in another branch. Link them via search, or use different contact details.',
        );
      }
      // (d) create a new prospect shell
      subjectMemberId = await createProspectShell(db, branchId, {
        firstName: ac.firstName,
        lastName: ac.lastName,
        phone: ac.phone,
      });
    }
  }

  // (d) ensure an enrollment (reuse if one already exists)
  const enrollmentId = await ensureEnrollment(db, subjectMemberId, branchId);

  // (e) record the submission, linked + converted
  const [row] = await db
    .insert(formSubmissions)
    .values({
      formType,
      branchId,
      submittedBy: auth.memberId,
      subjectMemberId,
      payload,
      status: 'converted',
      linkedEntityType: 'new_believer_enrollment',
      linkedEntityId: enrollmentId,
    })
    .returning();
  return row!;
}

// ── Member typeahead search ────────────────────────────────

export async function searchMembers(
  db: Database,
  auth: AuthContext,
  query: MemberSearchQuery,
) {
  const branchId = resolveScopedBranchId(auth, query.branchId);
  const term = `%${query.q}%`;

  return db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      phone: members.phone,
      memberType: members.memberType,
    })
    .from(members)
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.isActive, true),
        or(
          ilike(members.firstName, term),
          ilike(members.lastName, term),
          ilike(sql`${members.firstName} || ' ' || ${members.lastName}`, term),
          ilike(members.phone, term),
        ),
      ),
    )
    .orderBy(members.lastName, members.firstName)
    .limit(MEMBER_SEARCH_LIMIT);
}

// ── Submissions: list / get / update ───────────────────────

function submissionFilters(branchId: string, query: ListSubmissionsQuery | ExportSubmissionsQuery) {
  const conditions = [eq(formSubmissions.branchId, branchId)];
  if (query.formType) conditions.push(eq(formSubmissions.formType, query.formType));
  if (query.status) conditions.push(eq(formSubmissions.status, query.status));
  if (query.from) conditions.push(sql`${formSubmissions.createdAt} >= ${query.from}`);
  if (query.to) conditions.push(sql`${formSubmissions.createdAt} <= ${query.to}`);
  return conditions;
}

export async function listSubmissions(
  db: Database,
  auth: AuthContext,
  query: ListSubmissionsQuery,
) {
  enforceLeaderOrAbove(auth);
  const branchId = resolveScopedBranchId(auth, query.branchId);

  return db
    .select({
      id: formSubmissions.id,
      formType: formSubmissions.formType,
      branchId: formSubmissions.branchId,
      submittedBy: formSubmissions.submittedBy,
      subjectMemberId: formSubmissions.subjectMemberId,
      payload: formSubmissions.payload,
      status: formSubmissions.status,
      linkedEntityType: formSubmissions.linkedEntityType,
      linkedEntityId: formSubmissions.linkedEntityId,
      notes: formSubmissions.notes,
      createdAt: formSubmissions.createdAt,
      updatedAt: formSubmissions.updatedAt,
    })
    .from(formSubmissions)
    .where(and(...submissionFilters(branchId, query)))
    .orderBy(desc(formSubmissions.createdAt));
}

export async function getSubmission(db: Database, auth: AuthContext, id: string) {
  enforceLeaderOrAbove(auth);
  const [row] = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Form submission');
  enforceBranchScope(auth, row.branchId);
  return row;
}

export async function updateSubmission(
  db: Database,
  auth: AuthContext,
  id: string,
  data: UpdateSubmissionInput,
) {
  enforceLeaderOrAbove(auth);
  const [existing] = await db
    .select({ branchId: formSubmissions.branchId })
    .from(formSubmissions)
    .where(eq(formSubmissions.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Form submission');
  enforceBranchScope(auth, existing.branchId);

  const updateValues: Record<string, unknown> = { updatedAt: sql`NOW()` };
  if (data.status !== undefined) updateValues.status = data.status;
  if (data.notes !== undefined) updateValues.notes = data.notes;

  const [updated] = await db
    .update(formSubmissions)
    .set(updateValues)
    .where(eq(formSubmissions.id, id))
    .returning();
  return updated!;
}

// ── CSV export (per-formType column projection) ────────────

/** Payload columns projected per formType — keeps CSV columns well-defined. */
const EXPORT_COLUMNS: Record<string, string[]> = {
  altar_call: ['todaysDate', 'firstName', 'lastName', 'phone'],
  baptism: ['firstName', 'lastName', 'phone'],
  testimony: [
    'firstName',
    'lastName',
    'phone',
    'todaysDate',
    'dateOfTestimony',
    'category',
    'details',
    'shareAnonymously',
    'happyToShareSunday',
    'acknowledged',
  ],
  baby_naming: [
    'babyFullName',
    'dateOfBirth',
    'gender',
    'fathersName',
    'mothersName',
    'parentContactPhone',
    'parentContactEmail',
    'preferredCeremonyDate',
    'additionalNotes',
  ],
  baby_dedication: [
    'babyFullName',
    'dateOfBirth',
    'gender',
    'fathersName',
    'mothersName',
    'parentContactPhone',
    'parentsAreMembers',
    'parentContactEmail',
    'preferredDedicationDate',
    'additionalNotes',
  ],
};

function escapeCSV(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function exportSubmissionsToCSV(
  db: Database,
  auth: AuthContext,
  query: ExportSubmissionsQuery,
): Promise<string> {
  enforceLeaderOrAbove(auth);
  const branchId = resolveScopedBranchId(auth, query.branchId);

  const payloadColumns = EXPORT_COLUMNS[query.formType] ?? [];

  const rows = await db
    .select({
      id: formSubmissions.id,
      formType: formSubmissions.formType,
      status: formSubmissions.status,
      createdAt: formSubmissions.createdAt,
      payload: formSubmissions.payload,
    })
    .from(formSubmissions)
    .where(and(...submissionFilters(branchId, query)))
    .orderBy(desc(formSubmissions.createdAt));

  const headers = ['id', 'formType', 'status', 'createdAt', ...payloadColumns];
  const lines = [headers.join(',')];

  for (const row of rows as Array<{
    id: string;
    formType: string;
    status: string;
    createdAt: Date | string;
    payload: Record<string, unknown>;
  }>) {
    const createdAt =
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
    const base = [row.id, row.formType, row.status, createdAt];
    // Honor testimony anonymity — match the review drawer, which redacts the
    // submitter's identity when shareAnonymously is set.
    const anonymise =
      row.formType === 'testimony' && row.payload?.shareAnonymously === true;
    const REDACTED = new Set(['firstName', 'lastName', 'phone']);
    const projected = payloadColumns.map((col) =>
      anonymise && REDACTED.has(col) ? '(anonymous)' : row.payload?.[col],
    );
    lines.push([...base, ...projected].map(escapeCSV).join(','));
  }

  return lines.join('\n');
}

// ── Dormant prospect lifecycle ─────────────────────────────

export async function listDormantProspects(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string },
) {
  enforceLeaderOrAbove(auth);
  const branchId = resolveScopedBranchId(auth, query.branchId);

  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      phone: members.phone,
      createdAt: members.createdAt,
      enrollmentCount: sql<number>`(
        SELECT COUNT(*) FROM new_believer_enrollments e
        WHERE e.member_id = ${members.id} AND e.is_active = true
      )`,
    })
    .from(members)
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.memberType, 'prospect'),
        eq(members.isActive, true),
        sql`${members.createdAt} < NOW() - INTERVAL '${sql.raw(String(DORMANT_PROSPECT_DAYS))} days'`,
      ),
    )
    .orderBy(members.createdAt);

  return (rows as Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    createdAt: Date | string;
    enrollmentCount: number | string;
  }>).map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    hasEnrollment: Number(r.enrollmentCount ?? 0) > 0,
  }));
}

export async function archiveProspects(
  db: Database,
  auth: AuthContext,
  data: ArchiveProspectsInput,
) {
  enforceLeaderOrAbove(auth);

  const rows = await db
    .select({
      id: members.id,
      memberType: members.memberType,
      homeBranchId: members.homeBranchId,
    })
    .from(members)
    .where(inArray(members.id, data.memberIds));

  const found = new Set((rows as Array<{ id: string }>).map((r) => r.id));
  for (const id of data.memberIds) {
    if (!found.has(id)) throw new NotFoundError('Member');
  }

  for (const row of rows as Array<{ id: string; memberType: string; homeBranchId: string }>) {
    if (row.memberType !== 'prospect') {
      throw new ForbiddenError('Only prospect members can be archived');
    }
    enforceBranchScope(auth, row.homeBranchId);
  }

  await db
    .update(members)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(inArray(members.id, data.memberIds));

  return { archived: data.memberIds.length };
}
