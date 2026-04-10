// @kairos/api - Donations Create Online Lambda (Task 15.2)
// Creates a Stripe payment intent for online donations.
// Validates input with donationCreateSchema.
// Creates donation record with status='pending' and stripePaymentId.
// Returns payment intent client_secret for frontend.
// GBP only for MVP. Stripe secret key cached from SSM Parameter Store.
//
// **Requirements: 15.2**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
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
} from '@kairos/utils';

const logger = createLogger('donations-create-online');

// Cache Stripe instance at module scope for Lambda warm starts
let stripeInstance: Stripe | null = null;
const ssm = new SSMClient({ region: process.env.AWS_REGION || 'eu-west-2' });

async function getStripe(): Promise<Stripe> {
  if (stripeInstance) return stripeInstance;

  const result = await ssm.send(
    new GetParameterCommand({
      Name: '/kairos/stripe/secret-key',
      WithDecryption: true,
    })
  );

  const apiKey = result.Parameter?.Value;
  if (!apiKey) {
    throw new BadRequestError('Stripe configuration is unavailable');
  }

  stripeInstance = new Stripe(apiKey);
  return stripeInstance;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Creating online donation', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(donationCreateSchema, {
      ...body,
      payment_method: 'Online',
    });

    // 3. Enforce branch-level authorization
    enforceBranchAccess(ctx, input.branch_id);

    const db = getDb();

    // 4. Verify member exists if provided (non-anonymous)
    if (input.member_id) {
      const [member] = await db
        .select({ memberId: members.memberId, homeBranchId: members.homeBranchId })
        .from(members)
        .where(
          and(eq(members.memberId, input.member_id), eq(members.isActive, true))
        )
        .limit(1);

      if (!member) {
        throw new NotFoundError('Member', String(input.member_id));
      }
    }

    // 5. Create Stripe payment intent (amount in pence for GBP)
    const stripe = await getStripe();
    const amountInPence = Math.round(input.amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      metadata: {
        branch_id: String(input.branch_id),
        member_id: input.member_id ? String(input.member_id) : '',
        donation_purpose: input.donation_purpose,
        is_anonymous: String(input.is_anonymous),
      },
    });

    // 6. Create donation record with status='pending'
    const [created] = await db
      .insert(donations)
      .values({
        memberId: input.is_anonymous ? null : (input.member_id ?? ctx.memberId),
        branchId: input.branch_id,
        donationDate: input.donation_date.toISOString().split('T')[0],
        amount: String(input.amount),
        currency: 'GBP',
        donationPurpose: input.donation_purpose,
        description: input.description,
        paymentMethod: 'Online',
        stripePaymentId: paymentIntent.id,
        status: 'pending',
        isAnonymous: input.is_anonymous,
        recordedBy: ctx.memberId,
      })
      .returning();

    logger.info('Online donation created', {
      donationId: created!.donationId,
      stripePaymentId: paymentIntent.id,
      amount: input.amount,
    });

    // 7. Return client_secret for frontend Stripe Elements
    return createdResponse({
      donation: created!,
      clientSecret: paymentIntent.client_secret,
      stripePaymentId: paymentIntent.id,
    });
  } catch (error) {
    return handleError(error, { operation: 'donations-create-online' });
  }
};
