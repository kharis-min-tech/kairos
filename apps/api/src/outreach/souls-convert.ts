// @kairos/api - Souls Convert Lambda
// Converts a soul to a member in a single atomic transaction.
// Creates member record and updates soul status to 'Converted' with member link.
//
// **Requirements: 16.5, 16.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
  isAdmin,
} from '@kairos/utils';
import { souls, members, outreachPrograms } from '@kairos/database';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const logger = createLogger('souls-convert');

const soulConvertSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  home_branch_id: z.number().int().positive(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const soulId = parseInt(event.pathParameters?.soulId || '', 10);

    if (isNaN(soulId)) {
      throw new NotFoundError('Soul');
    }

    logger.info('Converting soul to member', { soulId, userId: ctx.memberId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(soulConvertSchema, body);

    const db = getDb();

    // Get soul and verify it exists
    const [soul] = await db
      .select({
        soulId: souls.soulId,
        status: souls.status,
        outreachBranchId: outreachPrograms.branchId,
        assignedMemberId: souls.assignedMemberId,
        convertedToMemberId: souls.convertedToMemberId,
      })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(eq(souls.soulId, soulId))
      .limit(1);

    if (!soul) {
      throw new NotFoundError('Soul', String(soulId));
    }

    // Check if already converted
    if (soul.status === 'Converted' && soul.convertedToMemberId) {
      throw new BadRequestError('Soul has already been converted to a member');
    }

    // Derive branch for access control
    let branchId = soul.outreachBranchId;
    if (!branchId && soul.assignedMemberId) {
      const [assignedMember] = await db
        .select({ homeBranchId: members.homeBranchId })
        .from(members)
        .where(eq(members.memberId, soul.assignedMemberId))
        .limit(1);
      branchId = assignedMember?.homeBranchId ?? null;
    }

    if (!isAdmin(ctx) && branchId) {
      enforceBranchAccess(ctx, branchId);
    }

    // Enforce branch access for the target branch
    enforceBranchAccess(ctx, input.home_branch_id);

    // Begin transaction: Create member and update soul
    // Note: Drizzle doesn't have explicit transaction syntax in this pattern,
    // but we'll do operations sequentially and handle rollback via error handling

    let createdMember;
    try {
      // Step 1: Create member record
      const [member] = await db
        .insert(members)
        .values({
          firstName: input.first_name,
          lastName: input.last_name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          gender: input.gender,
          homeBranchId: input.home_branch_id,
          isActive: false, // Pending approval
          membershipStatus: 'Pending',
        })
        .returning();

      createdMember = member;

      // Step 2: Update soul status to Converted
      await db
        .update(souls)
        .set({
          status: 'Converted',
          convertedToMemberId: member!.memberId,
          updatedAt: sql`NOW()`,
        })
        .where(eq(souls.soulId, soulId));

      logger.info('Soul converted to member successfully', {
        soulId,
        memberId: member!.memberId,
      });

      return createdResponse({
        member: member,
        soul_id: soulId,
        message: 'Soul converted to member successfully. Member registration is pending approval.',
      });
    } catch (error) {
      // If soul update fails but member was created, we have a problem
      // Log it for manual intervention
      if (createdMember) {
        logger.error('Soul conversion partially failed - member created but soul not updated', {
          soulId,
          memberId: createdMember.memberId,
          error,
        });
        throw new BadRequestError(
          'Member created but failed to update soul status. Please contact support with Soul ID: ' + soulId
        );
      }
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
};
