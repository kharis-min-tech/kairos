import { and, eq, notInArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { memberRoles, roles } from '@kairos/database';
import { sql } from 'drizzle-orm';

// ── Role-name → role.id resolution ────────────────────────
//
// The functional-role bundles map to DB role rows by name (see
// `DB_ROLE_NAME_TO_FUNCTIONAL` in `grants.ts`). Sync helpers need the role.id
// to write `member_roles` rows; we look it up on demand. Cheap enough — the
// `roles` table is tiny and these helpers run only on leadership changes,
// not on every request.

async function getRoleIdByName(db: Database, roleName: string): Promise<string> {
  const [row] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.roleName, roleName))
    .limit(1);
  if (!row) {
    throw new Error(`RBAC role "${roleName}" is not seeded`);
  }
  return row.id;
}

// ── Sync helpers ───────────────────────────────────────────
//
// Each helper takes the "intended" set of memberIds for a single
// (role, scope) and reconciles `member_roles` to match:
//   - Active grants whose memberId isn't in the target set → deactivated.
//   - memberIds in the target set without an active grant → grant inserted.
// Idempotent — running twice is a no-op. Safe to call inside a transaction
// or alongside the primary FK mutation; the partial unique index
// `uq_member_roles_active_assignment` catches concurrent inserts.

async function syncGrantsForScope(
  db: Database,
  args: {
    roleName: string;
    scopeKind: 'branch' | 'fellowship' | 'department';
    scopeId: string;
    branchId: string;
    activeMemberIds: string[];
  },
): Promise<void> {
  const roleId = await getRoleIdByName(db, args.roleName);

  // 1) Deactivate any active grant whose memberId isn't in the target set.
  const baseConditions = [
    eq(memberRoles.roleId, roleId),
    eq(memberRoles.scopeKind, args.scopeKind),
    eq(memberRoles.scopeId, args.scopeId),
    eq(memberRoles.isActive, true),
  ];
  if (args.activeMemberIds.length > 0) {
    baseConditions.push(notInArray(memberRoles.memberId, args.activeMemberIds));
  }
  await db
    .update(memberRoles)
    .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: new Date() })
    .where(and(...baseConditions));

  // 2) Ensure an active grant exists for each target memberId.
  for (const memberId of args.activeMemberIds) {
    const [existing] = await db
      .select({ id: memberRoles.id })
      .from(memberRoles)
      .where(
        and(
          eq(memberRoles.memberId, memberId),
          eq(memberRoles.roleId, roleId),
          eq(memberRoles.scopeKind, args.scopeKind),
          eq(memberRoles.scopeId, args.scopeId),
          eq(memberRoles.isActive, true),
        ),
      )
      .limit(1);
    if (existing) continue;

    try {
      await db.insert(memberRoles).values({
        memberId,
        roleId,
        branchId: args.branchId,
        scopeKind: args.scopeKind,
        scopeId: args.scopeId,
      });
    } catch (err) {
      // 23505 = unique_violation; another concurrent caller already inserted
      // a matching active grant. The partial unique index guarantees we
      // converge regardless of who wins the race.
      if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === '23505') {
        continue;
      }
      throw err;
    }
  }
}

/**
 * Reconcile FellowshipLeader grants for one fellowship. Pass the union of
 * `leaderId` + `coLeaderId` (filter out nulls). On deactivation, pass `[]`.
 */
export async function syncFellowshipLeaderGrants(
  db: Database,
  args: {
    fellowshipId: string;
    branchId: string;
    leaderMemberIds: string[];
  },
): Promise<void> {
  await syncGrantsForScope(db, {
    roleName: 'Fellowship Leader',
    scopeKind: 'fellowship',
    scopeId: args.fellowshipId,
    branchId: args.branchId,
    activeMemberIds: args.leaderMemberIds,
  });
}

/**
 * Reconcile DepartmentLead grants for one branch department. Lead is a single
 * memberId (or null). Pass `[memberId]` when set, `[]` when unset.
 */
export async function syncDepartmentLeadGrants(
  db: Database,
  args: {
    branchDepartmentId: string;
    branchId: string;
    leadMemberId: string | null;
  },
): Promise<void> {
  await syncGrantsForScope(db, {
    roleName: 'Department Lead',
    scopeKind: 'department',
    scopeId: args.branchDepartmentId,
    branchId: args.branchId,
    activeMemberIds: args.leadMemberId ? [args.leadMemberId] : [],
  });
}

/**
 * Reconcile DepartmentDeputy grants. Same shape as lead, separate role row.
 */
export async function syncDepartmentDeputyGrants(
  db: Database,
  args: {
    branchDepartmentId: string;
    branchId: string;
    deputyMemberId: string | null;
  },
): Promise<void> {
  await syncGrantsForScope(db, {
    roleName: 'Department Deputy',
    scopeKind: 'department',
    scopeId: args.branchDepartmentId,
    branchId: args.branchId,
    activeMemberIds: args.deputyMemberId ? [args.deputyMemberId] : [],
  });
}
