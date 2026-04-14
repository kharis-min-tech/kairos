// @kairos/api - Donations Stripe Webhook Lambda (Task 15.4)
// Verifies Stripe webhook signature.
// Handles payment_intent.succeeded → updates donation status to 'completed'.
// Handles payment_intent.payment_failed → updates donation status to 'failed'.
// Returns 200 OK to Stripe on all handled events.
// Webhook secret cached from SSM Parameter Store.
//
// **Requirements: 15.4**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { donations } from '@kairos/database';
import { eq, sql } from 'drizzle-orm';
import {
  handleError,
  createLogger,
  getDb,
  BadRequestError,
} from '@kairos/utils';

const logger = createLogger('donations-webhook');

// Cache Stripe instance and webhook secret at module scope
let stripeInstance: Stripe | null = null;
let webhookSecret: string | null = null;
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

async function getWebhookSecret(): Promise<string> {
  if (webhookSecret) return webhookSecret;

  const result = await ssm.send(
    new GetParameterCommand({
      Name: '/kairos/stripe/webhook-secret',
      WithDecryption: true,
    })
  );

  const secret = result.Parameter?.Value;
  if (!secret) {
    throw new BadRequestError('Webhook secret configuration is unavailable');
  }

  webhookSecret = secret;
  return secret;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const stripe = await getStripe();
    const secret = await getWebhookSecret();

    // 1. Verify Stripe webhook signature
    const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];
    if (!signature) {
      throw new BadRequestError('Missing Stripe-Signature header');
    }

    const rawBody = event.body || '';

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      logger.error('Webhook signature verification failed', { error: err });
      throw new BadRequestError('Invalid webhook signature');
    }

    logger.info('Webhook event received', {
      type: stripeEvent.type,
      id: stripeEvent.id,
    });

    const db = getDb();

    // 2. Handle payment events
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;

        const [updated] = await db
          .update(donations)
          .set({
            status: 'completed',
            updatedAt: sql`NOW()`,
          })
          .where(eq(donations.stripePaymentId, paymentIntent.id))
          .returning({ donationId: donations.id });

        if (updated) {
          logger.info('Donation marked as completed', {
            donationId: updated.donationId,
            stripePaymentId: paymentIntent.id,
          });
        } else {
          logger.warn('No donation found for payment intent', {
            stripePaymentId: paymentIntent.id,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;

        const [updated] = await db
          .update(donations)
          .set({
            status: 'failed',
            updatedAt: sql`NOW()`,
          })
          .where(eq(donations.stripePaymentId, paymentIntent.id))
          .returning({ donationId: donations.id });

        if (updated) {
          logger.info('Donation marked as failed', {
            donationId: updated.donationId,
            stripePaymentId: paymentIntent.id,
          });
        } else {
          logger.warn('No donation found for payment intent', {
            stripePaymentId: paymentIntent.id,
          });
        }
        break;
      }

      default:
        logger.info('Unhandled webhook event type', { type: stripeEvent.type });
        break;
    }

    // 3. Return 200 OK to Stripe
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    return handleError(error, { operation: 'donations-webhook' });
  }
};
