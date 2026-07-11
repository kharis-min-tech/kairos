'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, CalendarDays } from 'lucide-react';
import { Button, Card, CardContent, CustomSelect, cn } from '@kairos/ui';
import { DateSelect } from '@kairos/ui';
import { useServices, useCanRecordAttendance } from '@/hooks/use-attendance';
import { formatShortDate } from '@/lib/date-format';
import { ServiceType } from '@kairos/types';
import type { ServiceListParams } from '@kairos/types';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: ServiceType.Sunday, label: 'Sunday' },
  { value: ServiceType.Midweek, label: 'Midweek' },
  { value: ServiceType.Special, label: 'Special' },
];

const TYPE_BADGE: Record<string, string> = {
  [ServiceType.Sunday]: 'bg-[#5D3FD3]/15 text-[#5D3FD3] dark:text-[#a392ed]',
  [ServiceType.Midweek]: 'bg-[#16A34A]/15 text-[#16A34A]',
  [ServiceType.Special]: 'bg-[#f8b537]/20 text-[#a07720] dark:text-[#f8b537]',
};

export default function AttendanceServicesPage() {
  const { data: canRecordResult } = useCanRecordAttendance();
  const canRecord = !!canRecordResult?.canRecord;
  const [type, setType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const params: ServiceListParams = {
    page: 1,
    limit: 50,
    type: (type || undefined) as ServiceType | undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading, isError, error } = useServices(params);
  const services = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Attendance</h1>
          <p className="text-sm text-muted-foreground">Sunday, midweek and special services.</p>
        </div>
        {canRecord && (
          <div className="flex gap-2">
            <Link href="/attendance/reports">
              <Button variant="outline">Reports</Button>
            </Link>
            <Link href="/attendance/new">
              <Button>
                <Plus className="mr-1.5 h-4 w-4" /> Record a service
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
          <CustomSelect value={type} onValueChange={setType} options={TYPE_OPTIONS} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
          <DateSelect variant="pill" value={dateFrom} onChange={setDateFrom} placeholder="Any" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
          <DateSelect variant="pill" value={dateTo} onChange={setDateTo} placeholder="Any" />
        </div>
        {(type || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setType('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-foreground/5" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error instanceof Error ? error.message : 'Could not load services.'}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">No services yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {canRecord
                ? 'Record your first service to start checking in attendees.'
                : 'There are no services to view in your branch yet.'}
            </p>
            {canRecord && (
              <Link href="/attendance/new">
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" /> Record a service
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <Link key={s.id} href={`/attendance/${s.id}`} className="block">
              <Card className="transition-colors hover:bg-foreground/[0.02]">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          TYPE_BADGE[s.serviceType],
                        )}
                      >
                        {s.serviceType}
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {s.serviceTitle || `${s.serviceType} Service`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatShortDate(s.serviceDate)}
                      {s.branchName ? ` · ${s.branchName}` : ''}
                      {s.topic ? ` · ${s.topic}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-[#5D3FD3]">Check in →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
