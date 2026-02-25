'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import { Spinner, Alert } from '@/components/ui';
import { members } from '@kairos/api-client';

interface PhotoUploadProps {
  memberId: number;
  photoUrl?: string | null;
  onUploaded: () => void;
}

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function PhotoUpload({ memberId, photoUrl, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null | undefined>(photoUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalPhotoUrl(photoUrl);
  }, [photoUrl]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError('Photo must be less than 5 MB');
      return;
    }

    const contentType = file.type;
    const extension = EXTENSION_MAP[contentType];
    if (!extension) {
      setError('Unsupported file type. Please use JPEG, PNG, or WebP.');
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, photoKey } = await members.getPhotoUploadUrl(memberId, {
        contentType,
        extension,
      });

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      await members.update(memberId, { photoUrl: photoKey });
      setLocalPhotoUrl(photoKey);
      onUploaded();
    } catch {
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer bg-gray-100 flex items-center justify-center"
        aria-label="Upload photo"
      >
        {uploading ? (
          <Spinner size="sm" />
        ) : localPhotoUrl ? (
          <img
            src={localPhotoUrl}
            alt="Member photo"
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={32} className="text-gray-400" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      {error && (
        <Alert variant="error" title="Upload Error">
          {error}
        </Alert>
      )}
    </div>
  );
}
