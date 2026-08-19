'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@kairos/ui';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';

/**
 * Web QR scanner. Uses `getUserMedia` via `@zxing/browser` — no native camera
 * dependency needed. Handles permission denial + missing-device explicitly so
 * the user knows why the scanner isn't lighting up. Locks after the first
 * decode so a shaky camera doesn't fire twice.
 */
export function QrScannerModal({
  open,
  onOpenChange,
  onScan,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (payload: string) => void;
  title: string;
  description?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const decodedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;
    decodedRef.current = false;
    setError(null);
    setStarting(true);

    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    (async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API is not available in this browser.');
        }
        const video = videoRef.current;
        if (!video) return;

        // `undefined` → let the browser pick the best default (rear on mobile).
        // We fall back to any camera if there's no environment-facing device.
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        };
        controlsRef.current = await reader.decodeFromConstraints(
          constraints,
          video,
          (result, err, controls) => {
            if (result && !decodedRef.current) {
              decodedRef.current = true;
              controls.stop();
              onScan(result.getText());
            }
            // `err` fires ~15x/sec while looking for a code — noise, ignore.
          },
        );
        if (!cancelled) setStarting(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Could not start the camera.';
        // NotAllowedError = user rejected the prompt. NotFoundError = no camera.
        if (/NotAllowedError|denied|permission/i.test(msg)) {
          setError('Camera permission was denied. Enable it in your browser and try again.');
        } else if (/NotFoundError|no camera|not found/i.test(msg)) {
          setError("Couldn't find a camera on this device.");
        } else {
          setError(msg);
        }
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {error ? (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
            />
            {/* Framing corners so the user knows where to aim. */}
            <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/80" />
            {starting ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white">
                Starting camera…
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
