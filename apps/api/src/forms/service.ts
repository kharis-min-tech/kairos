import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { authHasCapability } from '../lib/grants';
import {
  formSubmissions,
  members,
  newBelieverEnrollments,
  branchDepartments,
  departments,
  departmentMembers,
  branches,
} from '@kairos/database';
import type { AuthContext, FormType } from '@kairos/types';
import { FormType as FormTypeEnum } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@kairos/utils';
import { createEnrollmentInternal } from '../new-believers/service';
import { createMemberShell } from '../lib/member-shell';
import {
  payloadSchemaByFormType,
  isVisitorUnder16,
  type ListSubmissionsQuery,
  type UpdateSubmissionInput,
  type ExportSubmissionsQuery,
  type MemberSearchQuery,
  type ArchiveAttendeesInput,
  type FirstTimeVisitorPayload,
  type BaptismPayload,
  type TestimonyPayload,
  type BabyPayload,
} from './schemas';

// ── Constants ──────────────────────────────────────────────

/** Attendee shells older than this with no engagement are eligible for manual archive. */
export const DORMANT_ATTENDEE_DAYS = 30;

/** Visitor shells older than this with no engagement are eligible for manual archive.
 *  Same threshold as attendees because both cohorts are cleaned up by the same
 *  Admin-dept surface; if the visitor stuck around they'd have been promoted to
 *  attendee by the Phase D cron already. */
export const DORMANT_VISITOR_DAYS = 30;

const MEMBER_SEARCH_LIMIT = 10;

// ── Helpers ────────────────────────────────────────────────

/** Admin/pastor bypass; everyone else must match their own branch. */
function enforceBranchScope(auth: AuthContext, branchId?: string) {
  if (auth.systemRole === 'admin') return;
  if (branchId && branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access forms data for your branch');
  }
}

// ── Persona-scope helpers (Phase 1: per-form visibility matrix) ──

/** Whether the caller is an active member of the seeded "Admin" branch_department in branchId. */
async function isInAdminDepartment(
  db: Database,
  memberId: string,
  branchId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .innerJoin(branchDepartments, eq(departmentMembers.branchDepartmentId, branchDepartments.id))
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .where(
      and(
        eq(departmentMembers.memberId, memberId),
        eq(departmentMembers.isActive, true),
        eq(branchDepartments.branchId, branchId),
        eq(branchDepartments.isActive, true),
        eq(departments.departmentName, 'Admin'),
      ),
    )
    .limit(1);
  return !!row;
}

/** Whether the caller is the lead or deputy of the seeded "Admin" branch_department in branchId. */
async function isAdminDeptLeader(
  db: Database,
  memberId: string,
  branchId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: branchDepartments.id })
    .from(branchDepartments)
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .where(
      and(
        eq(branchDepartments.branchId, branchId),
        eq(branchDepartments.isActive, true),
        eq(departments.departmentName, 'Admin'),
        or(
          eq(branchDepartments.leadMemberId, memberId),
          eq(branchDepartments.deputyMemberId, memberId),
        ),
      ),
    )
    .limit(1);
  return !!row;
}

/** Whether the caller is the lead or deputy of the seeded "New Believers" branch_department in branchId. */
async function isNewBelieversDeptLeader(
  db: Database,
  memberId: string,
  branchId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: branchDepartments.id })
    .from(branchDepartments)
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .where(
      and(
        eq(branchDepartments.branchId, branchId),
        eq(branchDepartments.isActive, true),
        eq(departments.departmentName, 'New Believers'),
        or(
          eq(branchDepartments.leadMemberId, memberId),
          eq(branchDepartments.deputyMemberId, memberId),
        ),
      ),
    )
    .limit(1);
  return !!row;
}

/** Form types reviewable by the "front-desk + discipleship" cluster. */
const FRONT_DESK_FORMS: FormType[] = [
  FormTypeEnum.AltarCall,
  FormTypeEnum.FirstTimeVisitor,
  FormTypeEnum.Baptism,
];

/** Form types reviewable only by Admin-dept leader, pastor, or admin. */
const PASTOR_ONLY_FORMS: FormType[] = [
  FormTypeEnum.BabyNaming,
  FormTypeEnum.BabyDedication,
  FormTypeEnum.Testimony,
];

const ALL_FORM_TYPES: FormType[] = [...FRONT_DESK_FORMS, ...PASTOR_ONLY_FORMS];

/**
 * Returns the set of form types the caller can READ in `branchId`.
 *
 *   - admin: all types in any branch (caller passes the target branchId via the query)
 *   - pastor: all types in their own branch
 *   - admin-dept leader/deputy in branchId: all types (branch-superuser for forms)
 *   - admin-dept member in branchId: FRONT_DESK_FORMS only
 *   - NB-dept lead/deputy in branchId: FRONT_DESK_FORMS only
 *   - everyone else: empty
 */
async function getVisibleFormTypes(
  db: Database,
  auth: AuthContext,
  branchId: string,
): Promise<FormType[]> {
  if (auth.systemRole === 'admin') return ALL_FORM_TYPES;
  // RBAC Phase 4b: branch-tier admins (BSA/BDA) — only their own branch.
  if (authHasCapability(auth, 'branch:read', { kind: 'branch', id: branchId })) {
    return ALL_FORM_TYPES;
  }
  // Anything else: must match caller's branch
  if (!auth.branchId || branchId !== auth.branchId) return [];
  if (await isAdminDeptLeader(db, auth.memberId, branchId)) return ALL_FORM_TYPES;
  if (await isInAdminDepartment(db, auth.memberId, branchId)) return [...FRONT_DESK_FORMS];
  if (await isNewBelieversDeptLeader(db, auth.memberId, branchId)) return [...FRONT_DESK_FORMS];
  return [];
}

/** Attendees (dormant-shell cleanup) → admin-dept leader + pastor + admin only. */
async function canSeeAttendees(
  db: Database,
  auth: AuthContext,
  branchId: string,
): Promise<boolean> {
  if (auth.systemRole === 'admin') return true;
  if (authHasCapability(auth, 'branch:read', { kind: 'branch', id: branchId })) return true;
  if (!auth.branchId || branchId !== auth.branchId) return false;
  return isAdminDeptLeader(db, auth.memberId, branchId);
}

/** Resolve the branch admins/pastors may target via query, else the caller's own. */
function resolveScopedBranchId(auth: AuthContext, branchId?: string): string {
  if (authHasCapability(auth, 'branch:read')) {
    return branchId ?? auth.branchId;
  }
  enforceBranchScope(auth, branchId);
  return auth.branchId;
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
      memberType: 'attendee' | 'visitor' | 'child';
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

/**
 * Phase 2 consent envelope. The Zod `submitFormSchema` enforces these as REQUIRED
 * fields at the route boundary — production callers always send them. The service
 * accepts them as optional only so that the existing unit tests (which submit
 * raw bodies without consent) keep compiling; a missing envelope at runtime falls
 * back to "consent at the moment of submission, current policy version".
 */
interface ConsentEnvelope {
  consentGivenAt?: string;
  consentPolicyVersion?: string;
}

const DEFAULT_CONSENT_POLICY_VERSION = '2026-06-v1';

/** Builds the 3 consent columns to merge into every form_submissions insert. */
function consentFields(auth: AuthContext, body: ConsentEnvelope) {
  return {
    consentGivenAt: body.consentGivenAt ? new Date(body.consentGivenAt) : new Date(),
    consentBy: auth.memberId,
    consentPolicyVersion: body.consentPolicyVersion ?? DEFAULT_CONSENT_POLICY_VERSION,
  };
}

export async function submitForm(
  db: Database,
  auth: AuthContext,
  formType: string,
  body: {
    subjectMemberId?: string;
    branchId?: string;
    payload: Record<string, unknown>;
    consentGivenAt?: string;
    consentPolicyVersion?: string;
  },
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

  // Phase 3 — admin + pastor can capture for any branch via body.branchId;
  // everyone else is pinned to their own branch (body value is ignored).
  const isCrossBranchCapable = authHasCapability(auth, 'branch:read');
  const branchId =
    isCrossBranchCapable && body.branchId ? body.branchId : auth.branchId;
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
    // ── altar_call: match-or-mint an attendee, then ensure enrollment ──
    const ac = payload as { firstName: string; lastName: string; phone: string };
    const subjectMemberId = await resolveOrMintSubject(db, auth, branchId, {
      explicitSubjectMemberId: body.subjectMemberId,
      firstName: ac.firstName,
      lastName: ac.lastName,
      phone: ac.phone,
      onNoMatch: { mode: 'mint', memberType: 'attendee' },
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
        ...consentFields(auth, body),
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
      ...consentFields(auth, body),
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
  body: { subjectMemberId?: string } & ConsentEnvelope,
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
      ...consentFields(auth, body),
    })
    .returning();
  return row!;
}

// ── Baptism / testimony / baby: shared insert ──────────────

/** Insert a non-converting submission, deriving the linked-entity columns from
 *  whether a subject was resolved. Used by the link/match forms. */
async function insertFormSubmission(
  db: Database,
  auth: AuthContext,
  body: ConsentEnvelope,
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
      ...consentFields(auth, body),
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

// ── Baptism: match an existing member, else mint an attendee shell ──
async function submitBaptism(
  db: Database,
  auth: AuthContext,
  branchId: string,
  body: { subjectMemberId?: string } & ConsentEnvelope,
  payload: BaptismPayload,
) {
  const subjectMemberId = await resolveOrMintSubject(db, auth, branchId, {
    explicitSubjectMemberId: body.subjectMemberId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    onNoMatch: { mode: 'mint', memberType: 'attendee' },
  });
  return insertFormSubmission(db, auth, body, {
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
  body: { subjectMemberId?: string } & ConsentEnvelope,
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
  return insertFormSubmission(db, auth, body, {
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
  body: { subjectMemberId?: string } & ConsentEnvelope,
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
      ...consentFields(auth, body),
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

// ── Caller capabilities (drives /forms UI gating) ─────────

/**
 * Returns what form-review surfaces the caller can use in their own branch.
 * Admin sees all types regardless of branch; others see the per-form matrix
 * scoped to `auth.branchId`.
 */
export async function getMyFormsCapabilities(db: Database, auth: AuthContext) {
  const branchId = auth.branchId;
  if (!branchId && auth.systemRole !== 'admin') {
    return { visibleFormTypes: [] as FormType[], canSeeAttendees: false };
  }
  const targetBranchId = branchId ?? '';
  // Admin without a branchId is the cross-branch superuser — visible set is all.
  const visibleFormTypes = auth.systemRole === 'admin'
    ? ALL_FORM_TYPES
    : await getVisibleFormTypes(db, auth, targetBranchId);
  const canSeeAttendeesResult = auth.systemRole === 'admin'
    ? true
    : await canSeeAttendees(db, auth, targetBranchId);
  return { visibleFormTypes, canSeeAttendees: canSeeAttendeesResult };
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
  const branchId = resolveScopedBranchId(auth, query.branchId);
  const visible = await getVisibleFormTypes(db, auth, branchId);
  if (visible.length === 0) return [];

  // If the caller filtered by formType, enforce that it's within their visible set.
  if (query.formType && !visible.includes(query.formType as FormType)) {
    return [];
  }

  const conditions = submissionFilters(branchId, query);
  // Hard-restrict to the caller's visible set (in addition to any explicit formType filter).
  conditions.push(inArray(formSubmissions.formType, visible));

  return db
    .select({
      id: formSubmissions.id,
      formType: formSubmissions.formType,
      branchId: formSubmissions.branchId,
      branchName: branches.branchName,
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
    .innerJoin(branches, eq(formSubmissions.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(formSubmissions.createdAt));
}

export async function getSubmission(db: Database, auth: AuthContext, id: string) {
  const [row] = await db
    .select({
      id: formSubmissions.id,
      formType: formSubmissions.formType,
      branchId: formSubmissions.branchId,
      branchName: branches.branchName,
      submittedBy: formSubmissions.submittedBy,
      subjectMemberId: formSubmissions.subjectMemberId,
      payload: formSubmissions.payload,
      status: formSubmissions.status,
      linkedEntityType: formSubmissions.linkedEntityType,
      linkedEntityId: formSubmissions.linkedEntityId,
      notes: formSubmissions.notes,
      consentGivenAt: formSubmissions.consentGivenAt,
      consentBy: formSubmissions.consentBy,
      consentPolicyVersion: formSubmissions.consentPolicyVersion,
      createdAt: formSubmissions.createdAt,
      updatedAt: formSubmissions.updatedAt,
    })
    .from(formSubmissions)
    .innerJoin(branches, eq(formSubmissions.branchId, branches.id))
    .where(eq(formSubmissions.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Form submission');
  enforceBranchScope(auth, row.branchId);

  const visible = await getVisibleFormTypes(db, auth, row.branchId);
  if (!visible.includes(row.formType as FormType)) {
    throw new ForbiddenError('You do not have access to this form submission');
  }
  return row;
}

export async function updateSubmission(
  db: Database,
  auth: AuthContext,
  id: string,
  data: UpdateSubmissionInput,
) {
  const [existing] = await db
    .select({ branchId: formSubmissions.branchId, formType: formSubmissions.formType })
    .from(formSubmissions)
    .where(eq(formSubmissions.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Form submission');
  enforceBranchScope(auth, existing.branchId);

  const visible = await getVisibleFormTypes(db, auth, existing.branchId);
  if (!visible.includes(existing.formType as FormType)) {
    throw new ForbiddenError('You do not have access to this form submission');
  }

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
  const branchId = resolveScopedBranchId(auth, query.branchId);
  const visible = await getVisibleFormTypes(db, auth, branchId);
  if (!visible.includes(query.formType as FormType)) {
    throw new ForbiddenError('You do not have access to export this form type');
  }

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

// ── Dormant attendee lifecycle ─────────────────────────────

export async function listDormantAttendees(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string },
) {
  const branchId = resolveScopedBranchId(auth, query.branchId);
  if (!(await canSeeAttendees(db, auth, branchId))) {
    throw new ForbiddenError('Only the Admin-dept leader, pastor, or admin can view attendees');
  }

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
        eq(members.memberType, 'attendee'),
        eq(members.isActive, true),
        sql`${members.createdAt} < NOW() - INTERVAL '${sql.raw(String(DORMANT_ATTENDEE_DAYS))} days'`,
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

// ── Dormant visitor lifecycle ──────────────────────────────
//
// Mirrors the attendee dormant flow but keyed on memberType='visitor'.
// Visitors that engage (attend services regularly) are promoted to attendee
// by the Phase D cron; what's left in this list is stale first-time-visitor
// shells with no follow-up engagement.

export async function listDormantVisitors(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string },
) {
  const branchId = resolveScopedBranchId(auth, query.branchId);
  if (!(await canSeeAttendees(db, auth, branchId))) {
    throw new ForbiddenError('Only the Admin-dept leader, pastor, or admin can view visitors');
  }

  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      phone: members.phone,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.memberType, 'visitor'),
        eq(members.isActive, true),
        sql`${members.createdAt} < NOW() - INTERVAL '${sql.raw(String(DORMANT_VISITOR_DAYS))} days'`,
      ),
    )
    .orderBy(members.createdAt);

  return (rows as Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    createdAt: Date | string;
  }>).map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));
}

export async function archiveVisitors(
  db: Database,
  auth: AuthContext,
  data: ArchiveAttendeesInput,
) {
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
    if (row.memberType !== 'visitor') {
      throw new ForbiddenError('Only visitor members can be archived through this endpoint');
    }
    enforceBranchScope(auth, row.homeBranchId);
    if (!(await canSeeAttendees(db, auth, row.homeBranchId))) {
      throw new ForbiddenError('Only the Admin-dept leader, pastor, or admin can archive visitors');
    }
  }

  await db
    .update(members)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(inArray(members.id, data.memberIds));

  return { archived: data.memberIds.length };
}

export async function archiveAttendees(
  db: Database,
  auth: AuthContext,
  data: ArchiveAttendeesInput,
) {
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
    if (row.memberType !== 'attendee') {
      throw new ForbiddenError('Only attendee members can be archived');
    }
    enforceBranchScope(auth, row.homeBranchId);
    if (!(await canSeeAttendees(db, auth, row.homeBranchId))) {
      throw new ForbiddenError('Only the Admin-dept leader, pastor, or admin can archive attendees');
    }
  }

  await db
    .update(members)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(inArray(members.id, data.memberIds));

  return { archived: data.memberIds.length };
}
