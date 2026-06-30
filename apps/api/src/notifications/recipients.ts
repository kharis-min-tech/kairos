import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { memberRoles, roles, fellowships, branchDepartments } from '@kairos/database';

/**
 * Notification recipient resolvers — find the set of member IDs to fan an
 * event out to. Used by services that emit workflow / lifecycle events
 * affecting a branch / fellowship / department record.
 *
 * The dispatcher de-dupes recipients automatically, so callers can union
 * multiple resolver outputs without worrying about overlap.
 */

const BRANCH_AUTHORITY_ROLE_NAMES = ['Branch System Admin', 'Branch Data Admin'];

/**
 * Members holding BranchAdmin or BranchDataAdmin grants for the given branch.
 * This is the "authority lens" defined in
 * [[project-branch-authority-vs-identity]] — the people who can act on
 * branch-scoped records.
 */
export async function resolveBranchAuthority(db: Database, branchId: string): Promise<string[]> {
  const rows = await db
    .select({ memberId: memberRoles.memberId })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .where(
      and(
        eq(memberRoles.branchId, branchId),
        eq(memberRoles.isActive, true),
        eq(roles.isActive, true),
        inArray(roles.roleName, BRANCH_AUTHORITY_ROLE_NAMES),
      ),
    );
  return Array.from(new Set(rows.map((r) => r.memberId)));
}

/**
 * Members listed as the leader or co-leader of a fellowship. Reads from
 * fellowships.leaderId / coLeaderId — the canonical assignment source.
 */
export async function resolveFellowshipLeaders(db: Database, fellowshipId: string): Promise<string[]> {
  const [row] = await db
    .select({ leaderId: fellowships.leaderId, coLeaderId: fellowships.coLeaderId })
    .from(fellowships)
    .where(eq(fellowships.id, fellowshipId))
    .limit(1);
  if (!row) return [];
  return [row.leaderId, row.coLeaderId].filter((x): x is string => !!x);
}

/**
 * Department lead + deputy for a branch_department row.
 */
export async function resolveDepartmentLeads(db: Database, branchDepartmentId: string): Promise<string[]> {
  const [row] = await db
    .select({
      leadMemberId: branchDepartments.leadMemberId,
      deputyMemberId: branchDepartments.deputyMemberId,
    })
    .from(branchDepartments)
    .where(eq(branchDepartments.id, branchDepartmentId))
    .limit(1);
  if (!row) return [];
  return [row.leadMemberId, row.deputyMemberId].filter((x): x is string => !!x);
}

/**
 * Members holding the SafeguardingLead role in the given branch — for
 * minor-related events that must route to SG-Leads regardless of branch
 * authority overlap.
 */
export async function resolveSafeguardingLeads(db: Database, branchId: string): Promise<string[]> {
  const rows = await db
    .select({ memberId: memberRoles.memberId })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .where(
      and(
        eq(memberRoles.branchId, branchId),
        eq(memberRoles.isActive, true),
        eq(roles.isActive, true),
        eq(roles.roleName, 'Safeguarding Lead'),
      ),
    );
  return Array.from(new Set(rows.map((r) => r.memberId)));
}
