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
  BadRequestError,
} from '@kairos/utils';
import { outreachPrograms } from '@kairos/database';
import { eq, and, sql } from 'drizzle-orm';

const logger = createLogger('outreach-create-program');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Creating outreach program', { userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(outreachProgramCreateSchema, body);

    if (!input.branch_id) {
      throw new BadRequestError('Branch ID is required');
    }

    enforceBranchAccess(ctx, input.branch_id);

    const db = getDb();

    // Sanitize inputs for duplicate check
    const normalizedProgramName = input.program_name.trim().toLowerCase();
    const normalizedLocation = input.location.trim().toLowerCase();
    const programDate = input.program_date.toISOString().split('T')[0]!;

    // Check for duplicate program (case-insensitive, trimmed)
    const [existing] = await db
      .select({ outreachId: outreachPrograms.outreachId })
      .from(outreachPrograms)
      .where(
        and(
          eq(outreachPrograms.branchId, input.branch_id),
          sql`LOWER(TRIM(${outreachPrograms.programName})) = ${normalizedProgramName}`,
          eq(outreachPrograms.programDate, programDate),
          sql`LOWER(TRIM(${outreachPrograms.location})) = ${normalizedLocation}`
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
        programName: input.program_name.trim(),
        programDate: programDate,
        location: input.location.trim(),
        address: input.address?.trim(),
        city: input.city?.trim(),
        description: input.description?.trim(),
        coordinatorId: input.coordinator_id,
        notes: input.notes?.trim(),
      })
      .returning();

    logger.info('Outreach program created', { outreachId: created!.outreachId });
    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};
