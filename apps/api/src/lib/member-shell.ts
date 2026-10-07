import { sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { memberGuardians, members } from '@kairos/database';
import { hashPassword } from '@kairos/utils';

/** Shape for minting a member shell. */
export interface MemberShellInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string;
  middleName?: string | null;
  dateOfBirth?: string | null;
  gender?: 'Male' | 'Female' | null;
  memberType: 'attendee' | 'visitor' | 'child';
  /**
   * Who is responsible for this person. A child may have two parents and often
   * a carer as well, so this is a list — it used to be a single id, which made
   * the caller pick one and lose the rest.
   */
  guardians?: GuardianLink[];
}

export interface GuardianLink {
  memberId: string;
  /** Mother, Father, Grandparent, Carer, Other. Null when genuinely unknown. */
  relationship?: string | null;
  /** Who to contact first. The first link defaults to primary. */
  isPrimary?: boolean;
}

/**
 * Mint a member shell (temp email + temp password), returning its id.
 * Shared by the forms module (altar-call attendee, first-time-visitor /
 * child shells) and the attendance module (first-time visitors at a service).
 *
 * `memberType` lets the caller mint an attendee, visitor, or child;
 * `guardians` links a child shell to the adults responsible for it. randomUUID guarantees
 * a unique synthetic email even when several shells are minted in the same tick
 * (where Date.now() alone would collide on the global-unique members.email).
 */
export async function createMemberShell(
  db: Database,
  branchId: string,
  data: MemberShellInput,
): Promise<string> {
  const tempPassword = `temp_${crypto.randomUUID()}`;
  const tempPasswordHash = await hashPassword(tempPassword);
  const email =
    data.email && data.email.trim().length > 0
      ? data.email
      : `${data.memberType}_${crypto.randomUUID()}@temp.kairos.local`;

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
      isActive: true,
      mustChangePassword: true,
      passwordHash: tempPasswordHash,
    })
    .returning();

  await linkGuardians(db, newMember!.id, data.guardians ?? []);

  return newMember!.id;
}

/**
 * Attach guardians to a member, idempotently.
 *
 * Duplicates are collapsed by member id, keeping the first named relationship
 * — the forms pass the subject link and the father/mother references
 * separately and the same person can legitimately be both. Self-links are
 * dropped rather than rejected: a form that somehow names the child as its own
 * guardian should not take the whole submission down, and the CHECK would.
 *
 * Exactly one link is marked primary: whichever the caller marked, else the
 * first. Re-running is safe — the partial unique index on (member_id,
 * guardian_member_id) WHERE is_active means a repeat is a no-op.
 */
export async function linkGuardians(
  db: Database,
  memberId: string,
  guardians: GuardianLink[],
): Promise<void> {
  const seen = new Map<string, GuardianLink>();
  for (const g of guardians) {
    if (!g.memberId || g.memberId === memberId) continue;
    const existing = seen.get(g.memberId);
    if (!existing) {
      seen.set(g.memberId, g);
    } else if (!existing.relationship && g.relationship) {
      seen.set(g.memberId, { ...existing, relationship: g.relationship });
    }
  }
  if (seen.size === 0) return;

  const links = [...seen.values()];
  const primaryIndex = Math.max(
    links.findIndex((g) => g.isPrimary === true),
    0,
  );

  await db
    .insert(memberGuardians)
    .values(
      links.map((g, i) => ({
        memberId,
        guardianMemberId: g.memberId,
        relationship: g.relationship ?? null,
        isPrimary: i === primaryIndex,
      })),
    )
    .onConflictDoNothing();
}
