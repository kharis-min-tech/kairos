// @kairos/api - Members Update Lambda
// Updates a member profile with validation
// Validates email/phone uniqueness among active members
// Prevents members from changing home_branch_id, membership_date, status (is_active)

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, ne } from 'drizzle-orm';
import { members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  isPastor,
  handleError,
  successResponse,
  validateOrThrow,
  memberUpdateSchema,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '@kairos/utils';

const logger = createLogger('members-update');

/** Fields that regular members cannot change */
const RESTRICTED_FIELDS = ['home_branch_id', 'membership_date', 'is_active'] as const;

/**
 * Lambda handler for updating a member profile.
 *
 * Path parameter: memberId
 *
 * Access control:
 * - Admin: can update any member
 * - Pastor: can update members in their branch
 * - Member: can update only their own profile (restricted fields excluded)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    const targetMemberId = parseInt(event.pathParameters?.memberId || '', 10);

    if (isNaN(targetMemberId)) {
      throw new NotFoundError('Member', event.pathParameters?.memberId);
    }

    logger.info('Updating member', { userId: ctx.memberId, targetMemberId });

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');

    // Reject restricted fields from non-admin users
    for (const field of RESTRICTED_FIELDS) {
      if (field in body) {
        if (!isAdmin(ctx)) {
          throw new BadRequestError(`You cannot change the '${field}' field`, [
            { field, message: `Changing '${field}' is restricted to administrators` },
          ]);
        }
      }
    }

    const input = validateOrThrow(memberUpdateSchema, body);

    const db = getDb();

    // 3. Fetch existing member
    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.memberId, targetMemberId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Member', String(targetMemberId));
    }

    // 4. Enforce access control
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      if (ctx.memberId !== targetMemberId) {
        throw new ForbiddenError('You can only update your own profile');
      }
    } else if (isPastor(ctx) && !isAdmin(ctx)) {
      if (existing.homeBranchId !== ctx.branchId) {
        throw new ForbiddenError('You can only update members in your branch');
      }
    }

    // 5. Check email uniqueness among active members
    if (input.email && input.email !== existing.email) {
      const existingEmail = await db
        .select({ memberId: members.memberId })
        .from(members)
        .where(
          and(
            eq(members.email, input.email),
            eq(members.isActive, true),
            ne(members.memberId, targetMemberId)
          )
        )
        .limit(1);

      if (existingEmail.length > 0) {
        throw new ConflictError('A member with this email already exists', [
          { field: 'email', message: 'Email is already in use by an active member' },
        ]);
      }
    }

    // 6. Check phone uniqueness among active members
    if (input.phone && input.phone !== existing.phone) {
      const existingPhone = await db
        .select({ memberId: members.memberId })
        .from(members)
        .where(
          and(
            eq(members.phone, input.phone),
            eq(members.isActive, true),
            ne(members.memberId, targetMemberId)
          )
        )
        .limit(1);

      if (existingPhone.length > 0) {
        throw new ConflictError('A member with this phone number already exists', [
          { field: 'phone', message: 'Phone number is already in use by an active member' },
        ]);
      }
    }

    // 7. Build update values (only include provided fields)
    const updateValues: Record<string, unknown> = {};
    if (input.first_name !== undefined) updateValues.firstName = input.first_name;
    if (input.last_name !== undefined) updateValues.lastName = input.last_name;
    if (input.middle_name !== undefined) updateValues.middleName = input.middle_name;
    if (input.email !== undefined) updateValues.email = input.email;
    if (input.phone !== undefined) updateValues.phone = input.phone;
    if (input.date_of_birth !== undefined) {
      updateValues.dateOfBirth = input.date_of_birth.toISOString().split('T')[0];
    }
    if (input.gender !== undefined) updateValues.gender = input.gender;
    if (input.address !== undefined) updateValues.address = input.address;
    if (input.city !== undefined) updateValues.city = input.city;
    if (input.postal_code !== undefined) updateValues.postalCode = input.postal_code;
    if (input.photo_url !== undefined) updateValues.photoUrl = input.photo_url;
    if (input.emergency_contact_name !== undefined) {
      updateValues.emergencyContactName = input.emergency_contact_name;
    }
    if (input.emergency_contact_phone !== undefined) {
      updateValues.emergencyContactPhone = input.emergency_contact_phone;
    }

    if (Object.keys(updateValues).length === 0) {
      return successResponse(existing);
    }

    // 8. Update member
    const [updated] = await db
      .update(members)
      .set(updateValues)
      .where(eq(members.memberId, targetMemberId))
      .returning();

    logger.info('Member updated successfully', {
      memberId: targetMemberId,
      updatedFields: Object.keys(updateValues),
    });

    return successResponse(updated);
  } catch (error) {
    return handleError(error, { operation: 'members-update' });
  }
};
