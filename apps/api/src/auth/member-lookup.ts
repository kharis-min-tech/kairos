// @kairos/api - Database member and role lookup for the Custom Authorizer
// Looks up member by email, checks active status, and determines effective roles

import { eq, and } from 'drizzle-orm';
import { getDb } from '@kairos/utils';
import {
  members,
  branchLeadership,
  branchDepartments,
  fellowships,
} from '@kairos/database';

/** Result of a member lookup with resolved roles */
export interface MemberLookupResult {
  /** The member's database ID */
  memberId: string;
  /** The member's home branch ID */
  branchId: string;
  /** The member's email address */
  email: string;
  /** Effective roles determined from Cognito attributes and database records */
  roles: string[];
}

/**
 * Looks up a member by email and determines their effective roles.
 *
 * Role determination logic:
 * - **Admin**: Set via Cognito custom attribute `custom:role = Admin`
 * - **Pastor**: Active branch_leadership record with role = 'Main Pastor' and is_current = TRUE
 * - **Elder**: Active branch_leadership record with role = 'Elder' and is_current = TRUE
 *   (treated as Pastor-level for authorization)
 * - **Leader**: Department lead/deputy or fellowship leader/co-leader
 * - **Member**: Default role for all active members
 *
 * @param email - The member's email address from the JWT
 * @param cognitoRole - The custom:role attribute from Cognito (optional)
 * @returns Member lookup result with resolved roles
 * @throws Error if member not found or inactive
 */
export async function lookupMember(
  email: string,
  cognitoRole?: string
): Promise<MemberLookupResult> {
  const db = getDb();

  // 1. Look up member by email
  const memberRecords = await db
    .select({
      memberId: members.id,
      homeBranchId: members.homeBranchId,
      email: members.email,
      isActive: members.isActive,
    })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  if (memberRecords.length === 0) {
    throw new Error(`Member not found for email: ${email}`);
  }

  const member = memberRecords[0]!;

  // 2. Verify member is active
  if (!member.isActive) {
    throw new Error('Member account is inactive');
  }

  // 3. Determine effective roles
  const roles = await determineRoles(
    db,
    member.memberId as string,
    cognitoRole
  );

  return {
    memberId: member.memberId as string,
    branchId: member.homeBranchId,
    email: member.email ?? email,
    roles,
  };
}

/**
 * Determines the effective roles for a member based on Cognito attributes
 * and database records.
 *
 * @param db - Database client
 * @param memberId - The member's database ID
 * @param cognitoRole - The custom:role attribute from Cognito
 * @returns Array of role strings
 */
async function determineRoles(
  db: ReturnType<typeof getDb>,
  memberId: string,
  cognitoRole?: string
): Promise<string[]> {
  const roles: string[] = [];

  // Admin role from Cognito custom attribute
  if (cognitoRole === 'Admin') {
    roles.push('Admin');
  }

  // Check branch leadership (Pastor / Elder)
  const leadershipRecords = await db
    .select({
      role: branchLeadership.role,
    })
    .from(branchLeadership)
    .where(
      and(
        eq(branchLeadership.memberId, memberId),
        eq(branchLeadership.isCurrent, true)
      )
    );

  for (const record of leadershipRecords) {
    if (record.role === 'Main Pastor') {
      roles.push('Pastor');
    }
    if (record.role === 'Elder') {
      // Elders are treated as Pastor-level for authorization
      roles.push('Pastor');
    }
  }

  // Check department leadership (Lead or Deputy)
  const departmentLeadRecords = await db
    .select({
      leadMemberId: branchDepartments.leadMemberId,
      deputyMemberId: branchDepartments.deputyMemberId,
    })
    .from(branchDepartments)
    .where(eq(branchDepartments.isActive, true));

  const isDepartmentLeader = departmentLeadRecords.some(
    (dept) =>
      (dept.leadMemberId as unknown as string) === memberId || (dept.deputyMemberId as unknown as string) === memberId
  );

  // Check fellowship leadership (Leader or Co-Leader)
  const fellowshipLeadRecords = await db
    .select({
      leaderId: fellowships.leaderId,
      coLeaderId: fellowships.coLeaderId,
    })
    .from(fellowships)
    .where(eq(fellowships.isActive, true));

  const isFellowshipLeader = fellowshipLeadRecords.some(
    (f) => (f.leaderId as unknown as string) === memberId || (f.coLeaderId as unknown as string) === memberId
  );

  if (isDepartmentLeader || isFellowshipLeader) {
    roles.push('Leader');
  }

  // Default: every active member has the Member role
  roles.push('Member');

  // Deduplicate roles (e.g., if both Main Pastor and Elder)
  return [...new Set(roles)];
}
