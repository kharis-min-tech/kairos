// @kairos/api - Members Create Lambda
// Creates a new member record with pending status (is_active=false)
// Enforces branch-level authorization and validates input

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and } from 'drizzle-orm';
import { members } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  createdResponse,
  validateOrThrow,
  memberCreateSchema,
  createLogger,
  getDb,
  ConflictError,
} from '@kairos/utils';

const logger = createLogger('members-create');

/**
 * Lambda handler for creating a new member.
 *
 * Flow:
 * 1. Extract auth context from authorizer
 * 2. Parse and validate input body
 * 3. Enforce branch-level authorization
 * 4. Check for duplicate email/phone among active members
 * 5. Insert member with is_active=false (pending status)
 * 6. Return created member
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Creating member', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(memberCreateSchema, body);

    // 3. Enforce branch-level authorization
    enforceBranchAccess(ctx, input.home_branch_id);

    const db = getDb();

    // 4. Check for duplicate email among active members
    if (input.email) {
      const existingEmail = await db
        .select({ memberId: members.memberId })
        .from(members)
        .where(and(eq(members.email, input.email), eq(members.isActive, true)))
        .limit(1);

      if (existingEmail.length > 0) {
        throw new ConflictError('A member with this email already exists', [
          { field: 'email', message: 'Email is already in use by an active member' },
        ]);
      }
    }

    // Check for duplicate phone among active members
    if (input.phone) {
      const existingPhone = await db
        .select({ memberId: members.memberId })
        .from(members)
        .where(and(eq(members.phone, input.phone), eq(members.isActive, true)))
        .limit(1);

      if (existingPhone.length > 0) {
        throw new ConflictError('A member with this phone number already exists', [
          { field: 'phone', message: 'Phone number is already in use by an active member' },
        ]);
      }
    }

    // 5. Insert member with is_active=false (pending status)
    const [created] = await db
      .insert(members)
      .values({
        firstName: input.first_name,
        lastName: input.last_name,
        middleName: input.middle_name,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.date_of_birth ? input.date_of_birth.toISOString().split('T')[0] : undefined,
        gender: input.gender,
        address: input.address,
        city: input.city,
        postalCode: input.postal_code,
        homeBranchId: input.home_branch_id,
        isActive: false, // Pending status — awaiting approval
        photoUrl: input.photo_url,
        emergencyContactName: input.emergency_contact_name,
        emergencyContactPhone: input.emergency_contact_phone,
      })
      .returning();

    logger.info('Member created successfully', {
      memberId: created!.memberId,
      branchId: created!.homeBranchId,
      status: 'pending',
    });

    // 6. Return created member
    return createdResponse(created);
  } catch (error) {
    return handleError(error, { operation: 'members-create' });
  }
};
