// @kairos/api - Fellowship Update Lambda
// Updates a fellowship's details (name, type, description, leaders, schedule, status).
// Validates leader != co-leader and checks for duplicate names.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  fellowshipUpdateSchema,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '@kairos/utils';
import { fellowships } from '@kairos/database';
import { eq, and, ne } from 'drizzle-orm';

const logger = createLogger('fellowships-update');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Extract fellowship ID from path parameters
    const fellowshipId = parseInt(
      event.pathParameters?.fellowshipId || '',
      10
    );
    if (isNaN(fellowshipId)) {
      throw new BadRequestError('Invalid fellowship ID');
    }

    logger.info('Updating fellowship', { fellowshipId });

    // 3. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(fellowshipUpdateSchema, body);

    const db = getDb();

    // 4. Fetch existing fellowship
    const [existing] = await db
      .select()
      .from(fellowships)
      .where(eq(fellowships.fellowshipId, fellowshipId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Fellowship', String(fellowshipId));
    }

    // 5. Enforce branch isolation
    enforceBranchAccess(ctx, existing.branchId);

    // 6. Validate leader != co-leader
    const newLeaderId =
      input.leader_id !== undefined ? input.leader_id : existing.leaderId;
    const newCoLeaderId =
      input.co_leader_id !== undefined ? input.co_leader_id : existing.coLeaderId;

    if (newLeaderId && newCoLeaderId && newLeaderId === newCoLeaderId) {
      throw new BadRequestError(
        'Leader and co-leader must be different members'
      );
    }

    // 7. Check for duplicate fellowship name in the same branch
    if (input.fellowship_name && input.fellowship_name !== existing.fellowshipName) {
      const duplicate = await db
        .select({ fellowshipId: fellowships.fellowshipId })
        .from(fellowships)
        .where(
          and(
            eq(fellowships.fellowshipName, input.fellowship_name),
            eq(fellowships.branchId, existing.branchId),
            ne(fellowships.fellowshipId, fellowshipId)
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        throw new ConflictError(
          `Fellowship '${input.fellowship_name}' already exists in this branch`
        );
      }
    }

    // 8. Build update values (only include provided fields)
    const updateValues: Record<string, unknown> = {};
    if (input.fellowship_name !== undefined)
      updateValues.fellowshipName = input.fellowship_name;
    if (input.fellowship_type !== undefined)
      updateValues.fellowshipType = input.fellowship_type;
    if (input.description !== undefined)
      updateValues.description = input.description;
    if (input.leader_id !== undefined)
      updateValues.leaderId = input.leader_id;
    if (input.co_leader_id !== undefined)
      updateValues.coLeaderId = input.co_leader_id;
    if (input.meeting_schedule !== undefined)
      updateValues.meetingSchedule = input.meeting_schedule;
    if (input.is_active !== undefined)
      updateValues.isActive = input.is_active;

    if (Object.keys(updateValues).length === 0) {
      return successResponse(existing);
    }

    // 9. Update fellowship
    const [updated] = await db
      .update(fellowships)
      .set(updateValues)
      .where(eq(fellowships.fellowshipId, fellowshipId))
      .returning();

    logger.info('Fellowship updated', {
      fellowshipId,
      updatedFields: Object.keys(updateValues),
    });

    return successResponse(updated);
  } catch (error) {
    return handleError(error);
  }
};
