'use client';

import { BarChart3 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kairos/ui';
import { useFrequencyBuckets } from '@/hooks/use-attendance';

interface Props {
  branchId?: string;
  departmentId?: string;
  fellowshipId?: string;
  engagedWindowMonths: number;
}

/**
 * How often engaged members are showing up. Uses the same engagement window
 * as the branch-rate denominator, so a bucket labelled "Weekly" over a 3-month
 * window means ≥75% of the last ~12–13 services.
 */
export function FrequencyBucketsCard({
  branchId,
  departmentId,
  fellowshipId,
  engagedWindowMonths,
}: Props) {
  const q = useFrequencyBuckets({
    branchId,
    departmentId,
    fellowshipId,
    engagedWindowMonths,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Attendance frequency
        </CardTitle>
        <CardDescription>
          How often engaged members show up over the last {q.data?.windowMonths ?? engagedWindowMonths}
          &nbsp;months ({q.data?.servicesConsidered ?? '…'} services). Dormant = on
          the active roll but zero attendance in the window.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-foreground/5" />
            ))}
          </div>
        ) : q.isError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {q.error instanceof Error ? q.error.message : 'Could not load frequency buckets.'}
          </p>
        ) : (q.data?.servicesConsidered ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No services on the branch in the window.
          </p>
        ) : (
          <BucketBars buckets={q.data!.buckets} />
        )}
      </CardContent>
    </Card>
  );
}

function BucketBars({
  buckets,
}: {
  buckets: {
    key: string;
    label: string;
    members: number;
    description: string;
  }[];
}) {
  const max = Math.max(1, ...buckets.map((b) => b.members));
  return (
    <ul className="space-y-2.5">
      {buckets.map((b) => {
        const pct = (b.members / max) * 100;
        return (
          <li key={b.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span
                className="font-medium text-foreground"
                title={b.description}
              >
                {b.label}
              </span>
              <span className="tabular-nums text-muted-foreground">{b.members}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/5">
              <div
                className={`h-full rounded-full ${
                  b.key === 'dormant' ? 'bg-foreground/30' : 'bg-gradient-to-r from-[#451ebb] to-[#5d3fd3]'
                }`}
                style={{ width: `${pct}%` }}
                aria-label={`${b.members} members`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
