// @kairos/api - Members Photo Upload URL Lambda
// Generates a presigned S3 PUT URL for uploading a member's profile photo
// Auth: member can upload own photo; Admin can upload for anyone;
// Pastor can upload for members in their branch only

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  isPastor,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '@kairos/utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const logger = createLogger('members-photo-upload-url');

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const ALLOWED_EXTENSIONS = ['jpg', 'png', 'webp'] as const;

type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.MEMBER_PHOTOS_BUCKET || '';
const PRESIGNED_URL_EXPIRY = 300; // seconds

/**
 * Lambda handler for generating a presigned S3 upload URL for member photos.
 *
 * Path parameter: memberId
 * Request body: { contentType, extension }
 *
 * Access control:
 * - Admin: can generate URL for any member
 * - Pastor: can generate URL for members in their branch
 * - Member: can generate URL for their own photo only
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    const targetMemberId = parseInt(event.pathParameters?.memberId || '', 10);

    if (isNaN(targetMemberId)) {
      throw new NotFoundError('Member', event.pathParameters?.memberId);
    }

    logger.info('Generating photo upload URL', { userId: ctx.memberId, targetMemberId });

    // 2. Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const { contentType, extension } = body;

    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType as AllowedContentType)) {
      throw new BadRequestError('Content type must be image/jpeg, image/png, or image/webp');
    }

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
      throw new BadRequestError('Extension must be jpg, png, or webp');
    }

    const db = getDb();

    // 3. Fetch the member to verify they exist
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.memberId, targetMemberId))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(targetMemberId));
    }

    // 4. Enforce access control
    if (!isAdmin(ctx)) {
      if (isPastor(ctx)) {
        // Pastors can upload for members in their branch only
        if (member.homeBranchId !== ctx.branchId) {
          throw new ForbiddenError('You can only upload photos for members in your branch');
        }
      } else {
        // Regular members can only upload their own photo
        if (ctx.memberId !== targetMemberId) {
          throw new ForbiddenError('You can only upload your own photo');
        }
      }
    }

    // 5. Generate S3 key
    const photoKey = `photos/${targetMemberId}/${Date.now()}.${extension}`;

    // 6. Create presigned PUT URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: photoKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    logger.info('Photo upload URL generated', { memberId: targetMemberId, photoKey });

    // 7. Return presigned URL and photo key
    return successResponse({ uploadUrl, photoKey });
  } catch (error) {
    return handleError(error, { operation: 'members-photo-upload-url' });
  }
};
