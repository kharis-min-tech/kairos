import { logger, AppError } from '@kairos/utils';
import type { MediaPurpose } from './schemas';

export interface MintUploadUrlResult {
  imageId: string;
  uploadUrl: string;
  deliveryUrl: string;
}

interface CfImagesConfig {
  accountId: string;
  accountHash: string;
  apiToken: string;
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
    throw new AppError(502, 'Failed to mint upload URL — try again shortly.', 'MEDIA_UPLOAD_URL_FAILED');
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
