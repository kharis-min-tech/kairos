'use client';

import { useRef, useState } from 'react';
import { Button } from '@kairos/ui';
import type { MediaPurpose } from '@kairos/types';
import { useMintUploadUrl } from '@/hooks/use-media';

interface ImageUploadProps {
  purpose: MediaPurpose;
  onUploaded: (deliveryUrl: string) => void;
  onError?: (message: string) => void;
  /** URL to render inside the preview slot. Null hides the preview. */
  previewUrl?: string | null;
  /** Bound the largest edge before upload — CF Images stores at native size
   *  but we don't need clients uploading raw DSLR shots. Defaults per purpose. */
  maxDim?: number;
  /** Compression quality passed to canvas toDataURL. 0.85 by default. */
  quality?: number;
  disabled?: boolean;
  /** Rendering shape. `avatar` gives a round overlay button (profile);
   *  `card` gives a preview thumb + explicit choose/clear buttons (outfit). */
  variant?: 'avatar' | 'card';
  /** Optional label rendered next to the trigger in `card` variant. */
  triggerLabel?: string;
  className?: string;
}

const DEFAULT_MAX: Record<MediaPurpose, number> = {
  'profile-photo': 512,
  'uniform-outfit': 1024,
};

async function resizeImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read image'));
      el.src = objectUrl;
    });
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas produced no blob'))),
        'image/jpeg',
        quality,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ImageUpload({
  purpose,
  onUploaded,
  onError,
  previewUrl,
  maxDim,
  quality = 0.85,
  disabled,
  variant = 'card',
  triggerLabel,
  className = '',
}: ImageUploadProps) {
  const mint = useMintUploadUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const effectiveMax = maxDim ?? DEFAULT_MAX[purpose];
  const showPreview = localPreview ?? previewUrl ?? null;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const resized = await resizeImage(file, effectiveMax, quality);
      const previewDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Preview failed'));
        reader.readAsDataURL(resized);
      });
      setLocalPreview(previewDataUrl);

      const { uploadUrl, deliveryUrl } = await mint.mutateAsync({ purpose });
      const form = new FormData();
      form.append('file', resized, 'upload.jpg');
      const res = await fetch(uploadUrl, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      onUploaded(deliveryUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      onError?.(message);
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const triggerText = uploading ? 'Uploading…' : triggerLabel ?? (showPreview ? 'Replace image' : 'Choose image');

  if (variant === 'avatar') {
    return (
      <>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100 disabled:cursor-not-allowed ${className}`}
          title={triggerText}
        >
          {uploading ? (
            <span className="text-xs font-medium text-white">Uploading…</span>
          ) : (
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showPreview ? (
        <div className="h-20 w-20 overflow-hidden rounded-[4px] bg-surface-container-low">
          <img src={showPreview} alt="preview" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-[4px] bg-surface-container-low text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {triggerText}
        </Button>
      </div>
    </div>
  );
}
