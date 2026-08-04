'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, CalendarRange } from 'lucide-react';
import { Badge, Card, CardContent, Label } from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { useMyRota } from '@/hooks/use-me';
import { formatDate } from '@kairos/core';

interface Props {
  branchDepartmentId: string;
}

interface RotaRow {
  assignmentId: string;
  branchDepartmentId: string;
  templateName: string;
  serviceDate: string;
  startTime: string | null;
  slotRoleName: string | null;
  status: string;
}

function formatServiceDate(serviceDate: string): string {
  const [y, m, d] = serviceDate.split('-').map(Number);
  if (!y || !m || !d) return serviceDate;
  return formatDate(new Date(y, m - 1, d), {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatStartTime(startTime: string | null): string | null {
  if (!startTime) return null;
  const [hStr, mStr] = startTime.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return startTime;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    case 'tentative':
    case 'assigned':
      return 'border-[#f8b537]/30 bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]';
    case 'swapped':
    case 'released':
      return 'border-foreground/10 bg-muted text-muted-foreground';
    case 'declined':
    case 'rejected':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400';
    default:
      return 'border-[#5D3FD3]/30 bg-[#5D3FD3]/10 text-[#5D3FD3]';
  }
}

export function MyRotaTab({ branchDepartmentId }: Props) {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const params = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
    }),
    [from, to],
  );
  const { data, isLoading, isError } = useMyRota(params);

  const rows = useMemo(
    () =>
      ((data ?? []) as RotaRow[]).filter((row) => row.branchDepartmentId === branchDepartmentId),
    [data, branchDepartmentId],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4 text-[#5D3FD3]" />
            <span>
              {isLoading
                ? 'Loading your duties…'
                : `${rows.length} upcoming ${rows.length === 1 ? 'duty' : 'duties'} in this department`}
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="rota-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <DateSelect
                id="rota-from"
                value={from}
                onChange={setFrom}
                maxDate={to || undefined}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rota-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <DateSelect
                id="rota-to"
                value={to}
                onChange={setTo}
                minDate={from || undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Couldn&apos;t load your rota. Try again in a moment.
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No upcoming duties for you in this department.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => {
            const time = formatStartTime(row.startTime);
            return (
              <li
                key={row.assignmentId}
                className="flex items-start justify-between gap-3 rounded-lg border border-input/10 bg-card px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatServiceDate(row.serviceDate)}
                      {time && (
                        <span className="text-muted-foreground"> · {time}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.templateName}
                      {row.slotRoleName && (
                        <>
                          <span aria-hidden="true"> · </span>
                          {row.slotRoleName}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={statusBadgeClass(row.status)}>
                  {row.status}
                </Badge>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
