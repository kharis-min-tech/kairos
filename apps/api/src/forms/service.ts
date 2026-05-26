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
  isVisitorUnder16,
  type ListSubmissionsQuery,
  type UpdateSubmissionInput,
  type ExportSubmissionsQuery,
  type MemberSearchQuery,
  type ArchiveProspectsInput,
  type FirstTimeVisitorPayload,
  type BaptismPayload,
  type TestimonyPayload,
  type BabyPayload,
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

/** Mint a member shell (temp email + temp password), returning its id.
 *  Mirrors the convention in outreach/conversion-service.ts. `memberType` lets
 *  the caller mint a prospect (altar-call), a visitor or a child (first-time
 *  visitor). `guardianMemberId` links a child shell to its guardian. */
async function createMemberShell(
  db: Database,
  branchId: string,
  data: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string;
    middleName?: string | null;
    dateOfBirth?: string | null;
    gender?: 'Male' | 'Female' | null;
    memberType: 'prospect' | 'visitor' | 'child';
    guardianMemberId?: string | null;
  },
): Promise<string> {
  const bcrypt = await import('bcrypt');
  const { randomUUID } = await import('node:crypto');
  const tempPassword = `temp_${randomUUID()}`;
  const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
  // randomUUID guarantees uniqueness even when several shells (guardian + children)
  // are minted in the same tick, where Date.now() alone would collide on the
  // global-unique members.email constraint.
  const email =
    data.email && data.email.trim().length > 0
      ? data.email
      : `${data.memberType}_${randomUUID()}@temp.kairos.local`;

  const [newMember] = await db
    .insert(members)
    .values({
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      gender: data.gender ?? null,
      phone: data.phone ?? null,
      email,
      homeBranchId: branchId,
      membershipDate: sql`CURRENT_DATE`,
      emailVerified: false,
      approvalStatus: 'approved',
      systemRole: 'member',
      memberType: data.memberType,
      guardianMemberId: data.guardianMemberId ?? null,
      isActive: true,
      mustChangePassword: true,
      passwordHash: tempPasswordHash,
    })
    .returning();

  return newMember!.id;
}

/**
 * Shared subject-resolution pattern used by every matching form. Captures the
 * common ladder that altar_call and first_time_visitor independently grew:
 *
 *   1. explicit `explicitSubjectMemberId` → verify it's a member in this branch
 *      (NotFound if missing, Forbidden if cross-branch); return its id.
 *   2. else if `phone` is present → exact match against an ACTIVE in-branch
 *      member; return its id.
 *   3. else apply `onNoMatch`:
 *        - `{ mode: 'mint', memberType, ... }` runs the GLOBAL-phone ConflictError
 *          guard (the phone unique index is cross-branch) then mints a shell and
 *          returns the new id.
 *        - `{ mode: 'linkOnly' }` returns null (match-or-nothing; never mints).
 *
 * The query ORDER here (explicit-subject OR (in-branch phone → global phone))
 * mirrors the original inline blocks exactly so the mocked-Drizzle select
 * sequences in the existing tests stay valid.
 */
type OnNoMatch =
  | {
      mode: 'mint';
      memberType: 'prospect' | 'visitor' | 'child';
      middleName?: string | null;
      dateOfBirth?: string | null;
      gender?: 'Male' | 'Female' | null;
      email?: string;
      guardianMemberId?: string | null;
    }
  | { mode: 'linkOnly' };

async function resolveOrMintSubject(
  db: Database,
  _auth: AuthContext,
  branchId: string,
  opts: {
    explicitSubjectMemberId?: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    onNoMatch: OnNoMatch;
  },
): Promise<string | null> {
  // (1) explicit selection — verify it exists and is in the caller's branch
  if (opts.explicitSubjectMemberId) {
    const [subject] = await db
      .select({ id: members.id, branchId: members.homeBranchId })
      .from(members)
      .where(eq(members.id, opts.explicitSubjectMemberId))
      .limit(1);
    if (!subject) throw new NotFoundError('Member');
    if (subject.branchId !== branchId) {
      throw new ForbiddenError('You can only link to members in your branch');
    }
    return subject.id;
  }

  const phone = opts.phone?.trim();

  // (2) phone safety-net — active member in branch with exact phone match
  if (phone && phone.length > 0) {
    const [byPhone] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true),
          eq(members.phone, phone),
        ),
      )
      .limit(1);
    if (byPhone) return byPhone.id;
  }

  // (3) no match — apply the caller's policy
  if (opts.onNoMatch.mode === 'linkOnly') return null;

  // mint mode: the phone unique index (idx_members_phone_active) is GLOBAL across
  // branches, so before minting a shell, check whether an active member elsewhere
  // already owns this phone — otherwise the INSERT would hit the constraint as a
  // raw 500. Only meaningful when a phone is actually supplied.
  if (phone && phone.length > 0) {
    const [phoneOwner] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.isActive, true), eq(members.phone, phone)))
      .limit(1);
    if (phoneOwner) {
      throw new ConflictError(
        'A member with this phone number already exists in another branch. Link them via search, or use different contact details.',
      );
    }
  }

  return createMemberShell(db, branchId, {
    firstName: opts.firstName,
    lastName: opts.lastName,
    phone: phone && phone.length > 0 ? phone : null,
    email: opts.onNoMatch.email,
    middleName: opts.onNoMatch.middleName ?? null,
    dateOfBirth: opts.onNoMatch.dateOfBirth ?? null,
    gender: opts.onNoMatch.gender ?? null,
    memberType: opts.onNoMatch.memberType,
    guardianMemberId: opts.onNoMatch.guardianMemberId ?? null,
  });
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
  enforceBranchScope(auth, branchId);

  // Per-form matching policies. Each resolves a subject via the shared
  // `resolveOrMintSubject` ladder, varying only in the no-match policy.
  if (formType === 'first_time_visitor') {
    return submitFirstTimeVisitor(db, auth, branchId, body, payload as FirstTimeVisitorPayload);
  }
  if (formType === 'baptism') {
    return submitBaptism(db, auth, branchId, body, payload as BaptismPayload);
  }
  if (formType === 'testimony') {
    return submitTestimony(db, auth, branchId, body, payload as TestimonyPayload);
  }
  if (formType === 'baby_naming' || formType === 'baby_dedication') {
    return submitBabyForm(db, auth, branchId, formType, body, payload as BabyPayload);
  }

  if (formType === 'altar_call') {
    // ── altar_call: match-or-mint a prospect, then ensure enrollment ──
    const ac = payload as { firstName: string; lastName: string; phone: string };
    const subjectMemberId = await resolveOrMintSubject(db, auth, branchId, {
      explicitSubjectMemberId: body.subjectMemberId,
      firstName: ac.firstName,
      lastName: ac.lastName,
      phone: ac.phone,
      onNoMatch: { mode: 'mint', memberType: 'prospect' },
    });
    // mint mode always yields an id (match, or a freshly minted shell).
    const enrollmentId = await ensureEnrollment(db, subjectMemberId!, branchId);
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

  // Generic fallback — store-only for any future form without a matching policy.
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

// ── First-time visitor: create-or-link shell + child shells ──
// `FirstTimeVisitorPayload` is derived from the Zod schema (z.infer) in schemas.ts
// so the service can't drift from validation.

/**
 * First-time-visitor submission. Mirrors the altar_call shell pattern (match an
 * existing member by name+phone, else mint a shell) but WITHOUT new-believer
 * enrollment — there is no decision-for-Christ branch here. The subject shell is
 * a `child` when the visitor is under 16, else a `visitor`. Each entry in the
 * `children` array becomes a `child` shell linked to the subject via
 * `guardianMemberId`. Interest/source live in the payload only (no auto join in
 * v1). Status stays `new` — never auto-converted.
 */
async function submitFirstTimeVisitor(
  db: Database,
  auth: AuthContext,
  branchId: string,
  body: { subjectMemberId?: string },
  payload: FirstTimeVisitorPayload,
) {
  const under16 = isVisitorUnder16(payload as Record<string, unknown>);
  let subjectMemberId: string | null = null;

  if (body.subjectMemberId) {
    // (a) explicit selection — must exist and be in the caller's branch
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
  } else if (payload.phone && payload.phone.trim().length > 0) {
    // (b) phone safety-net — active member in branch with exact phone match
    const [byPhone] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true),
          eq(members.phone, payload.phone),
        ),
      )
      .limit(1);

    if (byPhone) {
      subjectMemberId = byPhone.id;
    } else {
      // (c) phone unique index is GLOBAL — bail with a Conflict before the INSERT
      //     would hit the constraint as a raw 500.
      const [phoneOwner] = await db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.isActive, true), eq(members.phone, payload.phone)))
        .limit(1);
      if (phoneOwner) {
        throw new ConflictError(
          'A member with this phone number already exists in another branch. Link them via search, or use different contact details.',
        );
      }
    }
  }

  // (d) no match — mint the visitor/child shell
  if (!subjectMemberId) {
    subjectMemberId = await createMemberShell(db, branchId, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      middleName: payload.middleName ?? null,
      dateOfBirth: payload.dateOfBirth ?? null,
      gender: payload.gender ?? null,
      phone: payload.phone ?? null,
      email: payload.email,
      memberType: under16 ? 'child' : 'visitor',
    });
  }

  // (e) mint a child shell per entry, linked to the subject via guardianMemberId
  const childMemberIds: string[] = [];
  if (payload.broughtChildren === true && payload.children) {
    for (const child of payload.children) {
      const childId = await createMemberShell(db, branchId, {
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth ?? null,
        gender: child.gender ?? null,
        memberType: 'child',
        guardianMemberId: subjectMemberId,
      });
      childMemberIds.push(childId);
    }
  }

  // (f) record the submission — linked but NOT converted. Minted child ids are
  //     persisted on the payload so the triage drawer can surface them; the
  //     guardian link lives on members.guardianMemberId.
  const enrichedPayload = { ...payload, childMemberIds };

  const [row] = await db
    .insert(formSubmissions)
    .values({
      formType: 'first_time_visitor',
      branchId,
      submittedBy: auth.memberId,
      subjectMemberId,
      payload: enrichedPayload,
      status: 'new',
      linkedEntityType: 'member',
      linkedEntityId: subjectMemberId,
    })
    .returning();
  return row!;
}

// ── Baptism / testimony / baby: shared insert ──────────────

/** Insert a non-converting submission, deriving the linked-entity columns from
 *  whether a subject was resolved. Used by the link/match forms. */
async function insertFormSubmission(
  db: Database,
  data: {
    formType: string;
    branchId: string;
    submittedBy: string;
    subjectMemberId: string | null;
    payload: unknown;
  },
) {
  const [row] = await db
    .insert(formSubmissions)
    .values({
      formType: data.formType,
      branchId: data.branchId,
      submittedBy: data.submittedBy,
      subjectMemberId: data.subjectMemberId,
      payload: data.payload,
      status: 'new',
      linkedEntityType: data.subjectMemberId ? 'member' : null,
      linkedEntityId: data.subjectMemberId,
    })
    .returning();
  return row!;
}

/** Split a single full-name string into first/last for a child shell. The first
 *  whitespace-token is the first name, the remainder the last name (a lone token
 *  fills both). Clamped to the members.firstName/lastName varchar(100) limit. */
function splitFullName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? trimmed;
  const last = parts.length > 1 ? parts.slice(1).join(' ') : (parts[0] ?? trimmed);
  return { firstName: first.slice(0, 100), lastName: last.slice(0, 100) };
}

// ── Baptism: match an existing member, else mint a prospect shell ──
async function submitBaptism(
  db: Database,
  auth: AuthContext,
  branchId: string,
  body: { subjectMemberId?: string },
  payload: BaptismPayload,
) {
  const subjectMemberId = await resolveOrMintSubject(db, auth, branchId, {
    explicitSubjectMemberId: body.subjectMemberId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    onNoMatch: { mode: 'mint', memberType: 'prospect' },
  });
  return insertFormSubmission(db, {
    formType: 'baptism',
    branchId,
    submittedBy: auth.memberId,
    subjectMemberId,
    payload,
  });
}

// ── Testimony: link to an existing member only; never mint. Skip matching
//    entirely when the giver opts to share anonymously. ──
async function submitTestimony(
  db: Database,
  auth: AuthContext,
  branchId: string,
  body: { subjectMemberId?: string },
  payload: TestimonyPayload,
) {
  let subjectMemberId: string | null = null;
  if (!payload.shareAnonymously) {
    subjectMemberId = await resolveOrMintSubject(db, auth, branchId, {
      explicitSubjectMemberId: body.subjectMemberId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      onNoMatch: { mode: 'linkOnly' },
    });
  }
  return insertFormSubmission(db, {
    formType: 'testimony',
    branchId,
    submittedBy: auth.memberId,
    subjectMemberId,
    payload,
  });
}

// ── Baby naming / dedication: the subject is the baby, minted as a `child`
//    shell. An existing parent (explicit pick from the typeahead, else an
//    in-branch member matching parentContactPhone) is linked as the baby's
//    guardian. The parent is never minted — fathersName/mothersName don't split
//    cleanly into first/last, and the agreed policy is link-only for the parent.
async function submitBabyForm(
  db: Database,
  auth: AuthContext,
  branchId: string,
  formType: 'baby_naming' | 'baby_dedication',
  body: { subjectMemberId?: string },
  payload: BabyPayload,
) {
  let guardianMemberId: string | null = null;
  if (body.subjectMemberId) {
    const [parent] = await db
      .select({ id: members.id, branchId: members.homeBranchId })
      .from(members)
      .where(eq(members.id, body.subjectMemberId))
      .limit(1);
    if (!parent) throw new NotFoundError('Member');
    if (parent.branchId !== branchId) {
      throw new ForbiddenError('You can only link to members in your branch');
    }
    guardianMemberId = parent.id;
  } else if (payload.parentContactPhone && payload.parentContactPhone.trim().length > 0) {
    const [byPhone] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true),
          eq(members.phone, payload.parentContactPhone.trim()),
        ),
      )
      .limit(1);
    if (byPhone) guardianMemberId = byPhone.id;
  }

  const { firstName, lastName } = splitFullName(payload.babyFullName);
  const babyMemberId = await createMemberShell(db, branchId, {
    firstName,
    lastName,
    phone: null,
    dateOfBirth: payload.dateOfBirth ?? null,
    gender: payload.gender ?? null,
    memberType: 'child',
    guardianMemberId,
  });

  // The baby is the subject; the matched parent (if any) lives on members.guardianMemberId.
  const enrichedPayload = {
    ...payload,
    babyMemberId,
    ...(guardianMemberId ? { matchedGuardianMemberId: guardianMemberId } : {}),
  };

  const [row] = await db
    .insert(formSubmissions)
    .values({
      formType,
      branchId,
      submittedBy: auth.memberId,
      subjectMemberId: babyMemberId,
      payload: enrichedPayload,
      status: 'new',
      linkedEntityType: 'member',
      linkedEntityId: babyMemberId,
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
  first_time_visitor: [
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'email',
    'phone',
    'isUnder16',
    'guardianName',
    'guardianPhone',
    'broughtChildren',
    'childrenCount',
    'interest',
    'howDidYouHear',
    'invitedBy',
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
    const projected = payloadColumns.map((col) => {
      if (anonymise && REDACTED.has(col)) return '(anonymous)';
      // Derived column — the children array is flattened to a count rather
      // than dumped as JSON, keeping the CSV readable.
      if (col === 'childrenCount') {
        const kids = row.payload?.children;
        return Array.isArray(kids) ? kids.length : 0;
      }
      return row.payload?.[col];
    });
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
