export const MEDIA_PURPOSES = ['profile-photo', 'uniform-outfit'] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export interface MintUploadUrlRequest {
  purpose: MediaPurpose;
}

export interface MintUploadUrlResponse {
  imageId: string;
  uploadUrl: string;
  deliveryUrl: string;
}
