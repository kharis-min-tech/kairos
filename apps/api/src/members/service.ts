import { eq, and, or, ilike, count, sql, exists, type SQL } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { Database } from '@kairos/database';
import { members, memberRoles, roles, branches, fellowshipMembers } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import type { SwitchActiveBranchResponse } from '@kairos/types';
import { getActiveBranchId, generateTokenPair } from '../auth/service';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  mmCreateUser,
  mmDeactivateUser,
  mmGetOrCreateChannel,
  mmAddUserToChannel,
  branchChannelName,
} from '@kairos/utils';
import { getOrCreateBranchTeamId, mmAddUserToTeam } from '../messaging/mm-branch-team';

function enforceMemberAccess(auth: AuthContext, memberId: string) {
  if (auth.systemRole === 'admin') return;
  if (auth.systemRole === 'pastor') return;
  if (auth.memberId === memberId) return;
  throw new ForbiddenError('You can only access your own profile');
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
  query: { page: number; limit: number; search?: string; branchId?: string; approvalStatus?: string; fellowshipId?: string },
) {
  // Pending members are inactive until approved, so skip isActive filter for pending queries
  const conditions: SQL[] = [];
  if (query.approvalStatus !== 'pending') {
    conditions.push(eq(members.isActive, true));
  }

  // Non-admin can only see their own branch (home or active secondary)
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
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

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        phone: members.phone,
        homeBranchId: members.homeBranchId,
        branchName: branches.branchName,
        gender: members.gender,
        membershipDate: members.membershipDate,
        approvalStatus: members.approvalStatus,
        systemRole: members.systemRole,
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

  return {
    data: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: total!.count,
      totalPages: Math.ceil(total!.count / query.limit),
    },
  };
}

export async function getMember(db: Database, memberId: string, auth: AuthContext) {
  enforceMemberAccess(auth, memberId);

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
      emailVerified: members.emailVerified,
      createdAt: members.createdAt,
      updatedAt: members.updatedAt,
    })
    .from(members)
    .innerJoin(branches, eq(members.homeBranchId, branches.id))
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));

  if (!member) throw new NotFoundError('Member not found');
  return member;
}

export async function getMyProfile(db: Database, auth: AuthContext) {
  return getMember(db, auth.memberId, { ...auth, systemRole: 'admin' });
}

export async function updateMember(
  db: Database,
  memberId: string,
  input: Record<string, unknown>,
  auth: AuthContext,
) {
  enforceMemberAccess(auth, memberId);

  const [existing] = await db
    .select({ id: members.id })
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
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can approve members');
  }

  const [member] = await db
    .select({ id: members.id, approvalStatus: members.approvalStatus, email: members.email, firstName: members.firstName, lastName: members.lastName, homeBranchId: members.homeBranchId })
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

  // Fire-and-forget: email + Mattermost provisioning
  if (member.email) {
    const memberName = member.firstName ?? 'Member';
    if (approved) {
      sendAccountApprovedEmail(member.email, memberName).catch(() => {});

      // Provision Mattermost account and add to branch channel
      void (async () => {
        try {
          const username = member.email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9._-]/g, '') + '-' + member.id.slice(0, 4);
          const mmUserId = await mmCreateUser(
            member.email,
            username,
            member.firstName ?? '',
            member.lastName ?? '',
          );
          if (mmUserId) {
            // Persist mattermostUserId
            await db
              .update(members)
              .set({ mattermostUserId: mmUserId, updatedAt: sql`NOW()` })
              .where(eq(members.id, memberId));

            // Add to branch team and channel
            const teamId = await getOrCreateBranchTeamId(db, member.homeBranchId);
            if (teamId) {
              await mmAddUserToTeam(teamId, mmUserId);
              const channelId = await mmGetOrCreateChannel(
                teamId,
                branchChannelName(member.homeBranchId),
                `Branch ${member.homeBranchId.slice(0, 8)}`,
              );
              if (channelId) await mmAddUserToChannel(channelId, mmUserId);
            }
          }
        } catch (_err) {
          // Non-fatal — Mattermost unavailability must not break approval
        }
      })();
    } else {
      sendAccountRejectedEmail(member.email, memberName).catch(() => {});
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

  // Verify member exists
  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));
  if (!member) throw new NotFoundError('Member not found');

  // Verify role exists
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, input.roleId), eq(roles.isActive, true)));
  if (!role) throw new ValidationError('Role not found or inactive');

  // Verify branch exists
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, input.branchId), eq(branches.isActive, true)));
  if (!branch) throw new ValidationError('Branch not found or inactive');

  // Check for active duplicate
  const [existing] = await db
    .select({ id: memberRoles.id })
    .from(memberRoles)
    .where(
      and(
        eq(memberRoles.memberId, memberId),
        eq(memberRoles.roleId, input.roleId),
        eq(memberRoles.branchId, input.branchId),
        eq(memberRoles.isActive, true),
      ),
    );
  if (existing) throw new ConflictError('Member already has this role in this branch');

  const [assignment] = await db
    .insert(memberRoles)
    .values({
      memberId,
      roleId: input.roleId,
      branchId: input.branchId,
      notes: input.notes ?? null,
    })
    .returning();

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
    .select({ id: memberRoles.id, memberId: memberRoles.memberId })
    .from(memberRoles)
    .where(and(eq(memberRoles.id, roleAssignmentId), eq(memberRoles.isActive, true)));

  if (!assignment) throw new NotFoundError('Role assignment not found');
  if (assignment.memberId !== memberId) throw new ValidationError('Role assignment does not belong to this member');

  const [updated] = await db
    .update(memberRoles)
    .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: sql`NOW()` })
    .where(eq(memberRoles.id, roleAssignmentId))
    .returning();

  return updated;
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
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can deactivate members');
  }

  const conditions = [eq(members.id, memberId), eq(members.isActive, true)];
  if (auth.systemRole === 'pastor') {
    conditions.push(eq(members.homeBranchId, auth.branchId));
  }

  const [member] = await db
    .select({ id: members.id, mattermostUserId: members.mattermostUserId })
    .from(members)
    .where(and(...conditions));

  if (!member) throw new NotFoundError('Member not found');

  // Deactivate all role assignments
  await db
    .update(memberRoles)
    .set({ isActive: false, endDate: sql`CURRENT_DATE`, updatedAt: sql`NOW()` })
    .where(and(eq(memberRoles.memberId, memberId), eq(memberRoles.isActive, true)));

  // Soft-delete member
  const [updated] = await db
    .update(members)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(eq(members.id, memberId))
    .returning();

  // Deactivate Mattermost account non-blocking
  if (member.mattermostUserId) {
    mmDeactivateUser(member.mattermostUserId).catch(() => {});
  }

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
    systemRole?: string;
  },
  auth: AuthContext,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can create members');
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
  const generatedPassword = randomBytes(8).toString('base64url');
  const passwordHash = await bcrypt.hash(generatedPassword, 10);

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
      systemRole: input.systemRole ?? 'member',
      isActive: true,
      mustChangePassword: true,
    })
    .returning();

  if (!created) throw new Error('Failed to create member');

  return { member: created, generatedPassword };
}

export async function reactivateMember(
  db: Database,
  memberId: string,
  auth: AuthContext,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can reactivate members');
  }

  const query = db
    .select({ id: members.id, isActive: members.isActive })
    .from(members)
    .where(
      auth.systemRole === 'pastor'
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

      if (!row['firstName'] || !row['lastName'] || !row['email']) {
        errors.push(`Row ${i + 1}: firstName, lastName, and email are required`);
        continue;
      }

      await createMember(
        db,
        {
          firstName: row['firstName']!,
          lastName: row['lastName']!,
          email: row['email']!,
          homeBranchId: row['homeBranchId'] || auth.branchId,
          phone: row['phone'] || undefined,
          gender: (row['gender'] as 'Male' | 'Female') || undefined,
          dateOfBirth: row['dateOfBirth'] || undefined,
          middleName: row['middleName'] || undefined,
          address: row['address'] || undefined,
          city: row['city'] || undefined,
          emergencyContactName: row['emergencyContactName'] || undefined,
          emergencyContactPhone: row['emergencyContactPhone'] || undefined,
          emergencyContactRelationship: row['emergencyContactRelationship'] || undefined,
          systemRole: row['systemRole'] || undefined,
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

export async function exportMembersCsv(db: Database, auth: AuthContext): Promise<string> {
  const rows = await db
    .select({
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
    .where(
      auth.systemRole === 'admin'
        ? eq(members.isActive, true)
        : and(eq(members.isActive, true), eq(members.homeBranchId, auth.branchId)),
    )
    .orderBy(members.lastName, members.firstName);

  const headers = [
    'firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth',
    'address', 'city', 'branchName', 'membershipDate', 'emergencyContactName',
    'emergencyContactPhone', 'emergencyContactRelationship', 'systemRole', 'approvalStatus',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCSV((r as Record<string, unknown>)[h])).join(',')),
  ];

  return lines.join('\n');
}

export async function switchActiveBranch(
  db: Database,
  auth: AuthContext,
  memberId: string,
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
  };

  const tokens = generateTokenPair(authContext);

  return { tokens, isAtSecondaryBranch: nextIsAtSecondary, activeBranchId };
}
