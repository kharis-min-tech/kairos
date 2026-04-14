// @kairos/api - Fellowship Create Lambda
// Creates a new fellowship with optional leader and co-leader assignment.
// When a leader is assigned, automatically adds them to fellowship_members.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  fellowshipCreateSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  ConflictError,
  BadRequestError,
} from '@kairos/utils';
import { fellowships, fellowshipMembers } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('fellowships-create');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });
    logger.info('Creating fellowship');

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(fellowshipCreateSchema, body);

    // 3. Enforce branch isolation
    enforceBranchAccess(ctx, input.branch_id);

    // 4. Validate leader != co-leader
    if (
      input.leader_id &&
      input.co_leader_id &&
      input.leader_id === input.co_leader_id
    ) {
      throw new BadRequestError('Leader and co-leader must be different members');
    }

    const db = getDb();

    // 5. Check for duplicate fellowship name in the same branch
    const existing = await db
      .select({ fellowshipId: fellowships.id })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.fellowshipName, input.fellowship_name),
          eq(fellowships.branchId, input.branch_id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(
        `Fellowship '${input.fellowship_name}' already exists in this branch`
      );
    }

    // 6. Insert fellowship record
    const [created] = await db
      .insert(fellowships)
      .values({
        fellowshipName: input.fellowship_name,
        fellowshipType: input.fellowship_type,
        branchId: input.branch_id,
        description: input.description,
        leaderId: input.leader_id,
        coLeaderId: input.co_leader_id,
        meetingSchedule: input.meeting_schedule,
      })
      .returning();

    logger.info('Fellowship created', {
      fellowshipId: created!.id,
    });

    // 7. Auto-add leader to fellowship_members if assigned
    if (input.leader_id) {
      await db.insert(fellowshipMembers).values({
        fellowshipId: created!.id,
        memberId: input.leader_id,
        notes: 'Auto-added as fellowship leader',
      });

      logger.info('Leader auto-added to fellowship members', {
        fellowshipId: created!.id,
        memberId: input.leader_id,
      });
    }

    // 8. Auto-add co-leader to fellowship_members if assigned
    if (input.co_leader_id) {
      await db.insert(fellowshipMembers).values({
        fellowshipId: created!.id,
        memberId: input.co_leader_id,
        notes: 'Auto-added as fellowship co-leader',
      });

      logger.info('Co-leader auto-added to fellowship members', {
        fellowshipId: created!.id,
        memberId: input.co_leader_id,
      });
    }

    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};
