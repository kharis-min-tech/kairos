// @kairos/api - Public Self-Registration Lambda
// Handles new member sign-ups: creates Cognito account + pending member record.
// Route is public (skipAuth: true) — no JWT required.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { eq, and } from 'drizzle-orm';
import { members } from '@kairos/database';
import {
  handleError,
  createdResponse,
  validateOrThrow,
  createLogger,
  getDb,
  ConflictError,
} from '@kairos/utils';
import { z } from 'zod';

const logger = createLogger('auth-register');

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.email('Invalid email format'),
  phone: z.string().trim().optional(),
  dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future').optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  address: z.string().trim().max(500).optional(),
  homeBranchId: z.number().int().positive(),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
});

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env['AWS_REGION'] ?? 'eu-west-2',
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(registerSchema, body);

    const userPoolId = process.env['COGNITO_USER_POOL_ID'];
    if (!userPoolId) throw new Error('COGNITO_USER_POOL_ID is not set');

    const db = getDb();

    // 1. Check for duplicate email
    const existing = await db
      .select({ memberId: members.memberId })
      .from(members)
      .where(and(eq(members.email, input.email), eq(members.isActive, true)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('A member with this email already exists', [
        { field: 'email', message: 'Email is already in use by an active member' },
      ]);
    }

    // 2. Create Cognito user (suppressed welcome email; no temp password)
    try {
      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: input.email,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: input.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'given_name', Value: input.firstName },
            { Name: 'family_name', Value: input.lastName },
            { Name: 'custom:role', Value: 'Member' },
          ],
        })
      );
    } catch (err) {
      if (err instanceof UsernameExistsException) {
        throw new ConflictError('An account with this email already exists', [
          { field: 'email', message: 'Email is already registered' },
        ]);
      }
      throw err;
    }

    // 3. Set permanent password (bypasses FORCE_CHANGE_PASSWORD state)
    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: input.email,
        Password: input.password,
        Permanent: true,
      })
    );

    // 4. Create pending member record
    const [member] = await db
      .insert(members)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        dateOfBirth: input.dateOfBirth ? input.dateOfBirth.toISOString().split('T')[0] : null,
        gender: input.gender ?? null,
        address: input.address ?? null,
        homeBranchId: input.homeBranchId,
        isActive: false,
      })
      .returning();

    logger.info('Self-registration complete', {
      memberId: member?.memberId,
      email: input.email,
      branchId: input.homeBranchId,
    });

    return createdResponse({
      message: 'Registration submitted. Your account is pending approval.',
      memberId: member?.memberId,
    });
  } catch (err) {
    return handleError(err);
  }
};
