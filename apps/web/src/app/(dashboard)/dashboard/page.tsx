'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useAdminDashboard, useBranchDashboard, useMemberDashboard } from '@/hooks/use-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';

// ── Stat Card ──────────────────────────────────────────────

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Admin Dashboard ────────────────────────────────────────

function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="text-destructive">Failed to load dashboard stats.</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Branches" value={data.totalBranches} />
        <StatCard title="Total Members" value={data.totalMembers} />
        <StatCard title="Total Fellowships" value={data.totalFellowships} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members by Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.membersByApproval.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.membersByApproval.map((s) => (
                  <li key={s.status} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{s.status}</span>
                    <span className="font-semibold">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fellowships by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {data.fellowshipsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fellowships yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.fellowshipsByType.map((f) => (
                  <li key={f.type} className="flex items-center justify-between text-sm">
                    <span>{f.type}</span>
                    <span className="font-semibold">{f.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Branch Dashboard (Pastor) ──────────────────────────────

function BranchDashboard() {
  const { data, isLoading, error } = useBranchDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="text-destructive">Failed to load branch stats.</p>;
  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Branch Members" value={data.totalMembers} />
      <StatCard title="Fellowships" value={data.totalFellowships} />
      <StatCard title="Meetings (30 days)" value={data.recentMeetings} />
      <StatCard title="Pending Approvals" value={data.pendingApprovals} />
    </div>
  );
}

// ── Member Dashboard ───────────────────────────────────────

function MemberDashboard() {
  const { data, isLoading, error } = useMemberDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="text-destructive">Failed to load your stats.</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="My Fellowships" value={data.fellowshipsJoined} />
        <StatCard title="Attendance Rate (30 days)" value={`${data.recentAttendance.rate}%`} />
        <StatCard title="Meetings Attended" value={`${data.recentAttendance.present} / ${data.recentAttendance.total}`} />
      </div>

      {data.fellowships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Fellowships</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.fellowships.map((f) => (
                <li key={f.fellowshipId} className="flex items-center justify-between text-sm">
                  <span>{f.fellowshipName}</span>
                  <span className="text-muted-foreground">{f.fellowshipType}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 w-24 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const greeting = user?.firstName ? `Welcome, ${user.firstName}` : 'Dashboard';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground">
          {user?.systemRole === 'admin'
            ? 'Church-wide overview'
            : user?.systemRole === 'pastor'
              ? 'Branch overview'
              : 'Your activity summary'}
        </p>
      </div>

      {user?.systemRole === 'admin' ? (
        <AdminDashboard />
      ) : user?.systemRole === 'pastor' ? (
        <BranchDashboard />
      ) : (
        <MemberDashboard />
      )}
    </div>
  );
}
