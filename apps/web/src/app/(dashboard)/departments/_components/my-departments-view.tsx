'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CalendarClock, Users } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kairos/ui';
import { useMyDepartments } from '@/hooks/use-departments';
import { useMyRota } from '@/hooks/use-me';
import { formatDate, formatShortDate } from '@kairos/core';

const PREVIEW_LIMIT = 3;

interface RotaRow {
  assignmentId: string;
  branchDepartmentId: string;
  templateName: string;
  serviceDate: string;
  startTime: string | null;
  slotRoleName: string | null;
  status: string;
}

export interface ProbationStatus {
  endDate: string | null;
}

interface Props {
  probationByDeptId?: Map<string, ProbationStatus>;
}

function formatShortServiceDate(serviceDate: string): string {
  const [y, m, d] = serviceDate.split('-').map(Number);
  if (!y || !m || !d) return serviceDate;
  return formatDate(new Date(y, m - 1, d), {
    weekday: 'short',
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

export function MyDepartmentsView({ probationByDeptId }: Props = {}) {
  const { data: depts, isLoading: deptsLoading } = useMyDepartments();
  const { data: rota, isLoading: rotaLoading } = useMyRota();

  const rotaByDept = useMemo(() => {
    const map = new Map<string, RotaRow[]>();
    ((rota ?? []) as RotaRow[]).forEach((row) => {
      const list = map.get(row.branchDepartmentId);
      if (list) list.push(row);
      else map.set(row.branchDepartmentId, [row]);
    });
    return map;
  }, [rota]);

  if (deptsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!depts || depts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Users className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">You're not in any departments yet.</p>
          <p className="text-xs text-muted-foreground">
            Browse the departments at your branch below and request to join.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {depts.map((dept) => {
        const upcoming = rotaByDept.get(dept.id) ?? [];
        const preview = upcoming.slice(0, PREVIEW_LIMIT);
        const remaining = Math.max(0, upcoming.length - preview.length);
        const probation = probationByDeptId?.get(dept.id);
        const probationEnds = probation?.endDate
          ? formatShortDate(probation.endDate)
          : null;

        return (
          <Link key={dept.id} href={`/departments/${dept.id}`}>
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{dept.departmentName}</CardTitle>
                  {probation && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-[#f8b537]/30 bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]"
                    >
                      On probation{probationEnds ? ` · ends ${probationEnds}` : ''}
                    </Badge>
                  )}
                </div>
                <CardDescription className="truncate">{dept.branchName}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-[#5D3FD3]">
                    <CalendarClock className="h-4 w-4" />
                    <span className="font-medium">
                      {upcoming.length === 0
                        ? 'No upcoming duties'
                        : `${upcoming.length} upcoming ${upcoming.length === 1 ? 'duty' : 'duties'}`}
                      {rotaLoading && upcoming.length === 0 ? ' …' : ''}
                    </span>
                  </div>

                  {preview.length > 0 && (
                    <ol className="space-y-1.5">
                      {preview.map((row) => {
                        const time = formatStartTime(row.startTime);
                        return (
                          <li
                            key={row.assignmentId}
                            className="rounded border border-input/10 bg-card px-2.5 py-1.5 text-xs"
                          >
                            <p className="font-medium">
                              {formatShortServiceDate(row.serviceDate)}
                              {time && (
                                <span className="text-muted-foreground"> · {time}</span>
                              )}
                            </p>
                            <p className="text-muted-foreground">
                              {row.templateName}
                              {row.slotRoleName && (
                                <>
                                  <span aria-hidden="true"> · </span>
                                  {row.slotRoleName}
                                </>
                              )}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {remaining > 0 && (
                    <p className="text-xs text-muted-foreground">
                      + {remaining} more — view all in this department
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
