// @kairos/api - Update Branch Lambda
// PUT /v1/branches/{branchId}
// Only admins can update branches.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  resolveAuthContext,
  isAdmin,
  validateOrThrow,
  handleError,
  successResponse,
  ForbiddenError,
  NotFoundError,
  createLogger,
  getDb,
  phoneSchema,
} from '@kairos/utils';
import { branches } from '@kairos/database';

const logger = createLogger('branches-update');

/** Schema for updating a branch (all fields optional) */
const branchUpdateSchema = z.object({
  branch_name: z.string().trim().min(1).max(200).optional(),
  region_id: z.number().int().positive().optional(),
  branch_type: z.enum(['Main', 'Satellite', 'Cell', 'Campus', 'Online']).optional(),
  address: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable(),
  established_date: z.coerce.date().optional().nullable(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);

    // 2. Only admins can update branches
    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only admins can update branches');
    }

    // 3. Parse branch ID from path
    const branchId = parseInt(
      event.pathParameters?.branchId || event.pathParameters?.id || '0',
      10
    );
    if (!branchId || isNaN(branchId)) {
      throw new NotFoundError('Branch');
    }

    logger.info('Updating branch', { branchId, memberId: ctx.memberId });

    // 4. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(branchUpdateSchema, body);

    // 5. Build update values (only include provided fields)
    const updateValues: Record<string, unknown> = {};
    if (input.branch_name !== undefined) updateValues.branchName = input.branch_name;
    if (input.region_id !== undefined) updateValues.regionId = input.region_id;
    if (input.branch_type !== undefined) updateValues.branchType = input.branch_type;
    if (input.address !== undefined) updateValues.address = input.address;
    if (input.city !== undefined) updateValues.city = input.city;
    if (input.postal_code !== undefined) updateValues.postalCode = input.postal_code;
    if (input.phone !== undefined) updateValues.phone = input.phone;
    if (input.email !== undefined) updateValues.email = input.email;
    if (input.established_date !== undefined) {
      updateValues.establishedDate = input.established_date
        ? input.established_date.toISOString().split('T')[0]
        : null;
    }

    if (Object.keys(updateValues).length === 0) {
      throw new ForbiddenError('No fields to update');
    }

    // 6. Update branch
    const db = getDb();
    const [updated] = await db
      .update(branches)
      .set(updateValues)
      .where(eq(branches.branchId, branchId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Branch', String(branchId));
    }

    logger.info('Branch updated', { branchId });

    return successResponse(updated);
  } catch (error) {
    return handleError(error, { operation: 'branches-update' });
  }
};
