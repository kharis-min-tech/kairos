'use client';

export const runtime = 'edge';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Users, QrCode } from 'lucide-react';
import { Button, Card, CardContent, cn } from '@kairos/ui';
import { useService, useCanRecordAttendance } from '@/hooks/use-attendance';
import { formatShortDate } from '@kairos/core';
import { ServiceType } from '@kairos/types';
import { CheckInPanel } from '../_components/check-in-panel';

const TYPE_BADGE: Record<string, string> = {
  [ServiceType.Sunday]: 'bg-[#5D3FD3]/15 text-[#5D3FD3] dark:text-[#a392ed]',
  [ServiceType.Midweek]: 'bg-[#16A34A]/15 text-[#16A34A]',
  [ServiceType.Special]: 'bg-[#f8b537]/20 text-[#a07720] dark:text-[#f8b537]',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function BreakdownPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

export default function CheckInPage() {
  const { id } = useParams<{ id: string }>();
  const { data: service, isLoading, isError, error } = useService(id);
  const { data: canRecordResult } = useCanRecordAttendance(
    service?.branchId ? { branchId: service.branchId } : undefined,
  );
  const canCheckIn = !!canRecordResult?.canRecord;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/attendance"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to services
      </Link>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-foreground/5" />
      ) : isError ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error instanceof Error ? error.message : 'Could not load this service.'}
        </div>
      ) : service ? (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      TYPE_BADGE[service.serviceType],
                    )}
                  >
                    {service.serviceType}
                  </span>
                  <h1 className="text-xl font-bold text-foreground">
                    {service.serviceTitle || `${service.serviceType} Service`}
                  </h1>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatShortDate(service.serviceDate)} · {formatTime(service.serviceDate)}
                  {service.preacherName ? ` · ${service.preacherName}` : ''}
                  {service.topic ? ` · ${service.topic}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.04] px-3 py-2 text-sm">
                  <Users className="h-4 w-4 text-[#5D3FD3]" />
                  <span className="font-semibold text-foreground">{service.recordedCount}</span>
                  <span className="text-muted-foreground">recorded</span>
                </div>
                {service.recordedCount > 0 && service.categoryBreakdown && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <BreakdownPill label="Members" value={service.categoryBreakdown.members} />
                    <BreakdownPill label="Returners" value={service.categoryBreakdown.returners} />
                    <BreakdownPill label="Visitors" value={service.categoryBreakdown.visitors} />
                    <BreakdownPill label="Children" value={service.categoryBreakdown.children} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {canCheckIn ? (
            <>
              <div className="flex justify-end">
                <Link href={`/attendance/${id}/qr`}>
                  <Button variant="outline">
                    <QrCode className="mr-1.5 h-4 w-4" /> Show self-check-in QR
                  </Button>
                </Link>
              </div>
              <CheckInPanel serviceId={id} />
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  Check-in is only available to leaders, pastors, and admins.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Speak to your branch leadership if you need to record attendance.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
