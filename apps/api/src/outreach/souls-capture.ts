// @kairos/api - Souls Capture Lambda
// Captures a new soul from an outreach program.
// Automatically assigns to capturing member.
// Sets initial status to "New".
// Validates phone format; allows duplicates with warning.
//
// **Requirements: 14.1-14.8**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  soulCaptureSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
} from '@kairos/utils';
import { souls, outreachPrograms } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('souls-capture');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Capturing soul', { userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(soulCaptureSchema, body);

    const db = getDb();

    if (!input.outreach_id) {
      throw new BadRequestError('outreach_id is required');
    }

    const outreachId = input.outreach_id;

    // Verify outreach program exists and get branch
    const [program] = await db
      .select({
        outreachId: outreachPrograms.outreachId,
        branchId: outreachPrograms.branchId,
      })
      .from(outreachPrograms)
      .where(eq(outreachPrograms.outreachId, outreachId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('Outreach program', String(outreachId));
    }

    enforceBranchAccess(ctx, program.branchId);

    // Check for duplicate phone in same outreach (warn but allow)
    let duplicateWarning: string | undefined;
    if (input.phone) {
      const [existingPhone] = await db
        .select({ soulId: souls.soulId, firstName: souls.firstName, lastName: souls.lastName })
        .from(souls)
        .where(
          and(
            eq(souls.phone, input.phone),
            eq(souls.outreachId, outreachId)
          )
        )
        .limit(1);

      if (existingPhone) {
        duplicateWarning = `Phone number already captured in this program for ${existingPhone.firstName} ${existingPhone.lastName} (ID: ${existingPhone.soulId}). Proceeding anyway (may be a family member).`;
        logger.warn('Duplicate phone in outreach', {
          phone: input.phone,
          existingSoulId: existingPhone.soulId,
        });
      }
    }

    // Insert soul — automatically assigned to capturing member
    const [created] = await db
      .insert(souls)
      .values({
        outreachId: outreachId,
        firstName: input.first_name,
        lastName: input.last_name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        gender: input.gender,
        ageRange: input.age_range,
        assignedMemberId: ctx.memberId,
        status: 'New',
        notes: input.notes,
      })
      .returning();

    logger.info('Soul captured', { soulId: created!.soulId, assignedTo: ctx.memberId });

    const response: Record<string, unknown> = { ...created! };
    if (duplicateWarning) {
      response.warning = duplicateWarning;
    }

    return createdResponse(response);
  } catch (error) {
    return handleError(error);
  }
};
