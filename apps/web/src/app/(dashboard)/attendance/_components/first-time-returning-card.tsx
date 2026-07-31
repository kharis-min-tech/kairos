'use client';

import { Sparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kairos/ui';
import { useFirstTimeReturning } from '@/hooks/use-attendance';
import { formatShortDate } from '@/lib/date-format';

interface Props {
  branchId?: string;
  departmentId?: string;
  fellowshipId?: string;
}

/**
 * Per week: first-time attendees (earliest-ever attendance on this branch
 * falls in the week) vs returning. Growth signal — distinguishes reaching
 * new people from regulars showing up.
 */
export function FirstTimeReturningCard({ branchId, departmentId, fellowshipId }: Props) {
  const q = useFirstTimeReturning({ branchId, departmentId, fellowshipId, weeks: 12 });

  const chartData = (q.data ?? []).map((p) => ({
    week: formatShortDate(p.weekStart),
    firstTime: p.firstTime,
    returning: p.returning,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-[#f8b537]" aria-hidden /> First-time vs returning
        </CardTitle>
        <CardDescription>
          Per week: how many attendees were first-time (their earliest-ever
          attendance on this branch fell in the week) vs returning. Rising
          gold = new people reached; rising purple = the regulars showing up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="h-56 animate-pulse rounded-lg bg-foreground/5" />
        ) : q.isError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {q.error instanceof Error ? q.error.message : 'Could not load this report.'}
          </p>
        ) : chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No attendance in the last 12 weeks.
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="returning" stackId="a" fill="#5D3FD3" name="Returning" />
                <Bar dataKey="firstTime" stackId="a" fill="#f8b537" name="First-time" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
