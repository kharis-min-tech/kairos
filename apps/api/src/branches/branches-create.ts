// @kairos/api - Create Branch Lambda
// POST /v1/branches
// Requires: branch_name, region_id, branch_type, contact info
// Admin-only operation

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  isAdmin,
  validateOrThrow,
  branchCreateSchema,
  handleError,
  createdResponse,
  ForbiddenError,
  createLogger,
  getDb,
} from '@kairos/utils';
import { branches } from '@kairos/database';

const logger = createLogger('branches-create');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Creating branch', { memberId: ctx.memberId });

    // 2. Only admins can create branches
    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only admins can create branches');
    }

    // 3. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(branchCreateSchema, body);

    // 4. Insert branch into database
    const db = getDb();
    const [branch] = await db
      .insert(branches)
      .values({
        branchName: input.branch_name,
        regionId: input.region_id,
        branchType: input.branch_type,
        address: input.address,
        city: input.city,
        postalCode: input.postal_code,
        phone: input.phone,
        email: input.email,
        establishedDate: input.established_date
          ? input.established_date.toISOString().split('T')[0]
          : undefined,
      })
      .returning();

    logger.info('Branch created', {
      branchId: branch!.branchId,
      branchName: branch!.branchName,
    });

    return createdResponse(branch);
  } catch (error) {
    return handleError(error, { operation: 'branches-create' });
  }
};
