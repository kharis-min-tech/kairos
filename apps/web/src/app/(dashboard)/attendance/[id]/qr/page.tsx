'use client';

export const runtime = 'edge';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import QRCode from 'qrcode';
import { Card, CardContent } from '@kairos/ui';
import { useService, useQrToken } from '@/hooks/use-attendance';

/**
 * Admin QR display — polls the token every 30s and re-renders. Delegates
 * capability gating to the API: a non-admin who hits this URL gets 403 back
 * and sees the error state. See docs/self-check-in.md for the token shape.
 */
export default function AttendanceQrPage() {
  const { id } = useParams<{ id: string }>();
  const { data: service, isError: serviceError, error: svcErrorObj } = useService(id);
  const token = useQrToken(id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const qrValue = useMemo(() => {
    if (!token.data || !id) return null;
    return `kairos://check-in/${id}/${token.data.token}`;
  }, [token.data, id]);

  useEffect(() => {
    if (!qrValue || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: 320,
      margin: 1,
      color: { dark: '#1a1c1c', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {
      // Non-fatal — a bad payload just leaves the previous QR up. Rare in
      // practice since we control the encoding end-to-end.
    });
  }, [qrValue]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/attendance/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to service
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Self check-in QR</h1>
        <p className="text-sm text-muted-foreground">
          Show this on the desk screen. It refreshes every 30 seconds.
        </p>
      </div>

      {serviceError ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {svcErrorObj instanceof Error ? svcErrorObj.message : 'Could not load this service.'}
        </div>
      ) : token.isError ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {token.error instanceof Error ? token.error.message : 'Could not load the QR code.'}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            {service ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {service.serviceTitle || `${service.serviceType} Service`}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <canvas ref={canvasRef} width={320} height={320} />
            </div>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              Members: open Kairos → Check in → Scan QR. The previous code stays valid for a moment
              after each refresh so nobody misses it.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
