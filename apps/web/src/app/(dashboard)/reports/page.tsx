'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useMemberGrowth, useAttendanceTrend } from '@/hooks/use-reports';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'];

// ── Mock giving data (donations module not in MVP) ─────────
const MOCK_GIVING = [
  { category: 'Tithes', amount: 45200 },
  { category: 'Offering', amount: 18750 },
  { category: 'Building Fund', amount: 12300 },
  { category: 'Other', amount: 4800 },
];
const MOCK_GIVING_MONTHLY = [
  { month: 'Jan', amount: 8200 },
  { month: 'Feb', amount: 7600 },
  { month: 'Mar', amount: 9100 },
  { month: 'Apr', amount: 8800 },
  { month: 'May', amount: 10400 },
  { month: 'Jun', amount: 9500 },
];

// ── Stat Card (reused from dashboard) ──────────────────────
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
    purple: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    gold: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
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

type Tab = 'attendance' | 'giving' | 'growth';

export default function ReportsPage() {
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('attendance');

  const { data: growthData, isLoading: growthLoading } = useMemberGrowth();
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceTrend();

  // Route guard — members cannot access reports
  if (activeRole === 'member') {
    router.replace('/dashboard');
    return null;
  }

  const isLoading = growthLoading || attendanceLoading;

  // Compute stat values
  const totalNewMembers = growthData?.reduce((sum, d) => sum + d.newSignups, 0) ?? 0;
  const avgAttendance = attendanceData?.length
    ? Math.round(attendanceData.reduce((sum, d) => sum + d.rate, 0) / attendanceData.length)
    : 0;
  const totalGiving = MOCK_GIVING.reduce((sum, d) => sum + d.amount, 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'giving', label: 'Giving' },
    { key: 'growth', label: 'Growth' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track church growth, attendance trends, and giving</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New Members"
          value={totalNewMembers}
          accent="purple"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          }
        />
        <StatCard
          title="Avg Attendance"
          value={`${avgAttendance}%`}
          accent="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Giving"
          value={`$${totalGiving.toLocaleString()}`}
          accent="gold"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Growth Months"
          value={growthData?.length ?? 0}
          accent="rose"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
      </div>

      {/* Pill tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-input/15 bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Weekly Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading attendance data...</p>
              </div>
            ) : !attendanceData || attendanceData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No attendance data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} unit="%" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Rate']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#6D28D9" strokeWidth={2} dot={{ fill: '#6D28D9', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'giving' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Giving by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={MOCK_GIVING}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {MOCK_GIVING.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Monthly Giving Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={MOCK_GIVING_MONTHLY} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {MOCK_GIVING_MONTHLY.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <p className="text-center text-xs text-muted-foreground">
              Giving data shown is for demonstration purposes. Full donation tracking will be available when the Donations module is launched.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'growth' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Member Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading growth data...</p>
              </div>
            ) : !growthData || growthData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No growth data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={growthData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="newSignups" name="New Members" radius={[4, 4, 0, 0]}>
                    {growthData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
