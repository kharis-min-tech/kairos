'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useAdminDashboard, useBranchDashboard, useMemberDashboard } from '@/hooks/use-dashboard';
import { useMyRota } from '@/hooks/use-departments';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#5D3FD3', '#f8b537', '#059669', '#e11d48', '#0ea5e9'];

// ── Stat Card ──────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  accent = 'purple',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'purple' | 'gold' | 'emerald' | 'rose';
}) {
  const accentClasses = {
    purple: 'bg-[#5D3FD3]/15 text-[#5D3FD3] dark:text-[#a392ed]',
    gold: 'bg-[#f8b537]/15 text-amber-700 dark:text-[#f8b537]',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';

// ── Admin Dashboard ────────────────────────────────────────

function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="text-rose-600 text-sm">Failed to load dashboard stats.</p>;
  if (!data) return null;

  const approvalChartData = data.membersByApproval.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    count: s.count,
  }));

  const fellowshipChartData = data.fellowshipsByType.map((f) => ({
    name: f.type.length > 12 ? f.type.slice(0, 12) + '…' : f.type,
    count: f.count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Branches"
          value={data.totalBranches}
          accent="purple"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18l2.25 2.25m0 0l6-6 6 6 2.25-2.25M12 3.75l6 6v10.5M9.75 21V12h4.5V21" />
            </svg>
          }
        />
        <StatCard
          title="Total Members"
          value={data.totalMembers}
          accent="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Fellowships"
          value={data.totalFellowships}
          accent="gold"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Members by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {approvalChartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={approvalChartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {approvalChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fellowships by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {fellowshipChartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No fellowships yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={fellowshipChartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {fellowshipChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
  if (error) return <p className="text-rose-600 text-sm">Failed to load branch stats.</p>;
  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Branch Members"
        value={data.totalMembers}
        accent="purple"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        }
      />
      <StatCard
        title="Fellowships"
        value={data.totalFellowships}
        accent="gold"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        }
      />
      <StatCard
        title="Meetings (30 days)"
        value={data.recentMeetings}
        accent="emerald"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        }
      />
      <StatCard
        title="Pending Approvals"
        value={data.pendingApprovals}
        accent="rose"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        }
      />
    </div>
  );
}

// ── Member Dashboard ───────────────────────────────────────

function MemberDashboard() {
  const { data, isLoading, error } = useMemberDashboard();
  const { data: myRota } = useMyRota();
  const today = new Date().toISOString().slice(0, 10);
  const upcomingDuties = (myRota ?? [])
    .filter((d) => d.serviceDate >= today && d.instanceStatus !== 'Cancelled')
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))
    .slice(0, 5);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="text-rose-600 text-sm">Failed to load your stats.</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="My Fellowships"
          value={data.fellowshipsJoined}
          accent="gold"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        />
        <StatCard
          title="Attendance Rate (30d)"
          value={`${data.recentAttendance.rate}%`}
          accent="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Meetings Attended"
          value={`${data.recentAttendance.present} / ${data.recentAttendance.total}`}
          accent="purple"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />
      </div>

      {data.fellowships.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">My Fellowships</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.fellowships.map((f) => (
                <li key={f.fellowshipId} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{f.fellowshipName}</span>
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                    {f.fellowshipType}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {upcomingDuties.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Rota Duties</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {upcomingDuties.map((d) => {
                const isToday = d.serviceDate === today;
                const dateLabel = new Date(d.serviceDate + 'T00:00:00').toLocaleDateString(
                  undefined,
                  { weekday: 'short', month: 'short', day: 'numeric' },
                );
                return (
                  <li
                    key={d.assignmentId}
                    className={`flex items-center justify-between p-3 text-sm ${
                      isToday ? 'border border-[#f8b537]/40 bg-[#f8b537]/5' : 'bg-surface-container-lowest'
                    }`}
                  >
                    <div>
                      <p className="font-medium">
                        {d.templateName} • {d.slotRoleName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateLabel}
                        {d.startTime ? ` • ${d.startTime.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    {isToday && (
                      <span className="rounded bg-[#f8b537] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Today
                      </span>
                    )}
                  </li>
                );
              })}
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
  const activeRole = useAuthStore((s) => s.activeRole);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const roleLabel = activeRole === 'admin' ? 'Administrator' :
    activeRole === 'pastor' ? 'Pastor' :
    activeRole === 'leader' ? 'Fellowship Leader' : 'Member';

  const subtitle = activeRole === 'admin'
    ? 'Church-wide overview'
    : activeRole === 'pastor'
      ? 'Your branch at a glance'
      : 'Your personal activity';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {user?.firstName ? `Good day, ${user.firstName}!` : 'Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {roleLabel}
        </span>
      </div>

      {activeRole === 'admin' ? (
        <AdminDashboard />
      ) : activeRole === 'pastor' ? (
        <BranchDashboard />
      ) : (
        <MemberDashboard />
      )}
    </div>
  );
}
