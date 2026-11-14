import { eq, and, or, ilike, inArray, count, sql, exists, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '@kairos/database';
import { members, memberRoles, memberGuardians, roles, branches, fellowshipMembers, memberHealthRecords, newBelieverEnrollments, departmentMembers } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import type { SwitchActiveBranchResponse, MemberHealthRecord } from '@kairos/types';
import { isMinorMember, MINOR_AGE_THRESHOLD, CHURCH_SCOPE_ID, RoleScopeKind } from '@kairos/types';
import type { Capability } from '@kairos/types';
import { getActiveBranchId, generateTokenPair, revokeSessions } from '../auth/service';
import type { AuthSecrets } from '../lib/auth-secrets';
import { enforceScopeAllows } from '../lib/scope';
import { authHasAnyCapability, authHasCapability, DB_ROLE_NAME_TO_FUNCTIONAL } from '../lib/grants';
import { dispatchNotification } from '../notifications/service';
import { resolveBranchAuthority } from '../notifications/recipients';
import { recordAuditEvent, type RequestContext } from '../audit/service';
import { deleteStoredImage, type CfImagesConfig } from '../media/service';
import { linkGuardians } from '../lib/member-shell';
import { disableMfa, hasConfirmedFactor } from '../auth/mfa';
import { NotificationEventType, AuditAction, AuditOutcome } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  hashPassword,
  randomTokenHex,
  logger,
} from '@kairos/utils';
import { importMemberRowSchema } from './schemas';

function enforceMemberAccess(auth: AuthContext, memberId: string) {
  if (auth.systemRole === 'admin') return;
  // RBAC Phase 4b: branch-tier admins can read members in branches they admin.
  if (authHasCapability(auth, 'branch:read')) return;
  if (auth.memberId === memberId) return;
  throw new ForbiddenError('You can only access your own profile');
}

// ── Minor data protection ─────────────────────────────────

// Sensitive member fields that are nulled out when a minor record is redacted.
const REDACTABLE_FIELDS = [
  'dateOfBirth',
  'email',
  'phone',
  'address',
  'city',
  'postalCode',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship',
] as const;

/** Minimal member shape the safeguarding gate keys off. */
type SafeguardingSubject = {
  id: string;
  homeBranchId: string;
};

/**
 * Resolve, ONCE per request, the members this viewer is an active guardian of.
 *
 * Guardianship used to be a single column on the member row, so the list path
 * could read it straight off the row it had already selected. It is a join
 * table now (0056 — a child can have two parents and often a carer as well),
 * so the set is resolved up front: the alternative is a query per row.
 *
 * Only a platform admin short-circuits. This used to test `branch:read`
 * unscoped, which handed an EMPTY set to every branch admin on the reasoning
 * that they "see everything anyway" — true only while the gate below was
 * unscoped. Narrowing the gate made that false, and a branch admin would have
 * lost access to their OWN child's record.
 */
async function getViewerGuardedMemberIds(
  db: Database,
  auth: AuthContext,
): Promise<Set<string>> {
  if (auth.systemRole === 'admin') {
    return new Set();
  }
  const rows = await db
    .select({ memberId: memberGuardians.memberId })
    .from(memberGuardians)
    .where(
      and(
        eq(memberGuardians.guardianMemberId, auth.memberId),
        eq(memberGuardians.isActive, true),
      ),
    );
  return new Set(rows.map((r) => r.memberId));
}

/**
 * Safeguarding sight of one member: their health record, and their unredacted
 * personal fields.
 *
 * The surface is split, not the capability. Health records are safeguarding
 * data and need a safeguarding grant; the directory is branch administration
 * and needs a branch grant (see `hasDirectoryAccess`). One predicate used to
 * answer both with an UNSCOPED `branch:read`, which is true for any holder on
 * ANY branch — so a BranchAdmin or BranchDataAdmin of one branch could read
 * and write every child's health record in the church.
 *
 * Checking the capability rather than looking up a role name also fixes two
 * pre-existing lockouts for free. The old resolver matched
 * `roles.roleName = 'Safeguarding Lead'` exactly, so it missed:
 *  - SafeguardingHead, whose church grant carries `safeguarding:read` — a
 *    church grant satisfies a branch target (the matcher is asymmetric by
 *    design; the reverse never holds), so church-wide escalation now works;
 *  - the derived BranchPastor grant synthesised in `lib/grants.ts`, which
 *    carries `safeguarding:read` for the pastor's own branch.
 * Both are the people this data exists for, and neither could reach it.
 *
 * `cap` is `safeguarding:write` for the upsert path — the first place that
 * capability is enforced anywhere in the API.
 */
function hasHealthRecordAccess(
  auth: AuthContext,
  member: SafeguardingSubject,
  guardedMemberIds: Set<string>,
  cap: 'safeguarding:read' | 'safeguarding:write' = 'safeguarding:read',
): boolean {
  if (auth.systemRole === 'admin') return true;
  // ANY active guardian, not "the" guardian — that is the whole point of 0056.
  // Branch-independent on purpose: a guardian active in another branch must
  // still reach their own child.
  if (guardedMemberIds.has(member.id)) return true;
  return authHasCapability(auth, cap, { kind: 'branch', id: member.homeBranchId });
}

/**
 * Directory sight of one member: their row in the roll, and their unredacted
 * personal fields on the detail page.
 *
 * Safeguarding sight implies directory sight — anyone trusted with the health
 * record is trusted with the name and date of birth beside it.
 *
 * This keeps `branch:read`, scoped to the subject's branch, deliberately.
 * Editing a member is gated on `branch:write`, which both BranchAdmin and
 * BranchDataAdmin hold, and redaction nulls fields rather than hiding them: a
 * branch admin narrowed out of a child's record would open the edit form,
 * see dateOfBirth / phone / address as empty, press Save and blank the record.
 * A viewer who may write a field has to be able to read it.
 */
function hasDirectoryAccess(
  auth: AuthContext,
  member: SafeguardingSubject,
  guardedMemberIds: Set<string>,
): boolean {
  if (hasHealthRecordAccess(auth, member, guardedMemberIds)) return true;
  return authHasCapability(auth, 'branch:read', { kind: 'branch', id: member.homeBranchId });
}

/**
 * The capabilities that earn a FULL directory row.
 *
 * Every grant with a real reason to read the roll: branch admins and the
 * approval queue, fellowship and department leaders picking members into their
 * group, the membership-class programme, the new-believers team choosing a
 * mentor, and safeguarding. Mirrored in `apps/mobile/lib/capabilities.ts`,
 * which gates the dedicated leader-facing directory screen.
 */
const DIRECTORY_CAPABILITIES = [
  'branch:read',
  'signup:approve',
  'fellowship:read',
  'department:read',
  'membership:admin',
  'membership:branch:read',
  'newbelievers:mentor',
  'newbelievers:teach',
  'safeguarding:read',
] as const satisfies readonly Capability[];

/**
 * The only fields a caller without a directory capability receives.
 *
 * An allowlist, not a blocklist: a field added to the query later is withheld
 * by default rather than leaking until someone notices. These are exactly what
 * the member-facing browse surfaces display — an avatar, a name, and the
 * branch underneath it.
 */
const DIRECTORY_CORE_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'photoUrl',
  'homeBranchId',
  'branchName',
  'memberType',
  // Minor protection is applied BEFORE the projection and its verdict is part
  // of the contract, so these two travel with the core.
  'isMinor',
  'redacted',
] as const;

/**
 * Narrow a directory row to the core when the caller holds no directory
 * capability.
 *
 * `GET /api/members` had no authorization at all: any authenticated account,
 * including a brand-new self-registered member, could page the roll and every
 * row carried email, phone, address, date of birth and all three emergency
 * contact fields. Gating the whole endpoint would have closed the leak and
 * taken the mobile Community tab's People segment with it, because that is an
 * ordinary member-facing browse. Least privilege by projection instead: the
 * rows a member can reach are unchanged, the fields they carry are not.
 *
 * Withheld fields are ABSENT from the object rather than set to null, so no
 * reader can confuse "not sent to you" with "not recorded".
 */
type DirectoryCoreKey = (typeof DIRECTORY_CORE_FIELDS)[number];

/** Core fields stay required; everything else becomes optional. */
type ProjectedRow<T> = Partial<T> & Pick<T, Extract<keyof T, DirectoryCoreKey>>;

function projectDirectoryRow<T extends Record<string, unknown>>(
  row: T,
  full: boolean,
): ProjectedRow<T> {
  if (full) return row;
  const core = {} as Record<string, unknown>;
  for (const field of DIRECTORY_CORE_FIELDS) {
    if (field in row) core[field] = row[field];
  }
  return core as ProjectedRow<T>;
}

/**
 * Thread `isMinor` / `redacted` flags onto a member row, nulling the sensitive
 * fields when the member is a protected minor and the viewer lacks access.
 */
function applyMinorProtection<T extends Record<string, unknown>>(
  row: T,
  hasAccess: boolean,
): T & { isMinor: boolean; redacted: boolean } {
  const isMinor = isMinorMember({
    memberType: row['memberType'] as string | null | undefined,
    dateOfBirth: row['dateOfBirth'] as string | null | undefined,
  });
  if (!isMinor || hasAccess) {
    return { ...row, isMinor, redacted: false };
  }
  const redacted = { ...row } as Record<string, unknown>;
  for (const field of REDACTABLE_FIELDS) {
    if (field in redacted) redacted[field] = null;
  }
  return { ...(redacted as T), isMinor: true, redacted: true };
}

export async function listRoles(db: Database) {
  return db
    .select({ id: roles.id, roleName: roles.roleName, description: roles.description })
    .from(roles)
    .where(eq(roles.isActive, true))
    .orderBy(roles.roleName);
}

export async function listMembers(
  db: Database,
  auth: AuthContext,
  query: {
    page: number;
    limit: number;
    search?: string;
    branchId?: string;
    approvalStatus?: string;
    fellowshipId?: string;
    memberType?: 'member' | 'attendee';
  },
) {
  // Pending members are inactive until approved AND arrive as attendees
  // (membership_class_completed_at NULL), so all defaults get skipped for
  // pending queries — otherwise the approval queue would be permanently empty
  // for self-signup accounts.
  const conditions: SQL[] = [];
  if (query.approvalStatus !== 'pending') {
    conditions.push(eq(members.isActive, true));
    // Directory covers Members + Attendees (approved humans who signed in).
    // Visitor / child shells stay behind their dedicated surfaces (Forms,
    // Safeguarding review) — surfacing them here would flood the roll with
    // rows that don't have a sign-in and blur the safeguarding gate.
    // Callers can narrow to one type via query.memberType.
    conditions.push(
      inArray(
        members.memberType,
        query.memberType ? [query.memberType] : ['member', 'attendee'],
      ),
    );
  }

  // Non-admin can only see their own branch (home or active secondary)
  if (!authHasCapability(auth, 'branch:read')) {
    conditions.push(
      or(
        eq(members.homeBranchId, auth.branchId),
        and(
          eq(members.secondaryBranchId, auth.branchId),
          eq(members.isAtSecondaryBranch, true),
        ),
      )!,
    );
  } else if (query.branchId) {
    conditions.push(eq(members.homeBranchId, query.branchId));
  }

  if (query.approvalStatus) {
    conditions.push(eq(members.approvalStatus, query.approvalStatus));
  }

  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(
      or(
        ilike(members.firstName, term),
        ilike(members.lastName, term),
        ilike(members.email, term),
      )!,
    );
  }

  if (query.fellowshipId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(fellowshipMembers)
          .where(
            and(
              eq(fellowshipMembers.memberId, members.id),
              eq(fellowshipMembers.fellowshipId, query.fellowshipId),
              eq(fellowshipMembers.isActive, true),
            ),
          ),
      ),
    );
  }

  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  // Resolve the viewer's guardianships ONCE up front, then evaluate per-row in
  // memory to avoid an N+1 across the list. Capabilities need no query — the
  // grants are already on the auth context.
  const guardedMemberIds = await getViewerGuardedMemberIds(db, auth);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        middleName: members.middleName,
        email: members.email,
        phone: members.phone,
        dateOfBirth: members.dateOfBirth,
        address: members.address,
        city: members.city,
        postalCode: members.postalCode,
        emergencyContactName: members.emergencyContactName,
        emergencyContactPhone: members.emergencyContactPhone,
        emergencyContactRelationship: members.emergencyContactRelationship,
        homeBranchId: members.homeBranchId,
        branchName: branches.branchName,
        gender: members.gender,
        membershipDate: members.membershipDate,
        approvalStatus: members.approvalStatus,
        systemRole: members.systemRole,
        memberType: members.memberType,
        // The REAL confirmed-Member signal per docs/domain-model.md §0 —
        // exposed on the list so the directory badge can trust class
        // completion directly instead of memberType, which can drift.
        membershipClassCompletedAt: members.membershipClassCompletedAt,
        isActive: members.isActive,
        createdAt: members.createdAt,
        photoUrl: members.photoUrl,
      })
      .from(members)
      .innerJoin(branches, eq(members.homeBranchId, branches.id))
      .where(where)
      .limit(query.limit)
      .offset(offset)
      .orderBy(members.lastName, members.firstName),
    db.select({ count: count() }).from(members).where(where),
  ]);

  // Decided once per request, not per row: does this caller have any business
  // reading the roll in full? The row-level branch narrowing above is
  // unchanged either way — this governs which FIELDS come back, not which rows.
  const fullRows = authHasAnyCapability(auth, ...DIRECTORY_CAPABILITIES);

  const data = rows.map((row) =>
    projectDirectoryRow(
      applyMinorProtection(row, hasDirectoryAccess(auth, row, guardedMemberIds)),
      fullRows,
    ),
  );

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total: total!.count,
      totalPages: Math.ceil(total!.count / query.limit),
    },
  };
}

export async function getMember(db: Database, memberId: string, auth: AuthContext) {
  const [member] = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      middleName: members.middleName,
      dateOfBirth: members.dateOfBirth,
      gender: members.gender,
      email: members.email,
      phone: members.phone,
      address: members.address,
      city: members.city,
      postalCode: members.postalCode,
      homeBranchId: members.homeBranchId,
      branchName: branches.branchName,
      secondaryBranchId: members.secondaryBranchId,
      isAtSecondaryBranch: members.isAtSecondaryBranch,
      secondaryAddress: members.secondaryAddress,
      secondaryCity: members.secondaryCity,
      secondaryPostalCode: members.secondaryPostalCode,
      membershipDate: members.membershipDate,
      isActive: members.isActive,
      photoUrl: members.photoUrl,
      emergencyContactName: members.emergencyContactName,
      emergencyContactPhone: members.emergencyContactPhone,
      emergencyContactRelationship: members.emergencyContactRelationship,
      approvalStatus: members.approvalStatus,
      systemRole: members.systemRole,
      memberType: members.memberType,
      membershipClassCompletedAt: members.membershipClassCompletedAt,
      emailVerified: members.emailVerified,
      createdAt: members.createdAt,
      updatedAt: members.updatedAt,
    })
    .from(members)
    .innerJoin(branches, eq(members.homeBranchId, branches.id))
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));

  if (!member) throw new NotFoundError('Member not found');

  const isSelf = auth.memberId === memberId;
  // Scoped to the SUBJECT's branch. This was an unscoped `branch:read`, so a
  // branch admin of any one branch read every child's unredacted record across
  // the whole church — and it sat ahead of the safeguarding check below, which
  // is why scoping that check alone did not close this path.
  const guardedMemberIds = isSelf ? new Set<string>() : await getViewerGuardedMemberIds(db, auth);

  // The member themselves, and anyone with directory sight of them (which
  // safeguarding sight implies), get the full record.
  if (isSelf || hasDirectoryAccess(auth, member, guardedMemberIds)) {
    return applyMinorProtection(member, true);
  }

  // Non-privileged, non-self readers:
  //  - ADULT records keep the original strict gate (privileged/self only) so
  //    this feature doesn't newly expose adults' address / emergency contacts.
  //  - MINOR records get a REDACTED stub (name/branch, no DOB/contact) for a
  //    same-branch viewer; out-of-branch viewers are denied. Guardians and
  //    safeguarding holders never reach here — `hasDirectoryAccess` above
  //    already returned true for them, branch-independently in the guardian's
  //    case.
  if (!isMinorMember({ memberType: member.memberType, dateOfBirth: member.dateOfBirth })) {
    throw new ForbiddenError('You can only access your own profile');
  }
  if (member.homeBranchId !== auth.branchId) {
    throw new ForbiddenError('You can only access members in your branch');
  }
  return applyMinorProtection(member, false);
}

export async function getMyProfile(db: Database, auth: AuthContext) {
  return getMember(db, auth.memberId, { ...auth, systemRole: 'admin' });
}

/**
 * Contact + identity fields that trigger a security notification to the
 * member when an admin/leader edits them on someone else's behalf. Photo,
 * notes, systemRole, and email are intentionally excluded — they have their
 * own dedicated flows (role has a security event, email has a double-confirm
 * change flow, photo/notes are low-signal).
 */
const ADMIN_EDIT_WATCHED_FIELDS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  middleName: 'Middle name',
  dateOfBirth: 'Date of birth',
  phone: 'Phone',
  address: 'Address',
  city: 'City',
  postalCode: 'Postal code',
  secondaryAddress: 'Secondary address',
  secondaryCity: 'Secondary city',
  secondaryPostalCode: 'Secondary postal code',
  emergencyContactName: 'Emergency contact name',
  emergencyContactPhone: 'Emergency contact phone',
  emergencyContactRelationship: 'Emergency contact relationship',
};

export async function updateMember(
  db: Database,
  memberId: string,
  input: Record<string, unknown>,
  auth: AuthContext,
  ctx?: RequestContext,
  cfImages?: CfImagesConfig | null,
) {
  enforceMemberAccess(auth, memberId);

  // Pull the watched fields alongside id so we can diff before-vs-after when
  // an admin edits on someone else's behalf.
  const [existing] = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      middleName: members.middleName,
      dateOfBirth: members.dateOfBirth,
      phone: members.phone,
      address: members.address,
      city: members.city,
      postalCode: members.postalCode,
      secondaryAddress: members.secondaryAddress,
      secondaryCity: members.secondaryCity,
      secondaryPostalCode: members.secondaryPostalCode,
      emergencyContactName: members.emergencyContactName,
      emergencyContactPhone: members.emergencyContactPhone,
      emergencyContactRelationship: members.emergencyContactRelationship,
      // Read before the write so a replaced photograph can be destroyed. The
      // old image outlives the column that pointed at it, and an orphaned
      // image on an unauthenticated URL is the same leak as DPIA risk R5 with
      // an extra step.
      photoUrl: members.photoUrl,
    })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));

  if (!existing) throw new NotFoundError('Member not found');

  // If secondaryBranchId is being cleared, force isAtSecondaryBranch off
  const safeInput = { ...input } as Record<string, unknown>;
  if (safeInput['secondaryBranchId'] === null) {
    safeInput['isAtSecondaryBranch'] = false;
  }

  try {
    const [updated] = await db
      .update(members)
      .set({ ...safeInput, updatedAt: sql`NOW()` })
      .where(eq(members.id, memberId))
      .returning();

    // Fire security notification when an admin/leader edits watched contact
    // or identity fields on someone else's behalf. Self-edits stay silent.
    // Fire-and-forget — notification failures must not roll back the update.
    if (auth.memberId !== memberId) {
      const existingRow = existing as Record<string, unknown>;
      const changedFieldLabels: string[] = [];
      for (const [field, label] of Object.entries(ADMIN_EDIT_WATCHED_FIELDS)) {
        if (!(field in safeInput)) continue;
        const before = existingRow[field] ?? null;
        const after = safeInput[field] ?? null;
        if (before !== after) changedFieldLabels.push(label);
      }
      if (changedFieldLabels.length > 0) {
        try {
          const [actor] = await db
            .select({ firstName: members.firstName, lastName: members.lastName })
            .from(members)
            .where(eq(members.id, auth.memberId))
            .limit(1);
          const updatedByName = actor
            ? `${actor.firstName} ${actor.lastName ?? ''}`.trim()
            : null;
          await dispatchNotification(db, {
            eventType: NotificationEventType.SecurityProfileUpdatedByAdmin,
            recipientMemberIds: [memberId],
            subjectType: 'member',
            subjectId: memberId,
            payload: {
              updatedByName,
              changedFieldLabels,
              occurredAt: new Date(),
              portalUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/profile`,
            },
          });
        } catch {
          // dispatchNotification already logs; swallow to keep the update path clean.
        }
      }
    }

    // Who changed whose record, and which fields. Article 33 needs this to
    // scope a tampering or exfiltration incident; without it there is no way
    // to tell an admin correcting a typo from one quietly rewriting a
    // safeguarding contact. Recorded for every update, self-edits included,
    // with `selfEdit` marking which is which — the notification above is
    // deliberately silent on self-edits, but the audit trail must not be.
    //
    // `fields` is the sorted key list of the update, never the values. The
    // values are already in `members`; duplicating them here would put
    // personal data in a second table with a different retention period and a
    // different access gate, which is a data-protection problem of its own.
    //
    // Awaited for the same reason as the guardian events: a deferred write on
    // a per-request Postgres client loses the row.
    await recordAuditEvent(db, {
      actorMemberId: auth.memberId,
      action: AuditAction.MemberUpdated,
      outcome: AuditOutcome.Success,
      targetType: 'member',
      targetId: memberId,
      metadata: {
        fields: Object.keys(safeInput).sort(),
        selfEdit: auth.memberId === memberId,
      },
      ...(ctx && { ctx }),
    });

    // A replaced photograph leaves the old image in Cloudflare Images, on an
    // unauthenticated URL, forever. Destroy it — but only once the row update
    // has succeeded, so a failed update never destroys the photo it was going
    // to replace. Deletion failures are logged inside `deleteStoredImage` and
    // never thrown: losing the old image is not worth failing the user's edit.
    if ('photoUrl' in safeInput) {
      const previous = (existing as Record<string, unknown>)['photoUrl'];
      const next = safeInput['photoUrl'];
      if (typeof previous === 'string' && previous && previous !== next) {
        await deleteStoredImage(cfImages ?? null, previous);
      }
    }

    return updated;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      if (code === '22001') throw new ValidationError('One or more values are too long. If you uploaded a photo, please try a smaller image.');
      if (code === '23505') throw new ValidationError('A member with this phone number or email already exists.');
    }
    throw err;
  }
}

export async function approveMember(
  db: Database,
  memberId: string,
  approved: boolean,
  auth: AuthContext,
) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins and pastors can approve members');
  }

  const [member] = await db
    .select({ id: members.id, approvalStatus: members.approvalStatus, email: members.email, firstName: members.firstName })
    .from(members)
    .where(eq(members.id, memberId));

  if (!member) throw new NotFoundError('Member not found');
  if (member.approvalStatus !== 'pending') {
    throw new ConflictError('Member is not pending approval');
  }

  const [updated] = await db
    .update(members)
    .set({
      approvalStatus: approved ? 'approved' : 'rejected',
      isActive: approved ? true : false,
      updatedAt: sql`NOW()`,
    })
    .where(eq(members.id, memberId))
    .returning();

  // Await the send — a floating .catch() gets cancelled on CF Workers the
  // moment the response returns, silently dropping every approval email.
  // Approval is a low-frequency admin action; the extra ~300ms round-trip
  // is a fair price for actually delivering the email. Failures still
  // don't block the approval itself (swallowed here on purpose).
  if (member.email) {
    const memberName = member.firstName ?? 'Member';
    try {
      if (approved) {
        await sendAccountApprovedEmail(member.email, memberName);
      } else {
        await sendAccountRejectedEmail(member.email, memberName);
      }
    } catch (err) {
      // Log but don't fail the approval — an admin has already flipped the
      // account state and the user can be told out-of-band.
      logger.error('Failed to send approval email', {
        memberId,
        approved,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return updated;
}

export async function assignRole(
  db: Database,
  memberId: string,
  input: { roleId: string; branchId: string; notes?: string },
  auth: AuthContext,
) {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can assign roles');
  }

  // Phase 5 hardening: a system admin who logged in scoped to a single branch
  // (e.g. "Branch System Admin — London") cannot assign roles in a different
  // branch without first switching role. The scope is the load-bearing intent.
  enforceScopeAllows(auth, 'branch', input.branchId);

  // Verify member exists
  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));
  if (!member) throw new NotFoundError('Member not found');

  // Verify role exists
  const [role] = await db
    .select({ id: roles.id, roleName: roles.roleName })
    .from(roles)
    .where(and(eq(roles.id, input.roleId), eq(roles.isActive, true)));
  if (!role) throw new ValidationError('Role not found or inactive');

  // What scope shape does this role actually take?
  //
  // This used to be hardcoded to 'branch', which was true of every role until
  // the church scope arrived. Granting a church-scoped role through this
  // endpoint then wrote a branch-scoped row, which `resolveGrants` resolves
  // into a grant that matches NOTHING — the UI would report success and the
  // grantee would still be locked out, with no error anywhere to explain it.
  //
  // Derive it from the catalog instead, so a future church-scoped role works
  // here the day it is added. Unmapped role names (operational roles like
  // "Worship Lead", which carry no authority) keep the branch shape they have
  // always had.
  const functionalRole = DB_ROLE_NAME_TO_FUNCTIONAL[role.roleName];
  const scopeKind = functionalRole ? RoleScopeKind[functionalRole] : 'branch';
  if (scopeKind === 'fellowship' || scopeKind === 'department') {
    // Those grants are written through by the fellowship/department services
    // when a leader is set, not assigned by hand here — this endpoint has no
    // fellowship or department id to scope them to.
    throw new ValidationError(
      `${role.roleName} is scoped to a ${scopeKind} and is assigned from that ${scopeKind}, not here`,
    );
  }
  // A church scope names no entity, so it stores the nil-UUID sentinel.
  // `branchId` stays the caller-supplied branch: on a church grant it is only
  // a query handle ("whose grants are in branch B"), never the grant's reach.
  const scopeId = scopeKind === 'church' ? CHURCH_SCOPE_ID : input.branchId;

  // Verify branch exists
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, input.branchId), eq(branches.isActive, true)));
  if (!branch) throw new ValidationError('Branch not found or inactive');

  // Check for active duplicate. Keyed on the SCOPE, not on branchId: two
  // church grants for the same member are duplicates even when their
  // (incidental) branch ids differ, and `uq_member_roles_active_assignment`
  // would reject the second insert as a 500 rather than a clean conflict.
  const [existing] = await db
    .select({ id: memberRoles.id })
    .from(memberRoles)
    .where(
      and(
        eq(memberRoles.memberId, memberId),
        eq(memberRoles.roleId, input.roleId),
        eq(memberRoles.scopeKind, scopeKind),
        eq(memberRoles.scopeId, scopeId),
        eq(memberRoles.isActive, true),
      ),
    );
  if (existing) {
    throw new ConflictError(
      scopeKind === 'church'
        ? 'Member already has this church-wide role'
        : 'Member already has this role in this branch',
    );
  }

  const [assignment] = await db
    .insert(memberRoles)
    .values({
      memberId,
      roleId: input.roleId,
      branchId: input.branchId,
      scopeKind,
      scopeId,
      notes: input.notes ?? null,
    })
    .returning();

  await dispatchRoleNotification(db, {
    eventType: NotificationEventType.SecurityRoleGranted,
    memberId,
    roleId: input.roleId,
    branchId: input.branchId,
    actorMemberId: auth.memberId,
  });

  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.RoleGranted,
    outcome: AuditOutcome.Success,
    targetType: 'member_role',
    targetId: assignment?.id,
    metadata: { recipientMemberId: memberId, roleId: input.roleId, branchId: input.branchId },
  });

  return assignment;
}

export async function removeRole(
  db: Database,
  memberId: string,
  roleAssignmentId: string,
  auth: AuthContext,
) {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can remove roles');
  }

  const [assignment] = await db
    .select({ id: memberRoles.id, memberId: memberRoles.memberId, branchId: memberRoles.branchId })
    .from(memberRoles)
    .where(and(eq(memberRoles.id, roleAssignmentId), eq(memberRoles.isActive, true)));

  if (!assignment) throw new NotFoundError('Role assignment not found');
  if (assignment.memberId !== memberId) throw new ValidationError('Role assignment does not belong to this member');

  // Phase 5 hardening: same scope intent as assignRole — refuse cross-branch
  // revokes from a scope-bound session. Use the assignment's branchId because
  // the URL does not carry one.
  enforceScopeAllows(auth, 'branch', assignment.branchId);

  const [updated] = await db
    .update(memberRoles)
    .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: sql`NOW()` })
    .where(eq(memberRoles.id, roleAssignmentId))
    .returning();

  if (updated) {
    await dispatchRoleNotification(db, {
      eventType: NotificationEventType.SecurityRoleRevoked,
      memberId,
      roleId: updated.roleId,
      branchId: assignment.branchId,
      actorMemberId: auth.memberId,
    });

    await recordAuditEvent(db, {
      actorMemberId: auth.memberId,
      action: AuditAction.RoleRevoked,
      outcome: AuditOutcome.Success,
      targetType: 'member_role',
      targetId: updated.id,
      metadata: { recipientMemberId: memberId, roleId: updated.roleId, branchId: assignment.branchId },
    });
  }

  return updated;
}

async function dispatchRoleNotification(
  db: Database,
  input: { eventType: NotificationEventType; memberId: string; roleId: string; branchId: string; actorMemberId: string },
) {
  const [role] = await db
    .select({ name: roles.roleName })
    .from(roles)
    .where(eq(roles.id, input.roleId))
    .limit(1);
  const [branch] = await db
    .select({ branchName: branches.branchName })
    .from(branches)
    .where(eq(branches.id, input.branchId))
    .limit(1);
  const [actor] = await db
    .select({ firstName: members.firstName, lastName: members.lastName })
    .from(members)
    .where(eq(members.id, input.actorMemberId))
    .limit(1);

  const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : null;
  const isGrant = input.eventType === NotificationEventType.SecurityRoleGranted;

  await dispatchNotification(db, {
    eventType: input.eventType,
    recipientMemberIds: [input.memberId],
    branchId: input.branchId,
    subjectType: 'member_role',
    payload: {
      roleName: role?.name ?? 'Role',
      scopeLabel: branch?.branchName ?? 'a branch',
      ...(isGrant ? { grantedByName: actorName } : { revokedByName: actorName }),
      portalUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/dashboard`,
    },
  });
}

export async function getMemberRoles(db: Database, memberId: string, auth: AuthContext) {
  enforceMemberAccess(auth, memberId);

  return db
    .select({
      id: memberRoles.id,
      roleId: memberRoles.roleId,
      roleName: roles.roleName,
      branchId: memberRoles.branchId,
      branchName: branches.branchName,
      assignedDate: memberRoles.assignedDate,
      endDate: memberRoles.endDate,
      isActive: memberRoles.isActive,
      notes: memberRoles.notes,
    })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .innerJoin(branches, eq(memberRoles.branchId, branches.id))
    .where(and(eq(memberRoles.memberId, memberId), eq(memberRoles.isActive, true)));
}

export async function deactivateMember(
  db: Database,
  memberId: string,
  auth: AuthContext,
) {
  if (!authHasCapability(auth, 'branch:write')) {
    throw new ForbiddenError('Only branch-tier admins can deactivate members');
  }

  const conditions = [eq(members.id, memberId), eq(members.isActive, true)];
  // RBAC Phase 4b: non-platform-admins are narrowed to members in their
  // active branch.
  if (auth.systemRole !== 'admin') {
    conditions.push(eq(members.homeBranchId, auth.branchId));
  }

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(...conditions));

  if (!member) throw new NotFoundError('Member not found');

  // Deactivate all role assignments
  await db
    .update(memberRoles)
    .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: sql`NOW()` })
    .where(and(eq(memberRoles.memberId, memberId), eq(memberRoles.isActive, true)));

  // Cascade to active New Believer enrollments — otherwise the enrollment row
  // stays isActive=true after the member is archived and shows up as an
  // orphan in NB pipeline queries.
  await db
    .update(newBelieverEnrollments)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(and(
      eq(newBelieverEnrollments.memberId, memberId),
      eq(newBelieverEnrollments.isActive, true),
    ));

  // Same cascade for department assignments — rotas/uniform schedules key
  // off department_members.is_active.
  await db
    .update(departmentMembers)
    .set({ isActive: false, leaveDate: sql`CURRENT_DATE`, updatedAt: sql`NOW()` })
    .where(and(
      eq(departmentMembers.memberId, memberId),
      eq(departmentMembers.isActive, true),
    ));

  // Soft-delete member
  const [updated] = await db
    .update(members)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(eq(members.id, memberId))
    .returning();

  return updated;
}

export async function createMember(
  db: Database,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    homeBranchId: string;
    phone?: string;
    gender?: 'Male' | 'Female';
    dateOfBirth?: string;
    middleName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    secondaryBranchId?: string | null;
    secondaryAddress?: string;
    secondaryCity?: string;
    secondaryPostalCode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    // No `systemRole`. It is never taken from caller input — see
    // `createMemberSchema`. Global admin comes from a grant, not a form field.
  },
  auth: AuthContext,
) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins and pastors can create members');
  }

  // The route gate is capability-wide, not branch-bound, and nothing here
  // used to look at `homeBranchId` — so a BranchAdmin for one branch could
  // write members into any other by naming its id (directly, or a cell at a
  // time through the CSV import). Platform admins short-circuit this inside
  // `authHasCapability`.
  if (!authHasCapability(auth, 'branch:write', { kind: 'branch', id: input.homeBranchId })) {
    throw new ForbiddenError('You cannot create members in this branch');
  }

  // Check for existing email
  const [existing] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.email, input.email))
    .limit(1);
  if (existing) throw new ConflictError('A member with this email already exists');

  // Check for duplicate phone
  if (input.phone) {
    const [phoneExists] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.phone, input.phone), eq(members.isActive, true)))
      .limit(1);
    if (phoneExists) throw new ConflictError('A member with this phone number already exists');
  }

  // Auto-generate password
  const generatedPassword = randomTokenHex(8);
  const passwordHash = await hashPassword(generatedPassword);

  const [created] = await db
    .insert(members)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      email: input.email,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      postalCode: input.postalCode ?? null,
      secondaryBranchId: input.secondaryBranchId ?? null,
      secondaryAddress: input.secondaryAddress ?? null,
      secondaryCity: input.secondaryCity ?? null,
      secondaryPostalCode: input.secondaryPostalCode ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelationship: input.emergencyContactRelationship ?? null,
      homeBranchId: input.homeBranchId,
      passwordHash,
      emailVerified: true,
      approvalStatus: 'approved',
      // Always 'member'. The only other value is 'admin', and that is a
      // grant decision made on the roles surface, never a create-form field.
      systemRole: 'member',
      // Phase 2: admin-add lands as an attendee; the admin must explicitly
      // mark the membership class as completed afterwards. This matches
      // self-signup behaviour — neither path auto-confers Member status.
      memberType: 'attendee',
      isActive: true,
      mustChangePassword: true,
    })
    .returning();

  if (!created) throw new Error('Failed to create member');

  return { member: created, generatedPassword };
}

/**
 * Task #33 Phase 1: stamp (or clear) the timestamp at which the member
 * completed the 4-week membership class. This is the real Membership
 * signifier — see docs/domain-model.md §0. `completedAt: null` unmarks.
 *
 * Authorization mirrors deactivateMember: branch:write capability + branch
 * narrowing for non-platform-admins.
 */
export async function setMembershipClassCompleted(
  db: Database,
  memberId: string,
  completedAt: Date | null,
  auth: AuthContext,
) {
  if (!authHasCapability(auth, 'branch:write')) {
    throw new ForbiddenError('Only branch-tier admins can certify membership');
  }

  const conditions = [eq(members.id, memberId), eq(members.isActive, true)];
  if (auth.systemRole !== 'admin') {
    conditions.push(eq(members.homeBranchId, auth.branchId));
  }

  const [member] = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      homeBranchId: members.homeBranchId,
      previousCompletedAt: members.membershipClassCompletedAt,
      branchName: branches.branchName,
    })
    .from(members)
    .innerJoin(branches, eq(members.homeBranchId, branches.id))
    .where(and(...conditions));

  if (!member) throw new NotFoundError('Member not found');

  // Phase 5 hardening: a session scoped to one branch can't reach another.
  enforceScopeAllows(auth, 'branch', member.homeBranchId);

  // Phase 2: keep memberType in lockstep with the timestamp. The directory
  // and reports filters now key off the timestamp, but memberType remains a
  // provenance tag — when an attendee completes the class we promote the tag
  // too so the two never drift.
  const [updated] = await db
    .update(members)
    .set({
      membershipClassCompletedAt: completedAt,
      memberType: completedAt ? 'member' : 'attendee',
      updatedAt: sql`NOW()`,
    })
    .where(eq(members.id, memberId))
    .returning();

  // Notify on the null → timestamp transition only. Clearing the timestamp,
  // or re-stamping an already-confirmed member, does not fire. Fire-and-forget
  // — notification failures must not break the certification.
  if (completedAt && !member.previousCompletedAt) {
    try {
      const branchAuth = await resolveBranchAuthority(db, member.homeBranchId);
      const recipients = Array.from(new Set([member.id, ...branchAuth]));
      const portalUrl = `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/members/${member.id}`;
      await dispatchNotification(db, {
        eventType: NotificationEventType.LifecycleMemberConfirmed,
        recipientMemberIds: recipients,
        branchId: member.homeBranchId,
        subjectType: 'member',
        subjectId: member.id,
        payload: {
          confirmedName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
          branchName: member.branchName,
          portalUrl,
        },
      });
    } catch {
      // dispatchNotification already logs; resolveBranchAuthority failures
      // here are swallowed to preserve the fire-and-forget contract.
    }
  }

  return updated;
}

export async function reactivateMember(
  db: Database,
  memberId: string,
  auth: AuthContext,
) {
  if (!authHasCapability(auth, 'branch:write')) {
    throw new ForbiddenError('Only branch-tier admins can reactivate members');
  }

  const query = db
    .select({ id: members.id, isActive: members.isActive })
    .from(members)
    .where(
      // RBAC Phase 4b: non-platform-admins are narrowed to members in their branch.
      auth.systemRole !== 'admin'
        ? and(eq(members.id, memberId), eq(members.homeBranchId, auth.branchId))
        : eq(members.id, memberId),
    );

  const [member] = await query;

  if (!member) throw new NotFoundError('Member not found');
  if (member.isActive) throw new ConflictError('Member is already active');

  const [updated] = await db
    .update(members)
    .set({ isActive: true, approvalStatus: 'approved', updatedAt: sql`NOW()` })
    .where(eq(members.id, memberId))
    .returning();

  return updated;
}

// ── Health Records (minor data protection) ────────────────

/**
 * Fetch the member (branch-scoped lookup) and assert the viewer has
 * safeguarding access. Throws NotFound if the member doesn't exist or is out
 * of the viewer's branch scope, Forbidden if access is denied.
 */
async function loadMemberForSafeguarding(
  db: Database,
  memberId: string,
  auth: AuthContext,
  cap: 'safeguarding:read' | 'safeguarding:write' = 'safeguarding:read',
): Promise<SafeguardingSubject & { id: string }> {
  // Resolve by id only — NOT filtered by the viewer's branch. Safeguarding
  // access is branch-independent for a guardian, and scoped to the MEMBER's
  // branch (not the viewer's) for a Safeguarding Lead; both are decided by
  // hasHealthRecordAccess below. Pre-filtering on auth.branchId here would lock
  // out a guardian whose active branch differs from their child's home branch.
  const [member] = await db
    .select({
      id: members.id,
      homeBranchId: members.homeBranchId,
      memberType: members.memberType,
      dateOfBirth: members.dateOfBirth,
    })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));

  if (!member) throw new NotFoundError('Member not found');

  const guardedMemberIds = await getViewerGuardedMemberIds(db, auth);
  if (!hasHealthRecordAccess(auth, member, guardedMemberIds, cap)) {
    throw new ForbiddenError('You do not have safeguarding access to this member');
  }

  return member;
}

export async function getHealthRecord(
  db: Database,
  memberId: string,
  auth: AuthContext,
): Promise<MemberHealthRecord | null> {
  await loadMemberForSafeguarding(db, memberId, auth);

  const [record] = await db
    .select()
    .from(memberHealthRecords)
    .where(and(eq(memberHealthRecords.memberId, memberId), eq(memberHealthRecords.isActive, true)));

  return (record as MemberHealthRecord | undefined) ?? null;
}

export async function upsertHealthRecord(
  db: Database,
  memberId: string,
  input: {
    medicalConditions?: string | null;
    allergies?: string | null;
    medications?: string | null;
    dietaryNeeds?: string | null;
    additionalNotes?: string | null;
    photoMediaConsent?: boolean | null;
    medicalTreatmentConsent?: boolean | null;
    dataProcessingConsent?: boolean | null;
  },
  auth: AuthContext,
): Promise<MemberHealthRecord> {
  // Writing a health record needs `safeguarding:write`, not merely read — the
  // first place that capability is enforced in the API.
  const member = await loadMemberForSafeguarding(db, memberId, auth, 'safeguarding:write');

  // Stamp consent provenance only when a consent flag is actually provided.
  const consentProvided =
    input.photoMediaConsent !== undefined ||
    input.medicalTreatmentConsent !== undefined ||
    input.dataProcessingConsent !== undefined;

  const consentFields = consentProvided
    ? { consentRecordedBy: auth.memberId, consentDate: sql`CURRENT_DATE` }
    : {};

  // memberId is UNIQUE, so at most one row can exist — the probe intentionally
  // ignores isActive. If a prior record was soft-deleted, reactivating it on
  // upsert is the only valid path (a second insert would violate the unique
  // constraint); hence the unconditional isActive:true on update.
  const [existing] = await db
    .select({ id: memberHealthRecords.id })
    .from(memberHealthRecords)
    .where(eq(memberHealthRecords.memberId, memberId));

  if (existing) {
    const [updated] = await db
      .update(memberHealthRecords)
      .set({ ...input, ...consentFields, isActive: true, updatedAt: sql`NOW()` })
      .where(eq(memberHealthRecords.memberId, memberId))
      .returning();
    return updated as MemberHealthRecord;
  }

  const [created] = await db
    .insert(memberHealthRecords)
    .values({ ...input, ...consentFields, memberId, branchId: member.homeBranchId })
    .returning();
  return created as MemberHealthRecord;
}

/**
 * Safeguarding-review list: active minors (memberType 'child' or DOB under the
 * minor threshold) whose guardian link is missing OR points at a deactivated
 * member. Surfaces minors left without an active responsible adult — e.g. after
 * a guardian is deactivated (which is allowed, not blocked). Branch-scoped and
 * gated to safeguarding access (admin/pastor, or a Safeguarding Lead in the
 * branch) — these viewers may already see minors' protected data.
 */
export async function listUnguardedMinors(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string },
) {
  const branchId = query.branchId ?? auth.branchId;

  // A safeguarding surface, so it takes a safeguarding grant scoped to the
  // branch being asked about. It used to accept an UNSCOPED `branch:read`,
  // which let a branch admin of any branch list any other branch's minors.
  if (!authHasCapability(auth, 'safeguarding:read', { kind: 'branch', id: branchId })) {
    throw new ForbiddenError('You need safeguarding access to view this list');
  }

  // "Unguarded" now means: no active guardian link pointing at an active adult.
  // Before 0056 this was a left join on one column; a minor with two guardians
  // is only unguarded when BOTH are gone, which a single join cannot express.
  const hasLiveGuardian = sql`EXISTS (
    SELECT 1 FROM member_guardians mg
    JOIN members g ON g.id = mg.guardian_member_id
    WHERE mg.member_id = ${members.id}
      AND mg.is_active = true
      AND g.is_active = true
  )`;

  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      dateOfBirth: members.dateOfBirth,
      branchName: branches.branchName,
      // Links that exist regardless of whether the adult is still active. This
      // separates "nobody was ever named" from "everyone named has been
      // deactivated" — different safeguarding problems with different actions.
      linkedGuardianCount: sql<number>`(
        SELECT COUNT(*)::int FROM member_guardians mg
        WHERE mg.member_id = ${members.id} AND mg.is_active = true
      )`,
      guardianNames: sql<string | null>`(
        SELECT string_agg(
                 TRIM(g.first_name || ' ' || COALESCE(g.last_name, '')),
                 ', ' ORDER BY mg.is_primary DESC, g.last_name
               )
        FROM member_guardians mg
        JOIN members g ON g.id = mg.guardian_member_id
        WHERE mg.member_id = ${members.id} AND mg.is_active = true
      )`,
    })
    .from(members)
    .innerJoin(branches, eq(members.homeBranchId, branches.id))
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.isActive, true),
        // is a protected minor
        or(
          eq(members.memberType, 'child'),
          sql`${members.dateOfBirth} > (CURRENT_DATE - INTERVAL '${sql.raw(String(MINOR_AGE_THRESHOLD))} years')`,
        ),
        sql`NOT ${hasLiveGuardian}`,
      ),
    )
    .orderBy(members.lastName, members.firstName);

  return rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    dateOfBirth: r.dateOfBirth,
    branchName: r.branchName,
    guardianStatus: (Number(r.linkedGuardianCount) === 0 ? 'none' : 'inactive') as
      | 'none'
      | 'inactive',
    guardianNames: r.guardianNames,
  }));
}

// ── Dormant minor review (#4 Phase B) ─────────────────────
//
// Minors can't be silently archived — every archive decision needs an
// explicit Safeguarding Lead approval and an audit trail. listDormantMinors
// surfaces children with no recent review (or no review at all) for the SG
// Lead UI to act on; reviewMinor records the decision.

const DORMANT_MINOR_DAYS = 60;        // shell creation older than this
const MINOR_REVIEW_RECHECK_DAYS = 90; // re-prompt after this many days

/**
 * List minors who need Safeguarding Lead review: memberType='child' shells
 * that are dormant (created >60 days ago) and either never reviewed or last
 * reviewed >90 days ago. Children left active stay surfaced until the SG Lead
 * decides — there is no silent expiry.
 */
export async function listDormantMinors(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string },
) {
  const branchId = query.branchId ?? auth.branchId;

  // A safeguarding surface, so it takes a safeguarding grant scoped to the
  // branch being asked about. It used to accept an UNSCOPED `branch:read`,
  // which let a branch admin of any branch list any other branch's minors.
  if (!authHasCapability(auth, 'safeguarding:read', { kind: 'branch', id: branchId })) {
    throw new ForbiddenError('You need safeguarding access to view this list');
  }

  const reviewer = alias(members, 'reviewer');
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      dateOfBirth: members.dateOfBirth,
      createdAt: members.createdAt,
      safeguardingReviewedAt: members.safeguardingReviewedAt,
      lastDecision: members.safeguardingArchiveDecision,
      reviewerFirstName: reviewer.firstName,
      reviewerLastName: reviewer.lastName,
    })
    .from(members)
    .leftJoin(reviewer, eq(members.safeguardingReviewedBy, reviewer.id))
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.isActive, true),
        eq(members.memberType, 'child'),
        sql`${members.createdAt} < NOW() - INTERVAL '${sql.raw(String(DORMANT_MINOR_DAYS))} days'`,
        or(
          sql`${members.safeguardingReviewedAt} IS NULL`,
          sql`${members.safeguardingReviewedAt} < NOW() - INTERVAL '${sql.raw(String(MINOR_REVIEW_RECHECK_DAYS))} days'`,
        ),
      ),
    )
    .orderBy(members.createdAt);

  return (rows as Array<{
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    createdAt: Date | string;
    safeguardingReviewedAt: Date | string | null;
    lastDecision: string | null;
    reviewerFirstName: string | null;
    reviewerLastName: string | null;
  }>).map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    dateOfBirth: r.dateOfBirth,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    lastReviewedAt: r.safeguardingReviewedAt
      ? (r.safeguardingReviewedAt instanceof Date
          ? r.safeguardingReviewedAt.toISOString()
          : String(r.safeguardingReviewedAt))
      : null,
    lastDecision: r.lastDecision as 'active' | 'archived' | null,
    lastReviewerName:
      r.reviewerFirstName ? `${r.reviewerFirstName} ${r.reviewerLastName ?? ''}`.trim() : null,
  }));
}

/**
 * Record a Safeguarding Lead's decision on a dormant minor:
 *   'active'   → mark still-active; the row stays but won't resurface for
 *                another MINOR_REVIEW_RECHECK_DAYS days.
 *   'archived' → soft-delete the row (isActive=false). Reversible by admin.
 *
 * Both branches stamp safeguarding_reviewed_at/by + the decision so the audit
 * trail captures who made the call and when.
 */
export async function reviewMinor(
  db: Database,
  auth: AuthContext,
  memberId: string,
  decision: 'active' | 'archived',
) {
  // Load the row to check it's actually a minor in scope.
  const [row] = await db
    .select({
      id: members.id,
      memberType: members.memberType,
      homeBranchId: members.homeBranchId,
      isActive: members.isActive,
    })
    .from(members)
    .where(eq(members.id, memberId));

  if (!row) throw new NotFoundError('Member not found');
  if (row.memberType !== 'child') {
    throw new ForbiddenError('reviewMinor only applies to memberType="child"');
  }
  if (!row.isActive) {
    throw new ConflictError('Member is already inactive');
  }

  // This archives a child's record, so it takes `safeguarding:write` scoped to
  // the child's own branch. It used to accept an UNSCOPED `branch:read`, which
  // let a branch admin of any branch archive a minor in any other.
  if (!authHasCapability(auth, 'safeguarding:write', { kind: 'branch', id: row.homeBranchId })) {
    throw new ForbiddenError('You need safeguarding access for this branch');
  }

  const [updated] = await db
    .update(members)
    .set({
      safeguardingReviewedAt: new Date(),
      safeguardingReviewedBy: auth.memberId,
      safeguardingArchiveDecision: decision,
      isActive: decision === 'archived' ? false : true,
      updatedAt: sql`NOW()`,
    })
    .where(eq(members.id, memberId))
    .returning();

  return updated;
}

// ── Guardian links ─────────────────────────────────────────
//
// The resolution path for `listUnguardedMinors`. Until these existed that list
// reported a safeguarding problem nobody could fix: the only writes to
// `member_guardians` were `createMemberShell` (always a brand-new member) and
// the first-time-visitor form, which is gated to subjects the submission itself
// minted. A child already on the roll could not be given a guardian at all.
//
// Both operations take `safeguarding:write` scoped to the SUBJECT's home
// branch, because writing a guardian link IS the access-control decision:
// `hasHealthRecordAccess` grants on `guardedMemberIds.has(member.id)`, so
// whoever creates the link is handing that adult the child's unredacted
// directory row plus read AND write on their health record. That belongs with
// safeguarding authority rather than general branch administration — a
// BranchAdmin holds `branch:write` and must not be able to give anybody access
// to a child's health record. It also keeps reading and acting symmetric:
// `listUnguardedMinors` is gated on `safeguarding:read`, so acting on what it
// shows takes `safeguarding:write`.
//
// Scope resolves from the subject's own `homeBranchId`, never `auth.branchId`
// or the URL — the same rule `reviewMinor` and `loadMemberForSafeguarding`
// follow.

/**
 * Load the guarded member and authorise the caller against THEIR branch.
 * Shared by attach and detach so the two cannot drift apart on the gate.
 */
async function loadGuardianLinkSubject(db: Database, auth: AuthContext, memberId: string) {
  const [subject] = await db
    .select({
      id: members.id,
      homeBranchId: members.homeBranchId,
      memberType: members.memberType,
      dateOfBirth: members.dateOfBirth,
      isActive: members.isActive,
    })
    .from(members)
    .where(eq(members.id, memberId));

  if (!subject || !subject.isActive) throw new NotFoundError('Member not found');

  if (
    !authHasCapability(auth, 'safeguarding:write', {
      kind: 'branch',
      id: subject.homeBranchId,
    })
  ) {
    throw new ForbiddenError('You need safeguarding access for this branch');
  }

  return subject;
}

/**
 * Attach an existing member as a guardian of an existing member.
 */
export async function attachGuardian(
  db: Database,
  auth: AuthContext,
  memberId: string,
  input: { guardianMemberId: string; relationship?: string; isPrimary?: boolean },
  ctx?: RequestContext,
) {
  const subject = await loadGuardianLinkSubject(db, auth, memberId);

  // Guardianship is only a modelled concept for protected minors, and every
  // other write path mints a child or a baby. Allowing an adult subject would
  // let a safeguarding holder give a third party standing access to an adult
  // member's health record — `hasHealthRecordAccess` grants on the guardian
  // link without checking minor status. Guardianship over a vulnerable adult
  // would need its own consent story; it is not this feature.
  if (!isMinorMember(subject)) {
    throw new ValidationError('A guardian can only be attached to a member under 16');
  }

  // `linkGuardians` drops a self-link silently, which is right for a form
  // capture (one bad field must not sink the whole submission) and wrong for an
  // explicit request, which would report success for something it did not do.
  // The `member_id <> guardian_member_id` CHECK would refuse it regardless.
  if (input.guardianMemberId === memberId) {
    throw new ValidationError('A member cannot be their own guardian');
  }

  const [guardian] = await db
    .select({
      id: members.id,
      memberType: members.memberType,
      dateOfBirth: members.dateOfBirth,
      isActive: members.isActive,
    })
    .from(members)
    .where(eq(members.id, input.guardianMemberId));

  if (!guardian || !guardian.isActive) throw new NotFoundError('Guardian not found');

  // A minor cannot carry responsibility for another minor, and the link would
  // hand one child sight of another child's health record.
  if (isMinorMember(guardian)) {
    throw new ValidationError('A member under 16 cannot be a guardian');
  }

  // The guardian is deliberately NOT required to share the subject's branch.
  // Guardian access is branch-independent by design (see `hasHealthRecordAccess`)
  // so a parent who attends another branch still reaches their own child. The
  // authority check is on the SUBJECT's branch, because the subject's record is
  // what is being opened up.

  const [existing] = await db
    .select({ id: memberGuardians.id })
    .from(memberGuardians)
    .where(
      and(
        eq(memberGuardians.memberId, memberId),
        eq(memberGuardians.guardianMemberId, input.guardianMemberId),
        eq(memberGuardians.isActive, true),
      ),
    );

  // Without this the partial unique index makes `onConflictDoNothing` a no-op
  // and the caller is told the link was created.
  if (existing) {
    throw new ConflictError('That member is already an active guardian of this member');
  }

  // One primary per member, enforced by `uq_member_guardians_primary`. Promote
  // by demoting: taking over as first contact is an explicit instruction, so
  // stand the previous primary down rather than letting the index reject the
  // insert (which `onConflictDoNothing` would hide). The old link stays active
  // — only its primacy moves.
  if (input.isPrimary === true) {
    await db
      .update(memberGuardians)
      .set({ isPrimary: false, updatedAt: sql`NOW()` })
      .where(
        and(
          eq(memberGuardians.memberId, memberId),
          eq(memberGuardians.isPrimary, true),
          eq(memberGuardians.isActive, true),
        ),
      );
  }

  await linkGuardians(db, memberId, [
    {
      memberId: input.guardianMemberId,
      relationship: input.relationship ?? null,
      // Explicit, so `linkGuardians` does not default a lone link to primary.
      isPrimary: input.isPrimary === true,
    },
  ]);

  const [link] = await db
    .select({
      id: memberGuardians.id,
      memberId: memberGuardians.memberId,
      guardianMemberId: memberGuardians.guardianMemberId,
      relationship: memberGuardians.relationship,
      isPrimary: memberGuardians.isPrimary,
      isActive: memberGuardians.isActive,
    })
    .from(memberGuardians)
    .where(
      and(
        eq(memberGuardians.memberId, memberId),
        eq(memberGuardians.guardianMemberId, input.guardianMemberId),
        eq(memberGuardians.isActive, true),
      ),
    );

  // Awaited, not handed to `ctx.waitUntil`. The Postgres client is per-request
  // inside an AsyncLocalStorage scope, so a deferred write either throws or
  // does I/O on a socket the request no longer owns, and the row vanishes.
  // This is the first mutation in the system that grants access to a child's
  // record; it does not get to be best-effort.
  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.GuardianLinked,
    outcome: AuditOutcome.Success,
    targetType: 'member_guardian',
    targetId: link?.id,
    metadata: {
      guardedMemberId: memberId,
      guardianMemberId: input.guardianMemberId,
      branchId: subject.homeBranchId,
      isPrimary: input.isPrimary === true,
      ...(input.relationship ? { relationship: input.relationship } : {}),
    },
    ...(ctx && { ctx }),
  });

  return link ?? null;
}

/**
 * Deactivate a guardian link. Removing a guardian REVOKES that person's access
 * to the child's record, so it is as much a safeguarding decision as granting
 * it and takes the same capability.
 */
export async function detachGuardian(
  db: Database,
  auth: AuthContext,
  memberId: string,
  guardianMemberId: string,
  ctx?: RequestContext,
) {
  // Note the asymmetry with attach: detach does NOT require the subject to be
  // a minor. A link that should not exist — over an adult, or left behind by
  // older data — has to be removable, and refusing to clean it up because of
  // the subject's age would strand exactly the rows most worth removing.
  const subject = await loadGuardianLinkSubject(db, auth, memberId);

  const [link] = await db
    .select({ id: memberGuardians.id, isPrimary: memberGuardians.isPrimary })
    .from(memberGuardians)
    .where(
      and(
        eq(memberGuardians.memberId, memberId),
        eq(memberGuardians.guardianMemberId, guardianMemberId),
        eq(memberGuardians.isActive, true),
      ),
    );

  if (!link) throw new NotFoundError('Guardian link not found');

  // Deactivate, never delete. Grant resolution filters on `isActive`
  // (`getViewerGuardedMemberIds`), so flipping the flag is what actually
  // revokes access — and destroying the record of who once had sight of a
  // child's data is the opposite of what a safeguarding audit needs.
  const [updated] = await db
    .update(memberGuardians)
    .set({ isActive: false, isPrimary: false, updatedAt: sql`NOW()` })
    .where(eq(memberGuardians.id, link.id))
    .returning();

  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.GuardianUnlinked,
    outcome: AuditOutcome.Success,
    targetType: 'member_guardian',
    targetId: link.id,
    metadata: {
      guardedMemberId: memberId,
      guardianMemberId,
      branchId: subject.homeBranchId,
      wasPrimary: link.isPrimary,
    },
    ...(ctx && { ctx }),
  });

  return updated ?? null;
}

// ── CSV Import / Export ────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * CSV gives absent values as empty strings. Drop them so Zod's `.optional()`
 * applies rather than failing an empty cell against `.uuid()` / `.email()`.
 */
function stripBlanks(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== '') out[k] = v;
  }
  return out;
}

export async function importMembers(
  db: Database,
  csvText: string,
  auth: AuthContext,
): Promise<{ imported: number; errors: string[] }> {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new ValidationError('CSV must have a header row and at least one data row');

  const headers = parseCSVLine(lines[0]!);
  const errors: string[] = [];
  let imported = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]!.trim();
    if (!rawLine) continue;

    try {
      const values = parseCSVLine(rawLine);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });

      // Every cell used to go through untouched — the route carried no
      // validator and the service read `row['systemRole']` and
      // `row['homeBranchId']` straight into the insert. Validate the row
      // against the same shape rules the single-create route enforces, and
      // report failures per row so one bad line doesn't sink the file.
      const parsed = importMemberRowSchema.safeParse(stripBlanks(row));
      if (!parsed.success) {
        errors.push(`Row ${i + 1}: ${parsed.error.issues.map((is) => is.message).join('; ')}`);
        continue;
      }
      const data = parsed.data;

      await createMember(
        db,
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          // A blank column still falls back to the importer's own branch.
          // A named one is honoured only if they have authority over it —
          // `createMember` checks, and throws into the per-row catch below.
          homeBranchId: data.homeBranchId ?? auth.branchId,
          ...(data.phone ? { phone: data.phone } : {}),
          ...(data.gender ? { gender: data.gender } : {}),
          ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}),
          ...(data.middleName ? { middleName: data.middleName } : {}),
          ...(data.address ? { address: data.address } : {}),
          ...(data.city ? { city: data.city } : {}),
          ...(data.postalCode ? { postalCode: data.postalCode } : {}),
          ...(data.emergencyContactName ? { emergencyContactName: data.emergencyContactName } : {}),
          ...(data.emergencyContactPhone ? { emergencyContactPhone: data.emergencyContactPhone } : {}),
          ...(data.emergencyContactRelationship
            ? { emergencyContactRelationship: data.emergencyContactRelationship }
            : {}),
          // No systemRole. A `systemRole` column in the CSV is ignored, not
          // obeyed — it used to let an importer mint admins in bulk.
        },
        auth,
      );
      imported++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return { imported, errors };
}

function escapeCSV(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * The branches this caller actually holds `branch:write` on.
 *
 * `auth.branchId` is the ACTIVE branch, not the authority branch:
 * `getActiveBranchId` returns `secondaryBranchId` whenever the member is at
 * their secondary branch. Anything that filters on it is asking "where are
 * they standing", when the question is "what may they touch" — and for an
 * export those differ in the dangerous direction, handing a branch admin
 * toggled to a secondary branch that branch's roll.
 *
 * Candidates come from the grants themselves and are then put through the one
 * matcher, so the role→capability mapping is never restated here. A
 * church-scoped grant names no branch and so contributes no candidate, which
 * is right: no church role carries `branch:write`.
 */
function branchesCallerCanWrite(auth: AuthContext): string[] {
  const candidates = new Set<string>();
  for (const grant of auth.grants ?? []) {
    if (grant.scope.kind === 'branch') candidates.add(grant.scope.id);
    if (grant.branchId) candidates.add(grant.branchId);
  }
  return [...candidates].filter((id) =>
    authHasCapability(auth, 'branch:write', { kind: 'branch', id }),
  );
}

export async function exportMembersCsv(
  db: Database,
  auth: AuthContext,
  ctx?: RequestContext,
): Promise<string> {
  let scopeCondition: SQL | undefined;
  if (auth.systemRole !== 'admin') {
    const writable = branchesCallerCanWrite(auth);
    if (writable.length === 0) {
      throw new ForbiddenError('You have no branch to export');
    }
    scopeCondition = inArray(members.homeBranchId, writable);
  }

  const rows = await db
    .select({
      // id / homeBranchId / memberType are not exported — they are what the
      // redaction below keys off. Without them every row went out raw.
      id: members.id,
      homeBranchId: members.homeBranchId,
      memberType: members.memberType,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
      phone: members.phone,
      gender: members.gender,
      dateOfBirth: members.dateOfBirth,
      address: members.address,
      city: members.city,
      branchName: branches.branchName,
      membershipDate: members.membershipDate,
      emergencyContactName: members.emergencyContactName,
      emergencyContactPhone: members.emergencyContactPhone,
      emergencyContactRelationship: members.emergencyContactRelationship,
      systemRole: members.systemRole,
      approvalStatus: members.approvalStatus,
    })
    .from(members)
    .innerJoin(branches, eq(members.homeBranchId, branches.id))
    .where(and(eq(members.isActive, true), ...(scopeCondition ? [scopeCondition] : [])))
    .orderBy(members.lastName, members.firstName);

  // The export carried NO redaction at all, so a minor's date of birth and
  // emergency contacts left through the CSV even where the directory would
  // have nulled them. Run every row through the same gate the screen uses —
  // the file must never be more generous than the page it came from.
  const guardedMemberIds = await getViewerGuardedMemberIds(db, auth);
  const redacted = rows.map((row) =>
    applyMinorProtection(row, hasDirectoryAccess(auth, row, guardedMemberIds)),
  );

  const headers = [
    'firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth',
    'address', 'city', 'branchName', 'membershipDate', 'emergencyContactName',
    'emergencyContactPhone', 'emergencyContactRelationship', 'systemRole', 'approvalStatus',
  ];

  const lines = [
    headers.join(','),
    ...redacted.map((r) => headers.map((h) => escapeCSV((r as Record<string, unknown>)[h])).join(',')),
  ];

  // A bulk read of the directory is the single highest-value exfiltration path
  // in the system — one request, every member the caller can reach, children
  // included. Article 33 gives 72 hours to decide whether a breach needs
  // reporting, and that decision needs to know who pulled the file and how
  // much of it. Before this, the export left no trace whatsoever.
  //
  // Awaited, not deferred: the Postgres client is per-request inside an
  // AsyncLocalStorage scope, so a `ctx.waitUntil` write either throws or does
  // I/O on a socket the request no longer owns, and the row vanishes.
  //
  // The metadata counts rows and names the scope. It deliberately does not
  // record WHICH members, nor any field value — that would make the audit log
  // a second copy of the directory under a different retention period.
  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.MemberExported,
    outcome: AuditOutcome.Success,
    targetType: 'member_directory',
    metadata: {
      rowCount: redacted.length,
      scope: auth.systemRole === 'admin' ? 'all_branches' : 'granted_branches',
      ...(auth.systemRole === 'admin' ? {} : { branchIds: branchesCallerCanWrite(auth) }),
      format: 'csv',
    },
    ...(ctx && { ctx }),
  });

  return lines.join('\n');
}

export async function switchActiveBranch(
  db: Database,
  auth: AuthContext,
  memberId: string,
  secrets: AuthSecrets,
): Promise<SwitchActiveBranchResponse> {
  // Only the member themselves can toggle their active branch
  if (auth.memberId !== memberId) {
    throw new ForbiddenError('You can only switch your own active branch');
  }

  const [member] = await db
    .select({
      id: members.id,
      homeBranchId: members.homeBranchId,
      secondaryBranchId: members.secondaryBranchId,
      isAtSecondaryBranch: members.isAtSecondaryBranch,
      systemRole: members.systemRole,
      email: members.email,
      tokenVersion: members.tokenVersion,
      activeRole: sql<string>`${auth.activeRole}`,
    })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));

  if (!member) throw new NotFoundError('Member not found');

  if (!member.secondaryBranchId) {
    throw new ValidationError('No secondary branch assigned to this member');
  }

  const nextIsAtSecondary = !member.isAtSecondaryBranch;

  await db
    .update(members)
    .set({ isAtSecondaryBranch: nextIsAtSecondary, updatedAt: sql`NOW()` })
    .where(eq(members.id, memberId));

  const activeBranchId = getActiveBranchId({
    homeBranchId: member.homeBranchId,
    secondaryBranchId: member.secondaryBranchId,
    isAtSecondaryBranch: nextIsAtSecondary,
  });

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: member.systemRole as AuthContext['systemRole'],
    branchId: activeBranchId,
    activeRole: auth.activeRole,
    branchSystemAdminBranchIds: auth.branchSystemAdminBranchIds,
    branchDataAdminBranchIds: auth.branchDataAdminBranchIds,
    // RBAC Phase 1: grants live outside the JWT; populated per-request.
    grants: [],
  };

  // The member's CURRENT generation, not the default. Minting a generation
  // zero token here for somebody on a later generation would sign them out on
  // their next refresh for doing nothing but switching branch.
  const tokens = await generateTokenPair(authContext, secrets, true, member.tokenVersion);

  return { tokens, isAtSecondaryBranch: nextIsAtSecondary, activeBranchId };
}

/**
 * Remove another member's second factor, as an administrator.
 *
 * This is the recovery path for the one failure the TOTP design cannot
 * recover from on its own: a member who has lost the phone holding their
 * authenticator AND never saved their backup codes. Without it they are
 * locked out permanently, and `docs/security/key-management.md` §9 already
 * described an admin doing this long before anything could.
 *
 * It is a sharp power, so three things are true of it by construction:
 *
 *   - `requireRole('admin')` gates it, not a capability. Removing someone's
 *     second factor is a bigger move than granting them a role, and the
 *     branch-level grant holders who can do the latter should not get this
 *     by inheritance.
 *   - The member is emailed. They cannot consent at the time - being locked
 *     out is the premise - so the notification is the only thing that reaches
 *     them if the reset was not legitimate. It is sent before this function
 *     returns, not queued behind a digest.
 *   - It is audited, including when there was nothing to remove.
 *
 * Stripping a second factor is exactly what an attacker who had taken over an
 * admin account would do before taking over a leader's. The alarm and the
 * record are therefore part of the feature, not decoration on it.
 *
 * **It also ends their existing sessions.** `revokeSessions` bumps the
 * member's token version, which strands every refresh token already minted.
 * An access token already issued keeps working until it expires, at most
 * fifteen minutes, because checking the version on every request would mean
 * a database read per request.
 */
export async function resetMemberMfa(
  db: Database,
  auth: AuthContext,
  memberId: string,
  ctx?: RequestContext,
): Promise<{ hadFactor: boolean }> {
  const [member] = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      isActive: members.isActive,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member || !member.isActive) throw new NotFoundError('Member not found');

  // Asked before removing, so the audit row can say which of the two
  // happened. "Nothing to remove" is worth recording: an admin who resets an
  // account that never had a factor is either confused or fishing, and a log
  // that only kept successes could not tell those apart from nothing at all.
  const hadFactor = await hasConfirmedFactor(db, memberId);

  await disableMfa(db, memberId);

  // End their sessions too. The premise of this endpoint is that the member
  // has lost the device holding their authenticator, and "lost" covers
  // "somebody else has it". Removing the factor while leaving a live session
  // on that device would hand the finder an account with one lock fewer.
  await revokeSessions(db, memberId);

  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.MfaReset,
    outcome: AuditOutcome.Success,
    targetType: 'member',
    targetId: memberId,
    // Never any part of the secret. A row carrying it would hand a reader the
    // factor it describes destroying.
    metadata: { outcome: hadFactor ? 'removed' : 'nothing-to-remove' },
    ...(ctx && { ctx }),
  });

  if (hadFactor) {
    try {
      const [actor] = await db
        .select({ firstName: members.firstName, lastName: members.lastName })
        .from(members)
        .where(eq(members.id, auth.memberId))
        .limit(1);

      await dispatchNotification(db, {
        eventType: NotificationEventType.SecurityMfaReset,
        recipientMemberIds: [memberId],
        subjectType: 'member',
        subjectId: memberId,
        payload: {
          resetByName: actor ? `${actor.firstName} ${actor.lastName ?? ''}`.trim() : null,
          occurredAt: new Date(),
          setupUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/profile/settings/security`,
        },
      });
    } catch {
      // dispatchNotification logs its own failures. Swallowed so a mail
      // outage cannot leave a locked-out member still locked out: the audit
      // row above is already written, which is the part that must not be lost.
    }
  }

  return { hadFactor };
}
