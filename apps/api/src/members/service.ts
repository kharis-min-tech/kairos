import { eq, and, or, ilike, count, sql, type SQL } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { Database } from '@kairos/database';
import { members, memberRoles, roles, branches } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@kairos/utils';

function enforceMemberAccess(auth: AuthContext, memberId: string) {
  if (auth.systemRole === 'admin') return;
  if (auth.memberId === memberId) return;
  throw new ForbiddenError('You can only access your own profile');
}

export async function listMembers(
  db: Database,
  auth: AuthContext,
  query: { page: number; limit: number; search?: string; branchId?: string; approvalStatus?: string },
) {
  // Pending members are inactive until approved, so skip isActive filter for pending queries
  const conditions: SQL[] = [];
  if (query.approvalStatus !== 'pending') {
    conditions.push(eq(members.isActive, true));
  }

  // Non-admin can only see their own branch
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    conditions.push(eq(members.homeBranchId, auth.branchId));
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
      membershipDate: members.membershipDate,
      isActive: members.isActive,
      photoUrl: members.photoUrl,
      emergencyContactName: members.emergencyContactName,
      emergencyContactPhone: members.emergencyContactPhone,
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

  const [updated] = await db
    .update(members)
    .set({ ...input, updatedAt: sql`NOW()` })
    .where(eq(members.id, memberId))
    .returning();

  return updated;
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
    .select({ id: members.id, approvalStatus: members.approvalStatus })
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
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can deactivate members');
  }

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)));

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
    emergencyContactName?: string;
    emergencyContactPhone?: string;
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
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      homeBranchId: input.homeBranchId,
      passwordHash,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: input.systemRole ?? 'member',
      isActive: true,
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
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can reactivate members');
  }

  const [member] = await db
    .select({ id: members.id, isActive: members.isActive })
    .from(members)
    .where(eq(members.id, memberId));

  if (!member) throw new NotFoundError('Member not found');
  if (member.isActive) throw new ConflictError('Member is already active');

  const [updated] = await db
    .update(members)
    .set({ isActive: true, approvalStatus: 'approved', updatedAt: sql`NOW()` })
    .where(eq(members.id, memberId))
    .returning();

  return updated;
}
