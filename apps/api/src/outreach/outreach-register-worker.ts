// @kairos/api - Outreach Register Worker Lambda
// Registers a member as a worker for an outreach program.
// Restricts to member's home branch programs only.
//
// **Requirements: 13.3**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  validateOrThrow,
  outreachWorkerRegisterSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@kairos/utils';
import { outreachPrograms, outreachParticipants, members } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('outreach-register-worker');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Registering outreach worker', { userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(outreachWorkerRegisterSchema, body);

    const db = getDb();

    // Verify program exists
    const [program] = await db
      .select({
        outreachId: outreachPrograms.outreachId,
        branchId: outreachPrograms.branchId,
      })
      .from(outreachPrograms)
      .where(eq(outreachPrograms.outreachId, input.outreach_id))
      .limit(1);

    if (!program) {
      throw new NotFoundError('Outreach program', String(input.outreach_id));
    }

    // Verify member exists and get their branch
    const [member] = await db
      .select({
        memberId: members.memberId,
        homeBranchId: members.homeBranchId,
      })
      .from(members)
      .where(eq(members.memberId, input.member_id))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(input.member_id));
    }

    // Restrict to member's home branch programs only
    if (member.homeBranchId !== program.branchId) {
      throw new ForbiddenError('Member can only register for programs in their home branch');
    }

    // Check for duplicate registration
    const [existing] = await db
      .select({ outreachId: outreachParticipants.outreachId })
      .from(outreachParticipants)
      .where(
        and(
          eq(outreachParticipants.outreachId, input.outreach_id),
          eq(outreachParticipants.memberId, input.member_id)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError('Member is already registered for this program');
    }

    const [created] = await db
      .insert(outreachParticipants)
      .values({
        outreachId: input.outreach_id,
        memberId: input.member_id,
        role: input.role,
        notes: input.notes,
      })
      .returning();

    logger.info('Worker registered', {
      outreachId: input.outreach_id,
      memberId: input.member_id,
    });

    return createdResponse(created);
  } catch (error) {
    return handleError(error);
  }
};
