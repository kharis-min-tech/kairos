'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBranch, useBranchLeadership } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { Button } from '@kairos/ui';

export default function MyBranchPage() {
  const router = useRouter();
  const { user, activeRole } = useAuthStore();
  const branchId = user?.homeBranchId ?? '';
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';

  // Second-level guard — sidebar gates to pastor; mirror that here for direct-URL access.
  useEffect(() => {
    if (activeRole && !isAdminOrPastor) router.replace('/');
  }, [activeRole, isAdminOrPastor, router]);

  const { data: branch, isLoading: branchLoading } = useBranch(branchId);
  const { data: leadership, isLoading: leadershipLoading } = useBranchLeadership(branchId);
  const { data: membersData } = useMembers(branchId ? { branchId, limit: 1 } : undefined);

  if (!branchId) {
    return (
      <div role="alert" className="rounded-lg bg-[#f8b537]/10 p-4">
        <p className="text-sm font-medium text-[#9a6b04] dark:text-[#f8b537]">No home branch assigned to your account.</p>
      </div>
    );
  }

  if (branchLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="h-9 w-56 animate-pulse rounded bg-muted/60" />
        <div className="h-56 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-40 animate-pulse rounded-lg bg-muted/60" />
        <span className="sr-only">Loading branch</span>
      </div>
    );
  }

  if (!branch) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">Branch not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">My Branch</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{branch.branchName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">{branch.branchType}</p>
        </div>
        {isAdminOrPastor && (
          <Link href={`/admin/branches/${branchId}`}>
            <Button variant="outline" size="sm">Manage</Button>
          </Link>
        )}
      </div>

      {/* Branch Info */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {branch.city && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">City</p>
              <p>{branch.city}</p>
            </div>
          )}
          {branch.address && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p>{branch.address}</p>
            </div>
          )}
          {branch.phone && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{branch.phone}</p>
            </div>
          )}
          {branch.email && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{branch.email}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Members</p>
            <p>{membersData?.meta?.total ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              branch.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {branch.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Leadership */}
      <Card>
        <CardHeader>
          <CardTitle>Current Leadership</CardTitle>
          <CardDescription>Branch leadership team</CardDescription>
        </CardHeader>
        <CardContent>
          {leadershipLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !leadership || leadership.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leadership assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {leadership.map((leader) => {
                const initials = ((leader.memberFirstName?.[0] ?? '') + (leader.memberLastName?.[0] ?? '')).toUpperCase() || '?';
                return (
                  <div key={leader.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#5D3FD3]/15 text-sm font-bold text-[#5D3FD3] dark:text-[#a78bfa]">
                      {initials}
                    </div>
                    <div>
                      <p className="font-medium">{leader.memberFirstName} {leader.memberLastName}</p>
                      <p className="text-sm text-muted-foreground">{leader.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pastor Quick Actions */}
      {isAdminOrPastor && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href="/members"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input/15 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              View Members
            </Link>
            <Link
              href="/fellowships"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input/15 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              View Fellowships
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input/15 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Reports
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
