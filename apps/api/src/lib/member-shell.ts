import { sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { members } from '@kairos/database';

/** Shape for minting a member shell. */
export interface MemberShellInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string;
  middleName?: string | null;
  dateOfBirth?: string | null;
  gender?: 'Male' | 'Female' | null;
  memberType: 'prospect' | 'visitor' | 'child';
  guardianMemberId?: string | null;
}

/**
 * Mint a member shell (temp email + temp password), returning its id.
 * Shared by the forms module (altar-call prospect, first-time-visitor /
 * child shells) and the attendance module (first-time visitors at a service).
 *
 * `memberType` lets the caller mint a prospect, visitor, or child;
 * `guardianMemberId` links a child shell to its guardian. randomUUID guarantees
 * a unique synthetic email even when several shells are minted in the same tick
 * (where Date.now() alone would collide on the global-unique members.email).
 */
export async function createMemberShell(
  db: Database,
  branchId: string,
  data: MemberShellInput,
): Promise<string> {
  const bcrypt = await import('bcrypt');
  const { randomUUID } = await import('node:crypto');
  const tempPassword = `temp_${randomUUID()}`;
  const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
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
