import { z } from 'zod';

export const MEDIA_PURPOSES = ['profile-photo', 'uniform-outfit'] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const mintUploadUrlSchema = z.object({
  purpose: z.enum(MEDIA_PURPOSES),
});

export const mintUploadUrlResponseSchema = z.object({
  imageId: z.string(),
  uploadUrl: z.string().url(),
  deliveryUrl: z.string().url(),
});
