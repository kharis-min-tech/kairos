import { eq, and, sql } from 'drizzle-orm';
import { authHasAnyCapability } from '../lib/grants';
import { authHasCapability } from '../lib/grants';
import type { Database } from '@kairos/database';
import { souls, members, outreachPrograms } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@kairos/utils';

/**
 * Convert a soul to a member
 * - Creates member with soul data
 * - Updates soul status to 'Converted'
 * - Sets converted_to_member_id
 * - Uses database transaction for atomicity
 * - Maps fields: first_name, last_name, phone, email, address, city, gender
 * - Sets home_branch_id from soul's branch
 * - Sets membership_date to current date
 */
export async function convertSoulToMember(
  db: Database,
  soulId: string,
  auth: AuthContext,
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  // Fetch soul with outreach program and branch relations
  const [soul] = await db
    .select({
      id: souls.id,
      outreachId: souls.outreachId,
      firstName: souls.firstName,
      lastName: souls.lastName,
      phone: souls.phone,
      email: souls.email,
      address: souls.address,
      city: souls.city,
      gender: souls.gender,
      status: souls.status,
      assignedMemberId: souls.assignedMemberId,
      branchId: outreachPrograms.branchId,
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .where(eq(souls.id, soulId));

  if (!soul) {
    throw new NotFoundError('Soul not found');
  }

  // Access control
  if (effectiveRole === 'member' && soul.assignedMemberId !== auth.memberId) {
    throw new ForbiddenError('You can only convert souls assigned to you');
  }

  if ((authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read')) && soul.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only convert souls from your branch');
  }

  // Check if already converted
  if (soul.status === 'Converted') {
    throw new ConflictError('Soul has already been converted to a member');
  }

  // Determine branch_id (use soul's outreach branch or auth user's branch for ad-hoc souls)
  const homeBranchId = soul.branchId ?? auth.branchId;

  // Check for duplicate email
  if (soul.email) {
    const [existingMember] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.email, soul.email), eq(members.isActive, true)))
      .limit(1);

    if (existingMember) {
      throw new ConflictError('A member with this email already exists');
    }
  }

  // Use transaction for atomicity
  return await db.transaction(async (tx) => {
    // Generate a temporary password hash (user will need to reset)
    // Using a random string that they can't guess - they'll need to use forgot password
    const bcrypt = await import('bcrypt');
    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // Generate email if not provided (required field in members table)
    const memberEmail = soul.email || `soul_${soul.id.substring(0, 8)}@temp.kairos.local`;

    // Create member
    const [newMember] = await tx
      .insert(members)
      .values({
        firstName: soul.firstName,
        lastName: soul.lastName,
        phone: soul.phone ?? null,
        email: memberEmail,
        address: soul.address ?? null,
        city: soul.city ?? null,
        gender: soul.gender as 'Male' | 'Female' | null,
        homeBranchId,
        membershipDate: sql`CURRENT_DATE`,
        emailVerified: false,
        approvalStatus: 'approved',
        systemRole: 'member',
        isActive: true,
        mustChangePassword: true,
        passwordHash: tempPasswordHash,
      })
      .returning();

    // Update soul status
    const [updatedSoul] = await tx
      .update(souls)
      .set({
        status: 'Converted',
        convertedToMemberId: newMember!.id,
        updatedAt: sql`NOW()`,
      })
      .where(eq(souls.id, soulId))
      .returning();

    return {
      soul: updatedSoul,
      member: newMember,
    };
  });
}
