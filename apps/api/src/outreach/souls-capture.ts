// @kairos/api - Souls Capture Lambda
// Captures a new soul from an outreach program or ad-hoc (personal evangelism).
// If outreach_id provided: verify program exists, enforceBranchAccess on program's branchId, check duplicate phone.
// If outreach_id NOT provided (ad-hoc): use ctx.branchId for branch isolation.
// Automatically assigns to capturing member.
// Sets initial status to "New".
// Validates phone format; allows duplicates with warning.
//
// **Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5**

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

    let outreachId: number | null = null;
    let duplicateWarning: string | undefined;

    if (input.outreach_id) {
      // Program-linked capture: verify program exists and enforce branch access
      outreachId = input.outreach_id;

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
    }
    // Ad-hoc capture (no outreach_id): use ctx.branchId for branch isolation
    // No program verification needed — branch derived from capturing member

    // Insert soul — automatically assigned to capturing member, status = "New"
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

    logger.info('Soul captured', {
      soulId: created!.soulId,
      assignedTo: ctx.memberId,
      adHoc: !input.outreach_id,
    });

    const response: Record<string, unknown> = { ...created! };
    if (duplicateWarning) {
      response.warning = duplicateWarning;
    }

    return createdResponse(response);
  } catch (error) {
    return handleError(error);
  }
};
