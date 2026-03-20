// @kairos/api - Donations Create Manual Lambda (Task 15.6)
// Records manual donations (Cash, Check, Bank Transfer, Mobile Money).
// Allows linking to a member or recording as anonymous (is_anonymous=TRUE, no member_id).
// Validates with donationCreateSchema.
// Stores recorded_by as the admin/pastor's member_id.
// Enforces branch-level authorization.
// GBP only for MVP.
//
// **Requirements: 15.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { donations, members } from '@kairos/database';
import { eq, and } from 'drizzle-orm';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  donationCreateSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
  isAdmin,
  isPastor,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('donations-create-manual');

/** Payment methods allowed for manual entry */
const MANUAL_PAYMENT_METHODS = ['Cash', 'Check', 'Bank Transfer', 'Mobile Money', 'Other'];

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Creating manual donation', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Only admins and pastors can record manual donations
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      throw new ForbiddenError('Only admins and pastors can record manual donations');
    }

    // 3. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(donationCreateSchema, body);

    // 4. Validate payment method is a manual type
    if (!MANUAL_PAYMENT_METHODS.includes(input.payment_method)) {
      throw new BadRequestError(
        `Invalid payment method for manual entry. Allowed: ${MANUAL_PAYMENT_METHODS.join(', ')}`
      );
    }

    // 5. Enforce branch-level authorization
    enforceBranchAccess(ctx, input.branch_id);

    const db = getDb();

    // 6. Verify member exists if provided (non-anonymous)
    if (input.member_id && !input.is_anonymous) {
      const [member] = await db
        .select({ memberId: members.memberId })
        .from(members)
        .where(
          and(eq(members.memberId, input.member_id), eq(members.isActive, true))
        )
        .limit(1);

      if (!member) {
        throw new NotFoundError('Member', String(input.member_id));
      }
    }

    // 7. Insert donation record
    const [created] = await db
      .insert(donations)
      .values({
        memberId: input.is_anonymous ? null : input.member_id,
        branchId: input.branch_id,
        donationDate: input.donation_date.toISOString().split('T')[0],
        amount: String(input.amount),
        currency: 'GBP',
        donationPurpose: input.donation_purpose,
        description: input.description,
        paymentMethod: input.payment_method,
        referenceNumber: (body.reference_number as string) || undefined,
        status: 'completed',
        isAnonymous: input.is_anonymous,
        notes: (body.notes as string) || undefined,
        recordedBy: ctx.memberId,
      })
      .returning();

    logger.info('Manual donation created', {
      donationId: created!.donationId,
      branchId: input.branch_id,
      amount: input.amount,
      paymentMethod: input.payment_method,
      isAnonymous: input.is_anonymous,
    });

    // 8. Return created donation
    return createdResponse(created!);
  } catch (error) {
    return handleError(error, { operation: 'donations-create-manual' });
  }
};
