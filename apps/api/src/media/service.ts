import type { Context } from 'hono';
import { logger, AppError } from '@kairos/utils';
import type { MediaPurpose } from './schemas';

export interface MintUploadUrlResult {
  imageId: string;
  uploadUrl: string;
  deliveryUrl: string;
}

export interface CfImagesConfig {
  accountId: string;
  accountHash: string;
  apiToken: string;
}

interface CfImagesEnv {
  CF_IMAGES_ACCOUNT_ID?: string;
  CF_IMAGES_ACCOUNT_HASH?: string;
  CF_IMAGES_TOKEN?: string;
}

/**
 * Read the Cloudflare Images credentials, or null when the environment has
 * none.
 *
 * The router has its own reader that throws 503 `MEDIA_NOT_CONFIGURED`, which
 * is right for an upload: a caller asking to upload needs to be told it is not
 * available. It is wrong for a deletion that accompanies an erasure, where the
 * erasure must proceed whether or not image storage is reachable — so this
 * returns null and lets the caller record an incomplete deletion instead of
 * failing the user's request to be forgotten.
 */
export function readCfImagesConfigOrNull(c?: Context): CfImagesConfig | null {
  const env = (c as { env?: CfImagesEnv } | undefined)?.env ?? {};
  const pick = (key: keyof CfImagesEnv): string | undefined =>
    env[key] ?? (typeof process !== 'undefined' ? process.env[key] : undefined);

  const accountId = pick('CF_IMAGES_ACCOUNT_ID');
  const accountHash = pick('CF_IMAGES_ACCOUNT_HASH');
  const apiToken = pick('CF_IMAGES_TOKEN');
  if (!accountId || !accountHash || !apiToken) return null;
  return { accountId, accountHash, apiToken };
}

/**
 * Mint a one-time upload URL from Cloudflare Images. The client PUTs the file
 * bytes directly to `uploadUrl` — never through our Worker — which keeps large
 * uploads clear of Worker CPU/memory limits and preserves the payload budget
 * for JSON API calls.
 *
 * Delivery URL is returned pre-formatted with the `public` variant. Consumers
 * that need a smaller variant can swap the trailing segment (`/avatar`,
 * `/thumbnail`, `/full`). Every named variant must be defined in the CF
 * Images dashboard before it can be requested.
 *
 * The mint API sets a 30-minute expiry on the upload URL, and stamps the
 * uploader's memberId + purpose in CF metadata so unused/abandoned uploads
 * can be swept later.
 */
export async function mintUploadUrl(
  cfg: CfImagesConfig,
  purpose: MediaPurpose,
  memberId: string,
): Promise<MintUploadUrlResult> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/images/v2/direct_upload`;
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const form = new FormData();
  form.set('expiry', expiry);
  form.set('requireSignedURLs', 'false');
  form.set('metadata', JSON.stringify({ purpose, memberId }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiToken}` },
    body: form,
  });
  const body = (await res.json()) as CfDirectUploadResponse;

  if (!res.ok || !body.success || !body.result) {
    logger.error('media.mint_upload_url.cf_failure', {
      module: 'media',
      status: res.status,
      errors: body.errors,
    });
    throw new AppError(502, 'Failed to mint upload URL. Try again shortly.', 'MEDIA_UPLOAD_URL_FAILED');
  }

  return {
    imageId: body.result.id,
    uploadUrl: body.result.uploadURL,
    deliveryUrl: `https://imagedelivery.net/${cfg.accountHash}/${body.result.id}/public`,
  };
}

interface CfDirectUploadResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: { id: string; uploadURL: string };
}

/**
 * Pull the Cloudflare Images id out of a stored image reference.
 *
 * `members.photo_url` and `department_uniform_outfits.image_url` hold one of
 * three things, and only the first is deletable:
 *
 *   1. A Cloudflare delivery URL — `imagedelivery.net/{hash}/{id}/{variant}`.
 *   2. A base64 `data:` URI, from the pre-Cloudflare local-first era. The bytes
 *      live in the column itself, so nulling the column IS the deletion.
 *   3. Any other http(s) URL, e.g. a seeded avatar from a third party. Not ours
 *      to delete.
 *
 * Returns null for 2 and 3 rather than throwing, because every caller's
 * question is "is there a remote object to destroy", and "no" is a valid answer.
 */
export function extractCfImageId(stored: string | null | undefined): string | null {
  if (!stored) return null;
  // Cheap reject before constructing a URL — data URIs are up to 270KB, and
  // `new URL()` on one of those parses the whole payload to no purpose.
  //
  // This filters on the SCHEME, not on a substring of the host. It used to
  // read `!stored.includes('imagedelivery.net')`, which CodeQL flagged (High,
  // "incomplete URL substring sanitization") because that is the shape of a
  // real vulnerability: `evil.com/imagedelivery.net` and
  // `imagedelivery.net.evil.com` both contain the string. It was not actually
  // exploitable here — the hostname check below is an exact comparison and is
  // what decides — but a substring test against a host is a pattern to keep
  // out of the codebase whether or not today's version is reachable, and a
  // standing High alert makes the security tab less readable for everyone.
  if (!stored.startsWith('http://') && !stored.startsWith('https://')) return null;
  try {
    const url = new URL(stored);
    // Exact host. This is the check that matters.
    if (url.hostname !== 'imagedelivery.net') return null;
    // Path is /{accountHash}/{imageId}/{variant}
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return parts[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Destroy an image in Cloudflare Images.
 *
 * This did not exist, and its absence was the whole of DPIA risk R5: delivery
 * URLs carry no authentication and no expiry, so a leaked link worked forever,
 * and an erasure request nulled `photo_url` while leaving the image itself
 * permanently retrievable — a child's photograph that could not be withdrawn.
 * Nulling a column is not erasure when the bytes live somewhere else.
 *
 * Returns true when the object is gone. Cloudflare answers 404 for an image
 * that does not exist, which is treated as success: the caller's goal is
 * "this must not be retrievable", and an absent image satisfies it. Any other
 * failure returns false rather than throwing, so a storage problem cannot roll
 * back the erasure it accompanies — but the caller MUST record the false,
 * because an erasure whose image survived is an incomplete erasure and the
 * controller needs to know.
 */
export async function deleteImage(cfg: CfImagesConfig, imageId: string): Promise<boolean> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/images/v1/${imageId}`;
  try {
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${cfg.apiToken}` },
    });
    if (res.ok || res.status === 404) return true;
    logger.error('media.delete_image.cf_failure', {
      module: 'media',
      status: res.status,
      imageId,
    });
    return false;
  } catch (err) {
    logger.error('media.delete_image.threw', {
      module: 'media',
      imageId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Destroy whatever remote image a stored reference points at.
 *
 * Returns `'deleted'`, `'nothing-to-delete'` (a data URI, a foreign URL, or an
 * empty column) or `'failed'`. Three states rather than a boolean because the
 * caller has to tell "there was nothing to destroy" from "there was, and it is
 * still there" — the first is a complete erasure and the second is not.
 */
export type ImageDeletionOutcome = 'deleted' | 'nothing-to-delete' | 'failed';

export async function deleteStoredImage(
  cfg: CfImagesConfig | null,
  stored: string | null | undefined,
): Promise<ImageDeletionOutcome> {
  const imageId = extractCfImageId(stored);
  if (!imageId) return 'nothing-to-delete';
  if (!cfg) {
    // Local development and tests have no Cloudflare credentials. Say so
    // rather than silently reporting success, so a test asserting on erasure
    // cannot pass for the wrong reason.
    logger.warn('media.delete_stored_image.not_configured', { module: 'media', imageId });
    return 'failed';
  }
  return (await deleteImage(cfg, imageId)) ? 'deleted' : 'failed';
}
