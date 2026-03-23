'use client';

import Link from 'next/link';
import { useBranch, useBranchLeadership } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';

export default function MyBranchPage() {
  const { user, activeRole } = useAuthStore();
  const branchId = user?.homeBranchId ?? '';
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';

  const { data: branch, isLoading: branchLoading } = useBranch(branchId);
  const { data: leadership, isLoading: leadershipLoading } = useBranchLeadership(branchId);
  const { data: membersData } = useMembers(branchId ? { branchId, limit: 1 } : undefined);

  if (!branchId) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-700">No home branch assigned to your account.</p>
      </div>
    );
  }

  if (branchLoading) {
    return <p className="py-12 text-center text-muted-foreground">Loading branch...</p>;
  }

  if (!branch) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Branch not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-purple-300">My Branch</p>
            <h1 className="mt-1 text-2xl font-bold">{branch.branchName}</h1>
            <p className="mt-0.5 text-sm text-purple-200">{branch.branchType}</p>
          </div>
          {isAdminOrPastor && (
            <Link
              href={`/admin/branches/${branchId}`}
              className="mt-5 shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Manage
            </Link>
          )}
        </div>
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
              branch.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
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
                  <div key={leader.id} className="flex items-center gap-3 rounded-md border p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
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
              className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
            >
              View Members
            </Link>
            <Link
              href="/fellowships"
              className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
            >
              View Fellowships
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
            >
              Reports
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
