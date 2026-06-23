'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useQuery } from '@tanstack/react-query';
import { useMemberGrowth, useAttendanceTrend, useOutreachOverview, useOutreachAnalytics } from '@/hooks/use-reports';
import { useMemberDashboard } from '@/hooks/use-dashboard';
import { useFellowships, useFellowshipStats } from '@/hooks/use-fellowships';
import { useDepartmentMembers, useDepartmentJoinRequests, useDepartmentFollowups, useDepartmentRotaStats } from '@/hooks/use-departments';
import { useDepartmentAttendance } from '@/hooks/use-attendance';
import { useMyLeadership } from '@/hooks/use-me';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger, TabsContent } from '@kairos/ui';
import type { MeLeadershipFellowship, MeLeadershipDepartment } from '@kairos/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart,
  LineChart,
  Line,
} from 'recharts';

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  New: '#5D3FD3',
  'Following Up': '#5D3FD3',
  Interested: '#5D3FD3',
  Converted: '#5D3FD3',
  'Not Interested': '#5D3FD3',
  'Lost Contact': '#5D3FD3',
};

const PRESET_PURPLE_SHADES: Record<string, string> = {
  New: '#5D3FD3',
  'Following Up': '#7C3AED',
  Interested: '#8B5CF6',
  Converted: '#A78BFA',
  'Not Interested': '#C4B5FD',
  'Lost Contact': '#DDD6FE',
};

// ── Stat card ──────────────────────────────────────────────

function ReportStatCard({ title, value, sub, icon, trend, onClick }: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  onClick?: () => void;
}) {
  return (
    <Card className={`transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md hover:ring-1 hover:ring-primary/30' : 'hover:shadow-md'}`} onClick={onClick}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-1.5">
            <div className="text-muted-foreground/50">{icon}</div>
            {onClick && <svg className="h-3 w-3 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>}
          </div>
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        {trend && (
          <p className={`mt-1 text-xs font-medium ${
            trend.direction === 'up' ? 'text-emerald-600' : trend.direction === 'down' ? 'text-rose-600' : 'text-muted-foreground'
          }`}>
            {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '—'} {trend.label}
          </p>
        )}
        {sub && !trend && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

type Tab = 'attendance' | 'outreach' | 'growth';

function MemberTopFellowships({ memberData }: { memberData: any }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: meetingsData } = useQuery({
    queryKey: ['fellowship-meetings', expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const res = await api.fellowships.meetings.list(expandedId);
      return res.data ?? [];
    },
    enabled: !!expandedId,
  });

  const myFellowships = memberData?.fellowships ?? [];
  const totalPresent = memberData?.recentAttendance?.present ?? 0;
  const maxCount = Math.max(totalPresent, 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top Fellowships Attended</CardTitle>
        <p className="text-xs text-muted-foreground">Click to see meeting history</p>
      </CardHeader>
      <CardContent>
        {myFellowships.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fellowships joined yet.</p>
        ) : (
          <div className="space-y-3">
            {myFellowships.map((f: any) => {
              const count = myFellowships.length > 0 ? Math.max(1, Math.round(totalPresent / myFellowships.length)) : 0;
              const isExpanded = expandedId === f.fellowshipId;
              const meetings = (meetingsData as any[]) ?? [];
              return (
                <div key={f.fellowshipId}>
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setExpandedId(isExpanded ? null : f.fellowshipId)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{f.fellowshipName}</p>
                        <svg className={`h-3 w-3 text-muted-foreground/50 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      </div>
                      <span className="text-xs font-semibold text-primary">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((count / maxCount) * 100))}%` }} />
                    </div>
                  </div>

                  {/* Expanded meeting history */}
                  {isExpanded && (
                    <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Meeting History</p>
                      {meetings.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No meetings recorded yet.</p>
                      ) : (
                        meetings.slice(0, 8).map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-medium">
                              {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                            <span className="text-muted-foreground">
                              {m.meetingTime ?? (m.meetingDate ? new Date(m.meetingDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MemberSoulsTab() {
  const user = useAuthStore((s) => s.user);
  const memberId = user?.id;
  const [statusColors, setStatusColorsRaw] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairos-report-colors');
      if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    }
    return PRESET_PURPLE_SHADES;
  });
  const setStatusColors = (colors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    setStatusColorsRaw((prev) => {
      const next = typeof colors === 'function' ? colors(prev) : colors;
      if (typeof window !== 'undefined') localStorage.setItem('kairos-report-colors', JSON.stringify(next));
      return next;
    });
  };
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<string | null>(null);

  const { data: soulsData } = useQuery({
    queryKey: ['my-souls', memberId],
    queryFn: async () => {
      const res = await api.souls.list({ assignedMemberId: memberId, limit: 50 });
      return res.data;
    },
    enabled: !!memberId,
  });

  const souls = (soulsData as any)?.data ?? [];
  const converted = souls.filter((s: any) => s.status === 'Converted');
  const active = souls.filter((s: any) => s.status !== 'Converted' && s.status !== 'Not Interested' && s.status !== 'Lost Contact');
  const totalSouls = souls.length;
  const conversionRate = totalSouls > 0 ? Math.round((converted.length / totalSouls) * 100) : 0;

  // Status distribution for charts
  const statusCounts: Record<string, number> = {};
  souls.forEach((s: any) => { statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1; });
  const myFunnelData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  const myStatusData = [...myFunnelData].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Color customization */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          {showColorPicker ? 'Hide colours' : 'Customise colours'}
        </button>
        {showColorPicker && (
          <button onClick={() => setStatusColors(DEFAULT_STATUS_COLORS)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            Default (all purple)
          </button>
        )}
        {showColorPicker && (
          <button onClick={() => setStatusColors(PRESET_PURPLE_SHADES)} className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
            Purple shades
          </button>
        )}
      </div>
      {showColorPicker && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Pick a colour for each status</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.keys(statusColors).map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <input type="color" value={statusColors[status]} onChange={(e) => setStatusColors(prev => ({ ...prev, [status]: e.target.value }))} className="h-7 w-7 rounded border border-border cursor-pointer" />
                  <span className="text-xs text-foreground">{status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setEvidenceFilter(evidenceFilter === 'converted' ? null : 'converted')}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">My Souls Won</p>
              <div className="flex items-center gap-1">
                <span className="group relative">
                  <svg className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  <span className="absolute right-0 top-5 z-50 hidden group-hover:block w-44 rounded-md bg-popover border border-border p-2 text-[10px] text-popover-foreground shadow-md">Souls you personally led to Christ</span>
                </span>
                <svg className="h-3 w-3 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </div>
            </div>
            <p className="mt-1 text-3xl font-bold tracking-tight text-primary">{converted.length}</p>
            {converted.length > 0 && <p className="mt-1 text-xs text-emerald-600">↗ {conversionRate}% conversion</p>}
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setEvidenceFilter(evidenceFilter === 'active' ? null : 'active')}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">Active Follow-ups</p>
              <span className="group relative">
                <svg className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                <span className="absolute right-0 top-5 z-50 hidden group-hover:block w-44 rounded-md bg-popover border border-border p-2 text-[10px] text-popover-foreground shadow-md">Souls you are currently following up</span>
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-600">{active.length}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setEvidenceFilter(evidenceFilter === 'all' ? null : 'all')}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Assigned</p>
              <div className="flex items-center gap-1">
              <span className="group relative">
                <svg className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                <span className="absolute right-0 top-5 z-50 hidden group-hover:block w-44 rounded-md bg-popover border border-border p-2 text-[10px] text-popover-foreground shadow-md">All souls assigned to you from outreach</span>
              </span>
              <svg className="h-3 w-3 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </div>
            </div>
            <p className="mt-1 text-3xl font-bold tracking-tight">{totalSouls}</p>
          </CardContent>
        </Card>
      </div>

      {/* Evidence drill-down panel */}
      {evidenceFilter && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {evidenceFilter === 'converted' ? `Souls Won (${converted.length})` : evidenceFilter === 'active' ? `Active Follow-ups (${active.length})` : evidenceFilter === 'all' ? `All Souls (${totalSouls})` : `${evidenceFilter} (${souls.filter((s: any) => s.status === evidenceFilter).length})`}
              </CardTitle>
              <button onClick={() => setEvidenceFilter(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const list = evidenceFilter === 'converted' ? converted : evidenceFilter === 'active' ? active : evidenceFilter === 'all' ? souls : souls.filter((s: any) => s.status === evidenceFilter);
              return list.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No souls in this category yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Contact</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((soul: any, i: number) => (
                      <tr key={soul.id} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="py-2 font-medium">{soul.firstName} {soul.lastName}</td>
                        <td className="py-2 text-muted-foreground text-xs">{soul.phone ?? soul.email ?? '—'}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            soul.status === 'Converted' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                            soul.status === 'Following Up' ? 'bg-primary/10 text-primary' :
                            soul.status === 'Interested' ? 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]' :
                            'bg-muted text-muted-foreground'
                          }`}>{soul.status}</span>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">{soul.createdAt ? new Date(soul.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      {totalSouls > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Souls by Status bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">My Souls by Status</CardTitle>
              <p className="text-xs text-muted-foreground">Breakdown of your assigned souls</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={myFunnelData} barSize={28} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {myFunnelData.map((entry) => (
                      <Cell key={entry.status} fill={statusColors[entry.status] ?? '#5D3FD3'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Breakdown progress bars */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">Your pipeline progress</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myStatusData.map((item) => {
                  const pct = totalSouls > 0 ? Math.round((item.count / totalSouls) * 100) : 0;
                  return (
                    <div key={item.status} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setEvidenceFilter(evidenceFilter === item.status ? null : item.status)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.status}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{item.count}</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                          <svg className="h-3 w-3 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: statusColors[item.status] ?? '#5D3FD3' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Souls list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">My Souls</CardTitle>
          <p className="text-xs text-muted-foreground">People assigned to you from outreach</p>
        </CardHeader>
        <CardContent>
          {souls.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No souls assigned to you yet. Participate in outreach programs to get souls assigned.</p>
          ) : (
            <div className="space-y-2">
              {souls.map((soul: any) => (
                <div key={soul.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{soul.firstName} {soul.lastName}</p>
                    <p className="text-xs text-muted-foreground">{soul.phone ?? soul.email ?? 'No contact'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    soul.status === 'Converted' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    soul.status === 'Following Up' ? 'bg-primary/10 text-primary' :
                    soul.status === 'Interested' ? 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]' :
                    'bg-muted text-muted-foreground'
                  }`}>{soul.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Branch-wide reports panel ─────────────────────────────
//
// Existing report content (Attendance / Growth / Outreach sub-tabs) for the
// "My Branch" persona — admins, branch admins, and pastors. Plain members
// also fall through to this panel via the legacy member layout (rendered as
// `<BranchReportsPanel isLeadership={false}/>`), which preserves the original
// behaviour of /reports prior to Phase 6.

function BranchReportsPanel({ isLeadership }: { isLeadership: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const [statusColors, setStatusColorsRaw] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairos-report-colors');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return PRESET_PURPLE_SHADES;
  });
  const setStatusColors = (colors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    setStatusColorsRaw((prev) => {
      const next = typeof colors === 'function' ? colors(prev) : colors;
      if (typeof window !== 'undefined') {
        localStorage.setItem('kairos-report-colors', JSON.stringify(next));
      }
      return next;
    });
  };
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { data: growthData, isLoading: growthLoading } = useMemberGrowth();
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceTrend();
  const { data: outreachOverview, isLoading: outreachLoading } = useOutreachOverview();
  const { data: outreachAnalytics } = useOutreachAnalytics();
  const { data: _fellowshipsResult } = useFellowships({ page: 1, limit: 20 });
  const { data: memberData } = useMemberDashboard();

  // ── Real data ──────────────────────────────────────────────
  const effectiveGrowth = growthData ?? [];
  const effectiveAttendance = attendanceData ?? [];
  const effectiveOutreachOverview = outreachOverview ?? { totalSouls: 0 };
  const effectiveOutreachAnalytics = outreachAnalytics ?? { overview: { totalSouls: 0, converted: 0, activeFollowUps: 0, conversionRate: 0, avgDaysToConversion: 0 }, conversionFunnel: {}, statusDistribution: {} };
  const isLoading = growthLoading || attendanceLoading || outreachLoading;

  // Stat values
  const totalNewMembers = effectiveGrowth.reduce((sum, d) => sum + d.newSignups, 0);
  const avgAttendance = effectiveAttendance.length
    ? Math.round(effectiveAttendance.reduce((sum, d) => sum + d.rate, 0) / effectiveAttendance.length)
    : 0;
  const totalSouls = effectiveOutreachOverview?.totalSouls ?? 0;
  const growthMonths = effectiveGrowth.length;

  // Attendance trend direction
  const attendanceTrending = effectiveAttendance.length >= 2
    ? (effectiveAttendance[effectiveAttendance.length - 1]?.rate ?? 0) > (effectiveAttendance[0]?.rate ?? 0)
    : null;

  // Growth trend
  const growthTrending = effectiveGrowth.length >= 2
    ? (effectiveGrowth[effectiveGrowth.length - 1]?.newSignups ?? 0) >= (effectiveGrowth[effectiveGrowth.length - 2]?.newSignups ?? 0)
    : null;

  // Cumulative growth for line chart
  const cumulativeGrowth = effectiveGrowth.reduce((acc, d, i) => {
    const prev = i > 0 ? acc[i - 1]!.total : 0;
    acc.push({ month: d.month.slice(5), total: prev + d.newSignups });
    return acc;
  }, [] as { month: string; total: number }[]);

  // Outreach funnel
  const funnelData = effectiveOutreachAnalytics?.conversionFunnel
    ? Object.entries(effectiveOutreachAnalytics.conversionFunnel).map(([status, count]) => ({ status, count: count as number }))
    : [];

  const statusData = effectiveOutreachAnalytics?.statusDistribution
    ? Object.entries(effectiveOutreachAnalytics.statusDistribution).map(([status, count]) => ({ status, count: count as number }))
    : [];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'growth', label: 'Growth' },
    { key: 'outreach', label: 'Outreach' },
  ];

  // Branch-wide layout — API scopes data by role
  return (
    <div className="space-y-6">
      {/* Sub-tab pills */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex rounded-full border border-border bg-muted p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards — personal for members/leaders, church-wide for admin/pastor */}
      {isLeadership ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="New Members"
          value={totalNewMembers}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>}
          trend={totalNewMembers > 0 ? { direction: 'up', label: `+${totalNewMembers} last ${growthMonths}mo` } : { direction: 'flat', label: 'vs last period' }}
        />
        <ReportStatCard
          title="Avg Attendance"
          value={`${avgAttendance}%`}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend={attendanceTrending === true ? { direction: 'up', label: 'Trending up' } : attendanceTrending === false ? { direction: 'down', label: 'Trending down' } : { direction: 'flat', label: 'vs last period' }}
        />
        <ReportStatCard
          title="Souls Reached"
          value={totalSouls}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>}
          trend={effectiveOutreachAnalytics ? { direction: (effectiveOutreachAnalytics as any).overview.conversionRate > 0 ? 'up' : 'flat', label: `${(effectiveOutreachAnalytics as any).overview.conversionRate}% conversion` } : undefined}
        />
        <ReportStatCard
          title="Growth Months"
          value={growthMonths}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
          trend={growthTrending !== null ? { direction: growthTrending ? 'up' : 'down', label: growthTrending ? '+1' : 'Slowing' } : undefined}
        />
      </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="My Fellowships"
          value={memberData?.fellowshipsJoined ?? 0}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>}
          trend={{ direction: (memberData?.fellowshipsJoined ?? 0) > 0 ? 'up' : 'flat', label: `${memberData?.fellowshipsJoined ?? 0} joined` }}
        />
        <ReportStatCard
          title="My Attendance"
          value={`${memberData?.recentAttendance.rate ?? 0}%`}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend={(memberData?.recentAttendance.rate ?? 0) >= 70 ? { direction: 'up', label: 'Great attendance' } : (memberData?.recentAttendance.rate ?? 0) > 0 ? { direction: 'down', label: 'Needs improvement' } : { direction: 'flat', label: 'No data yet' }}
        />
        <ReportStatCard
          title="My Souls"
          value={totalSouls}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>}
          trend={{ direction: totalSouls > 0 ? 'up' : 'flat', label: totalSouls > 0 ? 'Souls won' : 'No souls yet' }}
        />
        <ReportStatCard
          title="Meetings Attended"
          value={`${memberData?.recentAttendance.present ?? 0}/${memberData?.recentAttendance.total ?? 0}`}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
          trend={{ direction: (memberData?.recentAttendance.present ?? 0) > 0 ? 'up' : 'flat', label: 'Last 30 days' }}
        />
      </div>
      )}

      {/* ── Attendance tab ── */}
      {activeTab === 'attendance' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Weekly Attendance Rate</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Average over the last 8 weeks</p>
                </div>
                {attendanceTrending !== null && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${attendanceTrending ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                    {attendanceTrending ? '↗ Trending up' : '↘ Trending down'}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : effectiveAttendance.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No attendance data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={effectiveAttendance}>
                    <defs>
                      <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5D3FD3" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#5D3FD3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} unit="%" axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Rate']} contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="rate" stroke="#5D3FD3" strokeWidth={2} fill="url(#attendanceGrad)" dot={{ fill: '#5D3FD3', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Highlight + Fellowship breakdown */}
          <div className="space-y-4">
            <Card className="bg-foreground text-background dark:bg-card dark:text-foreground dark:border">
              <CardContent className="pt-5 pb-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-50">Monthly Highlight</p>
                <p className="mt-2 text-lg font-bold">
                  {attendanceTrending === true ? 'Attendance trending up' : attendanceTrending === false ? 'Attendance needs attention' : 'Attendance overview'}
                </p>
                <p className="mt-2 text-sm opacity-70">
                  {avgAttendance > 0
                    ? `Average rate is ${avgAttendance}% over the last 8 weeks.`
                    : 'Start recording attendance to see trends here.'}
                </p>
                <Link href="/fellowships" className="mt-4 flex items-center justify-between rounded-lg border border-current/20 px-4 py-2.5 text-sm font-medium hover:opacity-80 transition-opacity">
                  View breakdown
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" /></svg>
                </Link>
              </CardContent>
            </Card>

            {/* Fellowship attendance bars */}
            <MemberTopFellowships memberData={memberData} />
          </div>
        </div>
      )}

      {/* ── Growth tab ── */}
      {activeTab === 'growth' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Member Growth</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Active members over time</p>
                </div>
                {growthTrending !== null && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${growthTrending ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                    {growthTrending ? '↗ Trending up' : '↘ Slowing'}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : cumulativeGrowth.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No growth data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cumulativeGrowth}>
                    <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--muted-foreground) / 0.15)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                    <Line type="monotone" dataKey="total" stroke="#a78bfa" strokeWidth={1.5} dot={{ fill: '#a78bfa', r: 3.5, strokeWidth: 2, stroke: '#7c3aed' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly signups bar chart */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Monthly Signups</CardTitle>
              </CardHeader>
              <CardContent>
                {effectiveGrowth.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={effectiveGrowth} barSize={20}>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                      <Bar dataKey="newSignups" name="New Members" fill="#7c3aed" radius={[4, 4, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Trend alert */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Trend Alert</p>
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <p className="text-sm">
                    {totalNewMembers > 0
                      ? <><span className="font-semibold">{totalNewMembers} new members</span> joined in the last {growthMonths} months. {growthTrending ? 'Growth is accelerating.' : 'Growth is steady.'}</>
                      : 'No new member signups recorded recently. Consider running outreach programs to drive growth.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Outreach tab ── */}
      {activeTab === 'outreach' && !isLeadership && (
        <MemberSoulsTab />
      )}
      {activeTab === 'outreach' && isLeadership && (
        <div className="space-y-6">
          {/* Color customization toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {showColorPicker ? 'Hide colours' : 'Customise colours'}
            </button>
            {showColorPicker && (
              <button
                onClick={() => setStatusColors(DEFAULT_STATUS_COLORS)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Default (all purple)
              </button>
            )}
            {showColorPicker && (
              <button
                onClick={() => setStatusColors(PRESET_PURPLE_SHADES)}
                className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                Purple shades
              </button>
            )}
          </div>
          {showColorPicker && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Pick a colour for each status</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(statusColors).map((status) => (
                    <div key={status} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={statusColors[status]}
                        onChange={(e) => setStatusColors(prev => ({ ...prev, [status]: e.target.value }))}
                        className="h-7 w-7 rounded border border-border cursor-pointer"
                      />
                      <span className="text-xs text-foreground">{status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Summary row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Active Follow-ups</p>
                  <span className="group relative">
                    <svg className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                    <span className="absolute right-0 top-5 z-50 hidden group-hover:block w-48 rounded-md bg-popover border border-border p-2 text-[10px] text-popover-foreground shadow-md">Souls currently being followed up by your team</span>
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold tracking-tight text-primary">{(effectiveOutreachAnalytics as any).overview.activeFollowUps ?? '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Conversion Rate</p>
                  <span className="group relative">
                    <svg className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                    <span className="absolute right-0 top-5 z-50 hidden group-hover:block w-48 rounded-md bg-popover border border-border p-2 text-[10px] text-popover-foreground shadow-md">Percentage of souls that moved from New to Converted</span>
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-600">{`${(effectiveOutreachAnalytics as any).overview.conversionRate}%`}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Avg Time to Conversion</p>
                  <span className="group relative">
                    <svg className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                    <span className="absolute right-0 top-5 z-50 hidden group-hover:block w-48 rounded-md bg-popover border border-border p-2 text-[10px] text-popover-foreground shadow-md">Average number of days from first contact to conversion</span>
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold tracking-tight text-[#9a6b04] dark:text-[#f8b537]">{(effectiveOutreachAnalytics as any).overview.avgDaysToConversion > 0 ? `${(effectiveOutreachAnalytics as any).overview.avgDaysToConversion} days` : 'No data'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conversion funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Souls by Status</CardTitle>
                <p className="text-xs text-muted-foreground">Breakdown across the pipeline</p>
              </CardHeader>
              <CardContent>
                {funnelData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No outreach data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={funnelData} barSize={32} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry) => (
                          <Cell key={entry.status} fill={statusColors[entry.status] ?? '#5D3FD3'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status breakdown with progress bars */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">Count per pipeline stage</p>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {statusData.map((item) => {
                      const pct = totalSouls > 0 ? Math.round((item.count / totalSouls) * 100) : 0;
                      return (
                        <div key={item.status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{item.status}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{item.count}</span>
                              <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: statusColors[item.status] ?? '#5D3FD3' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trend alert */}
          { (effectiveOutreachAnalytics as any).overview.conversionRate > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Trend Alert</p>
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-semibold">{(effectiveOutreachAnalytics as any).overview.converted} souls</span> converted out of{' '}
                    <span className="font-semibold">{(effectiveOutreachAnalytics as any).overview.totalSouls} total</span> — a{' '}
                    <span className="font-semibold text-emerald-600">{(effectiveOutreachAnalytics as any).overview.conversionRate}% conversion rate</span>.
                    Average time to conversion is <span className="font-semibold">{(effectiveOutreachAnalytics as any).overview.avgDaysToConversion} days</span>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── My Fellowship reports ─────────────────────────────────
//
// Fellowship-scoped stats for a leader. When the user leads multiple
// fellowships, a small picker dropdown surfaces above the panel; otherwise
// the lone fellowship is selected automatically. Backed by a single
// aggregate endpoint (/api/fellowships/:id/stats).

function MyFellowshipReports({ fellowships }: { fellowships: MeLeadershipFellowship[] }) {
  const [selectedId, setSelectedId] = useState<string>(fellowships[0]?.id ?? '');
  const selected = fellowships.find((f) => f.id === selectedId) ?? fellowships[0];

  if (!selected) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          You don&apos;t currently lead any fellowships.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {fellowships.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="fellowship-picker" className="text-xs font-medium text-muted-foreground">
            Fellowship
          </label>
          <select
            id="fellowship-picker"
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-[#5D3FD3] focus:outline-none focus:ring-1 focus:ring-[#5D3FD3]"
          >
            {fellowships.map((f) => (
              <option key={f.id} value={f.id}>{f.fellowshipName}</option>
            ))}
          </select>
        </div>
      )}
      <FellowshipReportPanel fellowshipId={selected.id} fellowshipName={selected.fellowshipName} />
    </div>
  );
}

function FellowshipReportPanel({ fellowshipId, fellowshipName }: { fellowshipId: string; fellowshipName: string }) {
  const statsQ = useFellowshipStats(fellowshipId);

  if (statsQ.isLoading || !statsQ.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="py-8"><div className="h-16 animate-pulse rounded-md bg-muted" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const { members, meetings, followups, joinRequests } = statsQ.data;
  const meetingsTrend = meetings.byWeek;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="Members"
          value={members.total}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          sub={`${members.active} active${members.inactive ? ` · ${members.inactive} inactive` : ''}`}
        />
        <ReportStatCard
          title="Meetings (90d)"
          value={meetings.last90d}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" /></svg>}
          sub={meetings.last90d === 0 ? 'None recorded' : 'Recorded meetings'}
        />
        <ReportStatCard
          title="Follow-ups"
          value={followups.total}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          sub={`${followups.open} open · ${followups.closed} closed`}
        />
        <ReportStatCard
          title="New joins (30d)"
          value={joinRequests.recent30d}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3" /></svg>}
          sub={joinRequests.recent30d === 0 ? 'No new requests' : `${joinRequests.pending} pending review`}
        />
      </div>

      {/* Meeting trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Meetings per week</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Last 90 days — {fellowshipName}</p>
            </div>
            <span className="rounded-full border border-[#5D3FD3]/30 bg-[#5D3FD3]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5D3FD3]">
              Scoped: fellowship
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {meetingsTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No meetings in the last 90 days. Record meetings to see trends here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={meetingsTrend} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="count" name="Meetings" fill="#5D3FD3" radius={[4, 4, 0, 0]} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Open followups breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fellowshipName} · last 90 days
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Open follow-ups</p>
              <p className="mt-1 text-2xl font-bold text-[#5D3FD3]">{followups.open}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Closed follow-ups</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{followups.closed}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Pending join requests</p>
              <p className="mt-1 text-2xl font-bold text-[#9a6b04] dark:text-[#f8b537]">{joinRequests.pending}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── My Department reports ─────────────────────────────────
//
// Department-scoped stats. Same shape as MyFellowshipReports: picker for
// multi-department leaders, otherwise auto-select the only one.
//
// Service-attendance rate + weekly trend come from the existing department
// attendance endpoint. Rota-instance counts still pending (separate endpoint).

function MyDepartmentReports({ departments }: { departments: MeLeadershipDepartment[] }) {
  const [selectedId, setSelectedId] = useState<string>(departments[0]?.id ?? '');
  const selected = departments.find((d) => d.id === selectedId) ?? departments[0];

  if (!selected) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          You don&apos;t currently lead any departments.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {departments.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="department-picker" className="text-xs font-medium text-muted-foreground">
            Department
          </label>
          <select
            id="department-picker"
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-[#5D3FD3] focus:outline-none focus:ring-1 focus:ring-[#5D3FD3]"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.departmentName}</option>
            ))}
          </select>
        </div>
      )}
      <DepartmentReportPanel branchDeptId={selected.id} departmentName={selected.departmentName} />
    </div>
  );
}

function DepartmentReportPanel({ branchDeptId, departmentName }: { branchDeptId: string; departmentName: string }) {
  const membersQ = useDepartmentMembers(branchDeptId);
  const joinRequestsQ = useDepartmentJoinRequests(branchDeptId);
  const followupsQ = useDepartmentFollowups(branchDeptId);
  const attendanceQ = useDepartmentAttendance(branchDeptId, { weeks: 12 });
  const rotaStatsQ = useDepartmentRotaStats(branchDeptId, { windowDays: 28 });

  const isLoading = membersQ.isLoading || joinRequestsQ.isLoading || followupsQ.isLoading || attendanceQ.isLoading || rotaStatsQ.isLoading;

  const members = membersQ.data ?? [];
  const joinRequests = joinRequestsQ.data ?? [];
  const followups = followupsQ.data ?? [];
  const attendance = attendanceQ.data;
  const rotaStats = rotaStatsQ.data;
  const attendanceRatePct = attendance ? Math.round((attendance.rate ?? 0) * 100) : 0;
  const attendanceTrend = (attendance?.trend ?? []).map((p) => ({
    week: p.weekStart.slice(0, 10),
    attendees: p.attendees,
  }));

  // Probation vs active — department_members track probation state.
  const probationMembers = members.filter((m: any) =>
    (m.status ?? '').toLowerCase() === 'probation' || m.isProbation === true
  ).length;
  const activeMembers = Math.max(0, members.length - probationMembers);

  // Pending join requests — status not declined/withdrawn/active.
  const pendingJoinRequests = joinRequests.filter((r: any) => {
    const status = (r.status ?? '').toLowerCase();
    return status !== 'declined' && status !== 'withdrawn' && status !== 'active' && status !== 'rejected';
  }).length;

  // Open follow-ups.
  const openFollowups = followups.filter((f: any) => {
    const status = (f.status ?? '').toLowerCase();
    return status !== 'completed' && status !== 'closed';
  }).length;
  const closedFollowups = followups.length - openFollowups;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="py-8"><div className="h-16 animate-pulse rounded-md bg-muted" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ReportStatCard
          title="Members"
          value={members.length}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197" /></svg>}
          sub={probationMembers > 0 ? `${activeMembers} active · ${probationMembers} probation` : `${activeMembers} active`}
        />
        <ReportStatCard
          title="Pending join requests"
          value={pendingJoinRequests}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3" /></svg>}
          sub={pendingJoinRequests === 0 ? 'All caught up' : 'Awaiting review'}
        />
        <ReportStatCard
          title="Open follow-ups"
          value={openFollowups}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          sub={`${closedFollowups} closed`}
        />
        <ReportStatCard
          title="Service attendance"
          value={attendance ? `${attendanceRatePct}%` : '—'}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          sub={
            attendance
              ? attendance.totalServices === 0
                ? `No services in last ${attendance.windowWeeks}w`
                : `${attendance.distinctAttendees}/${attendance.activeMembers} attended · ${attendance.totalServices} services`
              : 'Loading…'
          }
        />
        <ReportStatCard
          title="Upcoming rota"
          value={rotaStats ? rotaStats.upcomingCount : '—'}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" /></svg>}
          sub={
            rotaStats
              ? rotaStats.upcomingCount === 0
                ? `Nothing scheduled in next ${rotaStats.windowDays}d`
                : `${rotaStats.publishedCount} published · ${rotaStats.draftCount} draft`
              : 'Loading…'
          }
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Department snapshot</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{departmentName}</p>
            </div>
            <span className="rounded-full border border-[#5D3FD3]/30 bg-[#5D3FD3]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5D3FD3]">
              Scoped: department
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No members in this department yet. Approve a join request to get started.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Active members</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{activeMembers}</p>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">On probation</p>
                <p className="mt-1 text-2xl font-bold text-[#9a6b04] dark:text-[#f8b537]">{probationMembers}</p>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Open follow-ups</p>
                <p className="mt-1 text-2xl font-bold text-[#5D3FD3]">{openFollowups}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly attendance trend — distinct department members who attended
          a service that week. */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Service attendance per week</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {attendance ? `Last ${attendance.windowWeeks} weeks · ${departmentName}` : departmentName}
              </p>
            </div>
            <span className="rounded-full border border-[#5D3FD3]/30 bg-[#5D3FD3]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5D3FD3]">
              Scoped: department
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No service attendance recorded in this window yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attendanceTrend} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '0.5rem', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="attendees" name="Attendees" fill="#5D3FD3" radius={[4, 4, 0, 0]} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Persona tabs ──────────────────────────────────────────
//
// Persona keys for the top-level /reports tabs. Rendered inline at the call
// site below using the @kairos/ui Tabs primitive — no wrapper component needed.

type PersonaKey = 'branch' | 'fellowship' | 'department';

const PERSONA_LABELS: Record<PersonaKey, string> = {
  branch: 'My Branch',
  fellowship: 'My Fellowship',
  department: 'My Department',
};

// ── Page orchestrator ─────────────────────────────────────

export default function ReportsPage() {
  const activeRole = useAuthStore((s) => s.activeRole);
  const bsaIds = useAuthStore((s) => s.branchSystemAdminBranchIds);
  const bdaIds = useAuthStore((s) => s.branchDataAdminBranchIds);
  const caps = useCapabilities();

  // useMyLeadership populates auth-store BSA/BDA + returns lead arrays.
  const leadership = useMyLeadership();
  const leadFellowships = leadership.data?.leadFellowships ?? [];
  const coLeadFellowships = leadership.data?.coLeadFellowships ?? [];
  const leadDepartments = leadership.data?.leadDepartments ?? [];
  const deputyDepartments = leadership.data?.deputyDepartments ?? [];
  const allLeadFellowships = [...leadFellowships, ...coLeadFellowships];
  const allLeadDepartments = [...leadDepartments, ...deputyDepartments];

  // Persona authority — branch admins inherit BSA/BDA from /api/me/leadership
  // (mirrored into auth-store), so reading either is safe.
  const isSystemAdmin = activeRole === 'admin';
  const isBranchSystemAdmin = bsaIds.length > 0 || (leadership.data?.branchSystemAdminBranchIds.length ?? 0) > 0;
  const isBranchDataAdmin = bdaIds.length > 0 || (leadership.data?.branchDataAdminBranchIds.length ?? 0) > 0;
  const isBranchAdmin = isBranchSystemAdmin || isBranchDataAdmin;
  const isPastor = caps.has('branch:write');
  const hasFellowshipLead = allLeadFellowships.length > 0;
  const hasDepartmentLead = allLeadDepartments.length > 0;

  const canSeeBranch = isSystemAdmin || isBranchAdmin || isPastor;
  const canSeeFellowship = hasFellowshipLead;
  const canSeeDepartment = hasDepartmentLead;

  // Available persona tabs in priority order.
  const availableTabs: PersonaKey[] = useMemo(() => {
    const tabs: PersonaKey[] = [];
    if (canSeeBranch) tabs.push('branch');
    if (canSeeFellowship) tabs.push('fellowship');
    if (canSeeDepartment) tabs.push('department');
    return tabs;
  }, [canSeeBranch, canSeeFellowship, canSeeDepartment]);

  // Default tab — most-elevated persona the user holds.
  const defaultTab: PersonaKey =
    canSeeBranch ? 'branch' :
    canSeeFellowship ? 'fellowship' :
    canSeeDepartment ? 'department' :
    'branch'; // plain members never see tabs; this fallback is a safety net.

  const [persona, setPersona] = useState<PersonaKey>(defaultTab);

  // On first render leadership is still loading, so availableTabs is just
  // ['branch'] (or empty) and persona locks to 'branch'. When data lands,
  // re-sync to defaultTab only if the current persona isn't actually
  // available — that way a manual tab click sticks but a stale initial
  // selection gets corrected.
  useEffect(() => {
    if (!leadership.isSuccess) return;
    if (!availableTabs.includes(persona)) {
      setPersona(defaultTab);
    }
    // Intentionally omitting `persona` from deps so manual clicks aren't undone.

  }, [leadership.isSuccess, availableTabs, defaultTab]);

  // Plain member path — no tabs, render the legacy member report layout
  // (BranchReportsPanel reads activeRole internally to switch member/leadership stats).
  const isPlainMember = !canSeeBranch && !canSeeFellowship && !canSeeDepartment;

  // Header tile is constant. The persona switch is the only branching variable
  // — pull it out so the JSX stays readable.
  const header = (
    <div>
      <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-primary">← Overview</Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Reports &amp; Analytics</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Track church growth, attendance trends, and outreach — all in one calm view.
      </p>
    </div>
  );

  if (isPlainMember) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">{header}</div>
        <BranchReportsPanel isLeadership={false} />
      </div>
    );
  }

  // Leadership path — wrap the entire surface in <Tabs> so the pill row (in
  // the header) and the active panel (below) share context. `className="contents"`
  // makes Tabs layout-transparent; the surrounding `space-y-6` div continues to
  // own vertical rhythm, preserving the prior visual layout pixel-for-pixel.
  return (
    <Tabs
      value={persona}
      onValueChange={(v) => setPersona(v as PersonaKey)}
      className="contents"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {header}
          {availableTabs.length > 1 && (
            <TabsList aria-label="Reports persona">
              {availableTabs.map((key) => (
                <TabsTrigger key={key} value={key}>{PERSONA_LABELS[key]}</TabsTrigger>
              ))}
            </TabsList>
          )}
        </div>

        {/* Active persona panel */}
        <TabsContent value="branch"><BranchReportsPanel isLeadership={true} /></TabsContent>
        <TabsContent value="fellowship">
          <MyFellowshipReports fellowships={allLeadFellowships} />
        </TabsContent>
        <TabsContent value="department">
          <MyDepartmentReports departments={allLeadDepartments} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
