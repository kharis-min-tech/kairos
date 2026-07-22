import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { successResponse, AppError } from '@kairos/utils';
import { authMiddleware, getAuth } from '../middleware/auth';
import { authHasCapability } from '../lib/grants';
import { mintUploadUrlSchema } from './schemas';
import { mintUploadUrl } from './service';

export const mediaRouter = new Hono();

mediaRouter.use('*', authMiddleware);

/**
 * Mint a one-time Cloudflare Images upload URL. The purpose parameter drives
 * which capability the caller needs — the actual "save this URL to a row"
 * endpoint (PATCH /me, POST /departments/:id/uniforms) does the fine-grained
 * scope check against the specific target.
 *
 * - profile-photo: any authenticated user (they can only save it to their own
 *   profile via PATCH /me).
 * - uniform-outfit: any caller with department:write on any scope. The
 *   create-outfit endpoint checks the branch-department scope specifically.
 */
mediaRouter.post(
  '/upload-url',
  zValidator('json', mintUploadUrlSchema),
  async (c) => {
    const auth = getAuth(c);
    const { purpose } = c.req.valid('json');

    if (purpose === 'uniform-outfit') {
      const allowed =
        auth.systemRole === 'admin' ||
        authHasCapability(auth, 'department:write');
      if (!allowed) {
        throw new AppError(403, 'You cannot upload uniform images.', 'FORBIDDEN');
      }
    }

    const cfg = readCfImagesConfig(c);
    const result = await mintUploadUrl(cfg, purpose, auth.memberId);
    return c.json(successResponse(result));
  },
);

interface CfImagesEnv {
  CF_IMAGES_ACCOUNT_ID?: string;
  CF_IMAGES_ACCOUNT_HASH?: string;
  CF_IMAGES_TOKEN?: string;
}

function readCfImagesConfig(c: Context) {
  const env = (c as { env?: CfImagesEnv }).env ?? {};
  const accountId =
    env.CF_IMAGES_ACCOUNT_ID ??
    (typeof process !== 'undefined' ? process.env['CF_IMAGES_ACCOUNT_ID'] : undefined);
  const accountHash =
    env.CF_IMAGES_ACCOUNT_HASH ??
    (typeof process !== 'undefined' ? process.env['CF_IMAGES_ACCOUNT_HASH'] : undefined);
  const apiToken =
    env.CF_IMAGES_TOKEN ??
    (typeof process !== 'undefined' ? process.env['CF_IMAGES_TOKEN'] : undefined);

  if (!accountId || !accountHash || !apiToken) {
    throw new AppError(
      503,
      'Image uploads are not configured for this environment.',
      'MEDIA_NOT_CONFIGURED',
    );
  }
  return { accountId, accountHash, apiToken };
}
