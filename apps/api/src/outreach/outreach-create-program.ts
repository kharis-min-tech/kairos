// @kairos/api - Outreach Create Program Lambda
// Creates an outreach program with coordinator assignment.
//
// **Requirements: 13.1, 13.2**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  outreachProgramCreateSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  ConflictError,
} from '@kairos/utils';
import { outreachPrograms } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('outreach-create-program');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Creating outreach program', { userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(outreachProgramCreateSchema, body);

    enforceBranchAccess(ctx, input.branch_id);

    const db = getDb();

    // Check for duplicate program
    const [existing] = await db
      .select({ outreachId: outreachPrograms.id })
      .from(outreachPrograms)
      .where(
        and(
          eq(outreachPrograms.branchId, input.branch_id),
          eq(outreachPrograms.programName, input.program_name),
          eq(outreachPrograms.programDate, input.program_date.toISOString().split('T')[0]! as string),
          eq(outreachPrograms.location, input.location)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError('An outreach program with this name, date, and location already exists');
    }

    const [created] = await db
      .insert(outreachPrograms)
      .values({
        branchId: input.branch_id,
        programName: input.program_name,
        programDate: input.program_date.toISOString().split('T')[0]!,
        location: input.location,
        address: input.address,
        city: input.city,
        description: input.description,
        coordinatorId: input.coordinator_id,
        notes: input.notes,
      })
      .returning();

    logger.info('Outreach program created', { outreachId: created!.id });
    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};
