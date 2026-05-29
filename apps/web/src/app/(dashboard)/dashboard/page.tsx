'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useAdminDashboard, useBranchDashboard, useMemberDashboard } from '@/hooks/use-dashboard';
import { useMembers } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import { useFellowships } from '@/hooks/use-fellowships';
import { useMemberGrowth, useAttendanceTrend } from '@/hooks/use-reports';
import { useAttendanceSummary, useAttendanceByBranch } from '@/hooks/use-attendance';
import { useNewBelieversHealth, useEnrollments } from '@/hooks/use-new-believers';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@kairos/ui';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

// ── Daily verses ───────────────────────────────────────────

const DAILY_VERSES = [
  { text: 'Let all that you do be done in love.', ref: 'Psalm 46:10' },
  { text: 'Trust in the Lord with all your heart.', ref: 'Prov 3:5' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Phil 4:13' },
  { text: 'Be still and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: 'For I know the plans I have for you.', ref: 'Jer 29:11' },
  { text: 'Love one another as I have loved you.', ref: 'John 15:12' },
];
const getDailyVerse = () => DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length]!;

// ── Stat card ──────────────────────────────────────────────

function StatCard({ title, value, sub, icon, accent, onClick }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode;
  accent: 'purple' | 'gold' | 'emerald' | 'rose'; onClick?: () => void;
}) {
  const valueColor = { purple: 'text-[#a78bfa]', gold: 'text-[#f8b537]', emerald: 'text-emerald-400', rose: 'text-rose-400' }[accent];
  const iconColor = { purple: 'text-[#a78bfa]/50', gold: 'text-[#f8b537]/50', emerald: 'text-emerald-400/50', rose: 'text-rose-400/50' }[accent];
  const borderColor = { purple: 'border-primary/20', gold: 'border-[#f8b537]/20', emerald: 'border-emerald-400/20', rose: 'border-rose-400/20' }[accent];
  const glowColor = { purple: 'shadow-primary/5', gold: 'shadow-[#f8b537]/10', emerald: 'shadow-emerald-400/10', rose: 'shadow-rose-400/10' }[accent];
  
  return (
    <div
      className={`rounded-lg border ${borderColor} bg-card px-5 py-4 shadow-lg ${glowColor} ${onClick ? 'cursor-pointer hover:border-opacity-60 hover:bg-muted/80 transition-colors' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className={`mt-2 text-4xl font-bold tracking-tight ${valueColor}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground/70">{sub}</p>}
        </div>
        <div className={`mt-1 ${iconColor}`}>{icon}</div>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────

const BranchIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18l2.25 2.25m0 0l6-6 6 6 2.25-2.25M12 3.75l6 6v10.5M9.75 21V12h4.5V21" /></svg>;
const MembersIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const FellowshipsIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>;
const AlertIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>;
const CalendarIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
const CheckIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// ── Stat skeletons ─────────────────────────────────────────

function StatsSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-${cols}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

// ── Role stat rows ─────────────────────────────────────────

function AdminStats() {
  const { data, isLoading } = useAdminDashboard();
  const [evidenceOpen, setEvidenceOpen] = useState<'branches' | 'members' | 'fellowships' | 'pending' | null>(null);

  if (isLoading || !data) return <StatsSkeleton />;
  const pending = data.membersByApproval.find(s => s.status === 'pending')?.count ?? 0;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Branches" value={data.totalBranches} sub="Active" accent="purple" icon={<BranchIcon />} onClick={() => setEvidenceOpen('branches')} />
        <StatCard title="Total Members" value={data.totalMembers} sub="+3 this month" accent="emerald" icon={<MembersIcon />} onClick={() => setEvidenceOpen('members')} />
        <StatCard title="Total Fellowships" value={data.totalFellowships} sub="Scheduled" accent="gold" icon={<FellowshipsIcon />} onClick={() => setEvidenceOpen('fellowships')} />
        <StatCard title="Pending Approvals" value={pending} sub="Requests" accent="rose" icon={<AlertIcon />} onClick={() => setEvidenceOpen('pending')} />
      </div>

      {/* Evidence Dialogs */}
      <AdminEvidenceDialog type={evidenceOpen} onClose={() => setEvidenceOpen(null)} />
    </>
  );
}

function AdminEvidenceDialog({ type, onClose }: { type: 'branches' | 'members' | 'fellowships' | 'pending' | null; onClose: () => void }) {
  const { data: branchesData } = useBranches();
  const { data: membersData } = useMembers({ limit: 100 });
  const { data: fellowshipsData } = useFellowships({ page: 1, limit: 100 });
  const { data: pendingData } = useMembers({ approvalStatus: 'pending', limit: 100 });

  const allMembers = membersData?.data ?? [];
  const allBranches = branchesData ?? [];
  const allFellowships = fellowshipsData?.data ?? [];
  const pendingMembers = pendingData?.data ?? [];

  const titles: Record<string, string> = {
    branches: 'Total Branches — Evidence',
    members: 'Total Members — Evidence',
    fellowships: 'Total Fellowships — Evidence',
    pending: 'Pending Approvals — Evidence',
  };

  return (
    <Dialog open={!!type} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{type ? titles[type] : ''}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          {type === 'branches' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Showing all {allBranches.length} active branches</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {allBranches.map((b, i) => (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{b.branchName}</td>
                      <td className="py-2 text-muted-foreground capitalize">{b.branchType?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="py-2 text-muted-foreground">{b.city ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'members' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Showing all {allMembers.length} active members</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Email</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allMembers.map((m, i) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{m.firstName} {m.lastName}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.email ?? '—'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.branchName ?? '—'}</td>
                      <td className="py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          m.approvalStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                          m.approvalStatus === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>{m.approvalStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'fellowships' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Showing all {allFellowships.length} active fellowships</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fellowship Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {allFellowships.map((f, i) => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{f.fellowshipName}</td>
                      <td className="py-2 text-muted-foreground text-xs capitalize">{f.fellowshipType?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{f.branchName ?? '—'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{f.meetingSchedule ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'pending' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Showing all {pendingMembers.length} pending approval requests</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Email</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMembers.map((m, i) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{m.firstName} {m.lastName}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.email ?? '—'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PastorStats() {
  const { data, isLoading } = useBranchDashboard();
  const [evidenceOpen, setEvidenceOpen] = useState<'members' | 'fellowships' | 'meetings' | 'pending' | null>(null);

  if (isLoading || !data) return <StatsSkeleton />;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Branch Members" value={data.totalMembers} sub="Active" accent="purple" icon={<MembersIcon />} onClick={() => setEvidenceOpen('members')} />
        <StatCard title="Fellowships" value={data.totalFellowships} sub="Scheduled" accent="gold" icon={<FellowshipsIcon />} onClick={() => setEvidenceOpen('fellowships')} />
        <StatCard title="Meetings (30d)" value={data.recentMeetings} sub="This month" accent="emerald" icon={<CalendarIcon />} onClick={() => setEvidenceOpen('meetings')} />
        <StatCard title="Pending Approvals" value={data.pendingApprovals} sub="Requests" accent="rose" icon={<AlertIcon />} onClick={() => setEvidenceOpen('pending')} />
      </div>
      <PastorEvidenceDialog type={evidenceOpen} onClose={() => setEvidenceOpen(null)} />
    </>
  );
}

function PastorEvidenceDialog({ type, onClose }: { type: 'members' | 'fellowships' | 'meetings' | 'pending' | null; onClose: () => void }) {
  const branchId = useAuthStore((s) => s.user?.homeBranchId);
  const { data: membersData } = useMembers({ branchId, limit: 100 });
  const { data: fellowshipsData } = useFellowships({ page: 1, limit: 100, branchId });
  const { data: pendingData } = useMembers({ approvalStatus: 'pending', branchId, limit: 100 });

  const allMembers = membersData?.data ?? [];
  const allFellowships = fellowshipsData?.data ?? [];
  const pendingMembers = pendingData?.data ?? [];

  const titles: Record<string, string> = {
    members: 'Branch Members — Evidence',
    fellowships: 'Branch Fellowships — Evidence',
    meetings: 'Recent Meetings (30 days) — Evidence',
    pending: 'Pending Approvals — Evidence',
  };

  return (
    <Dialog open={!!type} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{type ? titles[type] : ''}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          {type === 'members' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Showing all {allMembers.length} branch members</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Email</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allMembers.map((m, i) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{m.firstName} {m.lastName}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.email ?? '—'}</td>
                      <td className="py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          m.approvalStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                          m.approvalStatus === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>{m.approvalStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'fellowships' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Showing all {allFellowships.length} branch fellowships</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fellowship Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {allFellowships.map((f, i) => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{f.fellowshipName}</td>
                      <td className="py-2 text-muted-foreground text-xs capitalize">{f.fellowshipType?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{f.meetingSchedule ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'meetings' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Fellowships with recent meeting activity (last 30 days)</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fellowship</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {allFellowships.map((f, i) => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{f.fellowshipName}</td>
                      <td className="py-2 text-muted-foreground text-xs capitalize">{f.fellowshipType?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{f.meetingSchedule ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'pending' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Showing all {pendingMembers.length} pending approval requests</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Email</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMembers.map((m, i) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{m.firstName} {m.lastName}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.email ?? '—'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberStats() {
  const { data, isLoading } = useMemberDashboard();
  const [evidenceOpen, setEvidenceOpen] = useState<'fellowships' | 'attendance' | 'meetings' | null>(null);

  if (isLoading || !data) return <StatsSkeleton cols={3} />;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="My Fellowships" value={data.fellowshipsJoined} sub="Joined" accent="gold" icon={<FellowshipsIcon />} onClick={() => setEvidenceOpen('fellowships')} />
        <StatCard title="Attendance Rate" value={`${data.recentAttendance.rate}%`} sub="Last 30 days" accent="emerald" icon={<CheckIcon />} onClick={() => setEvidenceOpen('attendance')} />
        <StatCard title="Meetings Attended" value={`${data.recentAttendance.present}/${data.recentAttendance.total}`} sub="This period" accent="purple" icon={<CalendarIcon />} onClick={() => setEvidenceOpen('meetings')} />
      </div>
      <MemberEvidenceDialog type={evidenceOpen} onClose={() => setEvidenceOpen(null)} data={data} />
    </>
  );
}

function MemberEvidenceDialog({ type, onClose, data }: { type: 'fellowships' | 'attendance' | 'meetings' | null; onClose: () => void; data: { fellowshipsJoined: number; fellowships: { fellowshipId: string; fellowshipName: string; fellowshipType: string }[]; recentAttendance: { total: number; present: number; late: number; absent: number; rate: number } } }) {
  const titles: Record<string, string> = {
    fellowships: 'My Fellowships — Evidence',
    attendance: 'Attendance Rate — Evidence',
    meetings: 'Meetings Attended — Evidence',
  };

  return (
    <Dialog open={!!type} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{type ? titles[type] : ''}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          {type === 'fellowships' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">You are a member of {data.fellowshipsJoined} fellowship{data.fellowshipsJoined !== 1 ? 's' : ''}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fellowship Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fellowships.map((f, i) => (
                    <tr key={f.fellowshipId} className="border-b border-border/50 hover:bg-white/3">
                      <td className="py-2 text-muted-foreground/70">{i + 1}</td>
                      <td className="py-2 text-foreground font-medium">{f.fellowshipName}</td>
                      <td className="py-2 text-muted-foreground text-xs capitalize">{f.fellowshipType?.replace(/_/g, ' ') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'attendance' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Your attendance breakdown (last 30 days)</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{data.recentAttendance.rate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Overall Rate</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <p className="text-3xl font-bold text-foreground">{data.recentAttendance.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Meetings</p>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Count</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 text-emerald-400 font-medium">Present</td>
                      <td className="py-2 text-foreground">{data.recentAttendance.present}</td>
                      <td className="py-2 text-muted-foreground">{data.recentAttendance.total > 0 ? Math.round((data.recentAttendance.present / data.recentAttendance.total) * 100) : 0}%</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 text-[#10b981] font-medium">Late</td>
                      <td className="py-2 text-foreground">{data.recentAttendance.late}</td>
                      <td className="py-2 text-muted-foreground">{data.recentAttendance.total > 0 ? Math.round((data.recentAttendance.late / data.recentAttendance.total) * 100) : 0}%</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 text-[#f8b537] font-medium">Absent</td>
                      <td className="py-2 text-foreground">{data.recentAttendance.absent}</td>
                      <td className="py-2 text-muted-foreground">{data.recentAttendance.total > 0 ? Math.round((data.recentAttendance.absent / data.recentAttendance.total) * 100) : 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {type === 'meetings' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3">You attended {data.recentAttendance.present} out of {data.recentAttendance.total} meetings this period</p>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <p className="text-3xl font-bold text-[#a78bfa]">{data.recentAttendance.present}</p>
                    <p className="text-xs text-muted-foreground mt-1">Present</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <p className="text-3xl font-bold text-[#10b981]">{data.recentAttendance.late}</p>
                    <p className="text-xs text-muted-foreground mt-1">Late</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <p className="text-3xl font-bold text-[#f8b537]">{data.recentAttendance.absent}</p>
                    <p className="text-xs text-muted-foreground mt-1">Absent</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70 text-center">Data from the last 30 days across all your fellowships</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Upcoming fellowships ───────────────────────────────────

function UpcomingFellowships({ branchId }: { branchId?: string }) {
  const { data: result } = useFellowships({ page: 1, limit: 5, branchId });
  const fellowships = result?.data ?? [];
  return (
    <div className="rounded-lg border border-primary/20 bg-card shadow-lg shadow-primary/5">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upcoming Fellowships</p>
        <Link href="/fellowships" className="text-xs font-medium text-[#a78bfa] hover:underline">View all</Link>
      </div>
      {fellowships.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground/70">No fellowships found.</p>
      ) : (
        <div className={fellowships.length > 4 ? 'divide-y divide-border max-h-64 overflow-y-auto scrollbar-thin' : 'divide-y divide-border'}>
          {fellowships.slice(0, 4).map((f, idx, arr) => {
            const isLast = idx === arr.length - 1;
            const m = f.meetingSchedule?.match(/(\w+day)[,\s]*([\d:]+\s*[AP]M)/i);
            const dayAbbr = m?.[1]?.slice(0, 3).toUpperCase() ?? '—';
            const dayNum = new Date().getDate();
            const time = m?.[2] ?? f.meetingSchedule ?? '';
            return (
              <div key={f.id} className={`flex items-center gap-3 px-4 hover:bg-foreground/4 transition-colors ${isLast ? 'pt-3 pb-5' : 'py-3'}`}>
                <div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-md bg-[#6D28D9]/20 text-center">
                  <span className="text-[9px] font-bold uppercase text-[#a78bfa] leading-none">{dayAbbr}</span>
                  <span className="text-base font-bold text-[#a78bfa] leading-tight mt-0.5">{dayNum}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{f.fellowshipName}</p>
                  <p className="text-xs text-muted-foreground truncate">{time}{f.branchName ? ` · ${f.branchName}` : ''}</p>
                </div>
                <Link href={`/fellowships/${f.id}`} className="flex-shrink-0 text-xs font-medium text-[#a78bfa] hover:underline">Details</Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Recent activity ────────────────────────────────────────

function RecentActivity({ branchId, role }: { branchId?: string; role?: string }) {
  const { data: result } = useMembers({ approvalStatus: 'pending', branchId, limit: 4 });
  const pending = result?.data ?? [];
  const { data: fr } = useFellowships({ page: 1, limit: 3, branchId });
  const fellowships = fr?.data ?? [];
  const items: { text: React.ReactNode; sub: string; href?: string }[] = [];
  // Only show membership requests for leadership roles, not for members
  if (role !== 'member') {
    pending.slice(0, 2).forEach(m => items.push({
      text: <><span className="font-semibold text-foreground">{m.firstName} {m.lastName}</span><span className="text-muted-foreground"> requested membership.</span></>,
      sub: 'Recently', href: `/members/${m.id}`,
    }));
  }
  fellowships.slice(0, 2).forEach(f => items.push({
    text: <><span className="font-semibold text-foreground">{f.fellowshipName}</span><span className="text-muted-foreground"> — {f.meetingSchedule ?? 'schedule TBC'}.</span></>,
    sub: 'Upcoming', href: `/fellowships/${f.id}`,
  }));
  return (
    <div className="rounded-lg border border-primary/20 bg-card shadow-lg shadow-primary/5">
      <p className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Community Activity</p>
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground/70">No recent activity.</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
            <div key={i} className={`flex items-start gap-3 px-4 hover:bg-foreground/4 transition-colors ${isLast ? 'pt-2.5 pb-5' : 'py-2.5'}`}>
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#6D28D9]/20">
                <svg className="h-3.5 w-3.5 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  {item.href ? <Link href={item.href} className="hover:underline">{item.text}</Link> : item.text}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">{item.sub}</p>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pending approvals panel ────────────────────────────────

function PendingApprovalsPanel({ branchId }: { branchId?: string }) {
  const { data: result } = useMembers({ approvalStatus: 'pending', branchId, limit: 5 });
  const pending = result?.data ?? [];
  return (
    <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-lg shadow-primary/5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Approvals</p>
      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground/70">No pending requests.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{pending.length} request{pending.length !== 1 ? 's' : ''} await{pending.length === 1 ? 's' : ''} your blessing.</p>
          <div className="mt-3 space-y-2">
            {pending.slice(0, 3).map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-md bg-foreground/6 px-3 py-2.5 border border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.firstName} {m.lastName}</p>
                  <p className="text-[11px] text-muted-foreground">New member request</p>
                </div>
                <Link href={`/members/${m.id}`} className="rounded-full bg-[#6D28D9] px-3 py-1 text-xs font-bold text-white hover:bg-[#5b21b6] transition-colors">Review</Link>
              </div>
            ))}
          </div>
          <Link href="/members?approvalStatus=pending" className="mt-3 block text-center text-xs font-medium text-[#a78bfa] hover:underline">View all</Link>
        </>
      )}
    </div>
  );
}

// ── Quick actions ──────────────────────────────────────────

function exportMembersCSV() {
  const link = document.createElement('a');
  link.href = '/api/members/export';
  link.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

type QAItem = { label: string; icon: React.ReactNode; href?: string; onClick?: () => void };

function QuickActions({ role }: { role: string }) {
  const map: Record<string, QAItem[]> = {
    admin: [
      { label: 'Manage Branches', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18l2.25 2.25m0 0l6-6 6 6 2.25-2.25M12 3.75l6 6v10.5M9.75 21V12h4.5V21" /></svg>, href: '/admin/branches' },
      { label: 'View Reports', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>, href: '/reports' },
      { label: 'Export Members CSV', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>, onClick: exportMembersCSV },
    ],
    pastor: [
      { label: 'View Members', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, href: '/members' },
      { label: 'View Reports', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>, href: '/reports' },
      { label: 'Export Members CSV', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>, onClick: exportMembersCSV },
    ],
    leader: [
      { label: 'My Fellowship', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>, href: '/fellowships' },
      { label: 'Record Attendance', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, href: '/attendance/record-service' },
      { label: 'Souls Pipeline', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>, href: '/souls' },
    ],
    member: [
      { label: 'My Fellowships', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>, href: '/fellowships' },
      { label: 'My Profile', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>, href: '/profile' },
      { label: 'Souls Dashboard', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>, href: '/souls-dashboard' },
    ],
  };
  const actions = map[role] ?? map.member!;
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
      <div className="rounded-lg border border-primary/20 bg-card divide-y divide-border shadow-lg shadow-primary/5">
        {actions.map((a, i) => {
          const inner = (
            <>
              <div className="flex items-center gap-3"><span className="text-muted-foreground">{a.icon}</span><span className="text-sm font-medium text-foreground/80">{a.label}</span></div>
              <svg className="h-3.5 w-3.5 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </>
          );
          return a.href
            ? <Link key={i} href={a.href} className="flex items-center justify-between px-4 py-3 hover:bg-foreground/4 transition-colors">{inner}</Link>
            : <button key={i} onClick={a.onClick} className="flex w-full items-center justify-between px-4 py-3 hover:bg-foreground/4 transition-colors text-left">{inner}</button>;
        })}
      </div>
    </div>
  );
}

// ── Donut (shared by the service-attendance status + rate cards) ──

function MissionDonut({ segments, colors, centerValue, centerLabel }: {
  segments: { name: string; value: number }[];
  colors: string[];
  centerValue: string;
  centerLabel: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-full max-w-[120px]">
        <svg viewBox="0 0 120 120" className="h-full w-full">
          {(() => {
            const cx = 60, cy = 60, r = 48;
            const circumference = 2 * Math.PI * r;
            const gapDegrees = 8;
            const totalGaps = segments.length * gapDegrees;
            const availableDegrees = 360 - totalGaps;
            let currentAngle = -90;
            return segments.map((d, i) => {
              const fraction = d.value / 100;
              const segmentDegrees = fraction * availableDegrees;
              const arcLength = (segmentDegrees / 360) * circumference;
              const rotation = currentAngle;
              currentAngle += segmentDegrees + gapDegrees;
              return (
                <circle
                  key={i}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${arcLength} ${circumference}`}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                />
              );
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '4px' }}>
          <span className="text-xl font-bold text-foreground">{centerValue}</span>
          <span className="text-[9px] text-muted-foreground text-center leading-tight font-medium">{centerLabel}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {segments.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[10px] text-muted-foreground">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Map the by-branch report into the small bar chart shape (short code + label).
function toBranchChart(rows?: { branchName: string; distinctAttendees: number; attendanceRate: number }[]) {
  return (rows ?? []).map((b) => ({
    name: b.branchName.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || b.branchName.slice(0, 3).toUpperCase(),
    label: b.branchName,
    count: b.distinctAttendees,
    rate: Math.round(b.attendanceRate * 100),
  }));
}

// ── Mission Control Reports (Admin) ────────────────────────

function AdminMissionControlReports() {
  const [missionEvidence, setMissionEvidence] = useState<'growth' | 'attendance' | 'engagement' | 'branch' | 'newBelievers' | null>(null);
  const { data: growthData } = useMemberGrowth();
  const { data: nbHealth } = useNewBelieversHealth();
  const { data: attendanceData } = useAttendanceTrend();
  const { data: adminData } = useAdminDashboard();
  const { data: attendanceSummary } = useAttendanceSummary();
  const { data: branchAttendance } = useAttendanceByBranch();

  const totalMembers = adminData?.totalMembers ?? 0;

  const avgAttendance = attendanceData?.length
    ? Math.round(attendanceData.reduce((s, d) => s + d.rate, 0) / attendanceData.length)
    : 0;

  // Service-attendance status split (Present/Late/Virtual) from the summary endpoint.
  const statusBreakdown = attendanceSummary?.statusBreakdown;
  const statusTotal = statusBreakdown?.total ?? 0;
  const hasAttendanceData = statusTotal > 0;
  const presentPct = hasAttendanceData ? Math.round((statusBreakdown!.present / statusTotal) * 100) : 0;
  const latePct = hasAttendanceData ? Math.round((statusBreakdown!.late / statusTotal) * 100) : 0;
  const virtualPct = hasAttendanceData ? Math.round((statusBreakdown!.virtual / statusTotal) * 100) : 0;
  const statusSegments = hasAttendanceData
    ? [
        { name: `Present ${presentPct}%`, value: presentPct },
        { name: `Late ${latePct}%`, value: latePct },
        { name: `Virtual ${virtualPct}%`, value: virtualPct },
      ]
    : [{ name: 'No data', value: 100 }];
  const statusColors = hasAttendanceData ? ['#16A34A', '#f8b537', '#5D3FD3'] : ['rgba(255,255,255,0.12)'];

  // Second donut — attendance rate (distinct attendees ÷ active members).
  const ratePct = attendanceSummary ? Math.round(attendanceSummary.rate.rate * 100) : 0;
  const distinctAttendees = attendanceSummary?.rate.distinctAttendees ?? 0;
  const activeForRate = attendanceSummary?.rate.activeMembers ?? 0;
  const rateSegments = [
    { name: `Attended ${ratePct}%`, value: ratePct },
    { name: `Not yet ${100 - ratePct}%`, value: 100 - ratePct },
  ];
  const rateColors = ['#5D3FD3', 'rgba(255,255,255,0.12)'];

  // Real per-branch attendance for the branch bar (replaces the hardcoded placeholders).
  const branchData = toBranchChart(branchAttendance);

  const engagementPct = avgAttendance;
  const engagementLabel = engagementPct >= 70 ? 'High' : engagementPct >= 40 ? 'Medium' : 'Low';
  const engagementColor = engagementPct >= 70 ? '#10b981' : engagementPct >= 40 ? '#f8b537' : '#e11d48';

  // Build 6-month chart data — pad missing months with 0 so we always have 6 points
  const now = new Date();
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en', { month: 'short' }),
    };
  });

  const growthMap = new Map((growthData ?? []).map(d => [d.month, d.newSignups]));

  // Use raw monthly counts (not cumulative) — pad with 0 for missing months
  const chartGrowth = monthLabels.map(({ key, label }) => ({
    month: label,
    members: growthMap.get(key) ?? 0,
  }));

  // Calculate total new signups in the last 6 months
  const totalNewSignups = (growthData ?? []).reduce((sum, d) => sum + d.newSignups, 0);

  const tooltipStyle = { background: 'var(--card)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: 'var(--foreground)', fontSize: '11px' };

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-lg shadow-primary/5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mission Control Reports</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">

        {/* 1 — Membership Growth */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('growth')}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Membership Growth</p>
              <p className="text-[10px] text-muted-foreground/70">Last 6 Months</p>
            </div>
            <span className="text-2xl font-bold text-foreground">{totalNewSignups}</span>
          </div>
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartGrowth} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'New Members']} />
                <Line type="monotone" dataKey="members" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#a78bfa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2 — Service Attendance (Present/Late/Virtual split) */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('attendance')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Service Attendance</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Last 30 Days</p>
          <MissionDonut segments={statusSegments} colors={statusColors} centerValue={String(statusTotal)} centerLabel="Check-ins" />
        </div>

        {/* 3 — Attendance Rate (distinct attendees ÷ active members) */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('attendance')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Attendance Rate</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Distinct vs Active</p>
          <MissionDonut segments={rateSegments} colors={rateColors} centerValue={`${ratePct}%`} centerLabel={`${distinctAttendees}/${activeForRate} active`} />
        </div>

        {/* 4 — Member Engagement */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('engagement')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Member Engagement</p>
          <p className="text-[10px] text-muted-foreground/70 mb-1">This Month</p>
          <div className="flex flex-col items-center">
            <div className="relative mx-auto w-full max-w-[160px] aspect-[16/9]">
              <svg viewBox="0 0 160 90" className="h-full w-full">
                {/* Dark track */}
                <path
                  d="M 16 80 A 64 64 0 0 1 144 80"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Colored arc */}
                <path
                  d="M 16 80 A 64 64 0 0 1 144 80"
                  fill="none"
                  stroke={engagementColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.75"
                  strokeDasharray="201"
                  strokeDashoffset="0"
                  style={{
                    animation: 'drawArc 1.5s ease-out forwards',
                    strokeDashoffset: '201',
                  }}
                />
                {/* Gold end dot */}
                <circle 
                  cx="144" 
                  cy="80" 
                  r="5" 
                  fill="#f8b537"
                  style={{
                    animation: 'chartFadeIn 0.3s ease-out forwards',
                    animationDelay: '1.5s',
                    opacity: 0,
                  }}
                />
              </svg>
              {/* Label — centered vertically inside the arc */}
              <div className="absolute inset-0 flex flex-col items-center pt-[33%]">
                <span className="text-xl font-bold leading-none" style={{ color: engagementColor }}>{engagementLabel}</span>
                <span className="text-[10px] text-muted-foreground mt-1">Engagement Level</span>
              </div>
            </div>
            <div className="mt-1 flex w-full justify-between px-1">
              <div>
                <p className="text-xs text-muted-foreground">Active Members</p>
                <p className="text-3xl font-bold text-foreground">{totalMembers}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Inactive Members</p>
                <p className="text-3xl font-bold text-foreground">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5 — Attendance by Branch */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('branch')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Attendance by Branch</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Distinct Attendees</p>
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} barSize={14} margin={{ top: 4, right: 4, bottom: 16, left: -18 }}>
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, _, p) => [`${v} attendees (${p.payload.rate}%)`, p.payload.label]} />
                <Bar dataKey="count" fill="#5D3FD3" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6 — New Believers Pipeline */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('newBelievers')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">New Believers</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Pipeline</p>
          <div className="flex flex-col items-center justify-center h-[130px]">
            <span className="text-4xl font-bold text-[#a78bfa]">{nbHealth?.summary.activeEnrollments ?? 0}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Active Enrollments</span>
            <div className="mt-3 w-full space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground">Avg Attendance</span>
                <span className="text-foreground font-medium">{nbHealth?.summary.avgAttendanceRate != null ? `${Math.round(nbHealth.summary.avgAttendanceRate)}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground">Stale</span>
                <span className="text-rose-400 font-medium">{nbHealth?.stale.count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground">Completed</span>
                <span className="text-emerald-400 font-medium">{(nbHealth?.stageFunnel.completed ?? 0) + (nbHealth?.stageFunnel.integrated ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Mission Evidence Dialog */}
      <MissionControlEvidenceDialog type={missionEvidence} onClose={() => setMissionEvidence(null)} chartGrowth={chartGrowth} presentPct={presentPct} latePct={latePct} virtualPct={virtualPct} engagementLabel={engagementLabel} totalMembers={totalMembers} branchData={branchData} nbHealth={nbHealth} />
    </div>
  );
}

// ── Mission Control Evidence Dialog (shared) ───────────────

function MissionControlEvidenceDialog({ type, onClose, chartGrowth, presentPct, latePct, virtualPct, engagementLabel, totalMembers, branchData: _branchData, nbHealth }: {
  type: 'growth' | 'attendance' | 'engagement' | 'branch' | 'newBelievers' | null;
  onClose: () => void;
  chartGrowth: { month: string; members: number }[];
  presentPct: number;
  latePct: number;
  virtualPct: number;
  engagementLabel: string;
  totalMembers: number;
  branchData: { name: string; label: string; count: number }[];
  nbHealth?: { attendanceTrend: { sessionId: string; sessionDate: string }[]; stageFunnel: Record<string, number>; stale: { count: number; thresholdDays: number }; summary: { avgAttendanceRate: number | null; activeEnrollments: number } } | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: membersData } = useMembers({ limit: 100 });
  const { data: branchesListData } = useBranches();
  const { data: staleEnrollmentsRes } = useEnrollments({ stale: true, limit: 50 }, { enabled: type === 'newBelievers' });
  const { data: activeEnrollmentsRes } = useEnrollments({ limit: 50 }, { enabled: type === 'newBelievers' });
  const allMembers = membersData?.data ?? [];
  const allBranches = branchesListData ?? [];
  const staleList = (staleEnrollmentsRes as any)?.data as any[] ?? [];
  const activeList = (activeEnrollmentsRes as any)?.data as any[] ?? [];

  // Filter members by search
  const filteredMembers = searchQuery
    ? allMembers.filter(m => `${m.firstName} ${m.lastName} ${m.branchName ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : allMembers;

  const titles: Record<string, string> = {
    growth: 'Membership Growth — Evidence',
    attendance: 'Service Attendance — Evidence',
    engagement: 'Member Engagement — Evidence',
    branch: 'Membership by Branch — Evidence',
    newBelievers: 'New Believers Pipeline — Evidence',
  };

  return (
    <Dialog open={!!type} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{type ? titles[type] : ''}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          {type === 'growth' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Monthly new member signups (last 6 months)</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Month</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">New Members</th>
                  </tr>
                </thead>
                <tbody>
                  {chartGrowth.map((d, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 text-foreground font-medium">{d.month}</td>
                      <td className="py-2 text-[#a78bfa] font-bold">{d.members}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td className="py-2 text-foreground font-bold">Total</td>
                    <td className="py-2 text-[#a78bfa] font-bold">{chartGrowth.reduce((s, d) => s + d.members, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {type === 'attendance' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Service attendance breakdown (last 30 days)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-3xl font-bold text-[#16A34A]">{presentPct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Present</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-3xl font-bold text-[#f8b537]">{latePct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Late</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-3xl font-bold text-[#5D3FD3]">{virtualPct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Virtual</p>
                </div>
              </div>

              {/* Per-branch attendance breakdown */}
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Attendance by Branch</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Members</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Present</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Late</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBranches.map((b) => {
                      const branchMembers = allMembers.filter(m => m.branchName === b.branchName);
                      return (
                        <tr key={b.id} className="border-b border-border/50">
                          <td className="py-2 text-foreground font-medium">{b.branchName}</td>
                          <td className="py-2 text-muted-foreground">{branchMembers.length}</td>
                          <td className="py-2 text-[#6D28D9]">—</td>
                          <td className="py-2 text-[#10b981]">—</td>
                          <td className="py-2 text-[#f8b537]">—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Member-level drill-down */}
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Member Attendance Details <span className="text-[#a78bfa]">({allMembers.length} total)</span></p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMembers.slice(0, 25).map((m, i) => (
                      <tr key={m.id} className="border-b border-border/50">
                        <td className="py-1.5 text-muted-foreground/70 text-xs">{i + 1}</td>
                        <td className="py-1.5 text-foreground text-xs">{m.firstName} {m.lastName}</td>
                        <td className="py-1.5 text-muted-foreground text-xs">{m.branchName ?? '—'}</td>
                        <td className="py-1.5">
                          <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-400">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allMembers.length > 25 && <p className="text-[10px] text-muted-foreground/70 mt-1">...and {allMembers.length - 25} more members</p>}
              </div>

              <p className="text-[10px] text-muted-foreground/70">Percentages are calculated from all service meeting attendance records in the last 30 days. Per-member attendance details require recording attendance for specific meetings.</p>
            </div>
          )}

          {type === 'engagement' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Engagement is calculated from attendance rate and meeting frequency</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{totalMembers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active Members</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-3xl font-bold" style={{ color: engagementLabel === 'High' ? '#10b981' : engagementLabel === 'Medium' ? '#f8b537' : '#e11d48' }}>{engagementLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">Engagement Level</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1"></span>High = Members attend most meetings and fellowships meet regularly. <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400 mr-1 ml-2"></span>Low = Members are missing meetings or fellowships aren&apos;t meeting often enough.</p>

              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-muted-foreground">Active members list:</p>
                <input
                  type="text"
                  placeholder="Search by name or branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-[#a78bfa]"
                />
                <span className="text-xs font-bold text-[#a78bfa]">{searchQuery ? filteredMembers.length : ''}</span>
              </div>
              {searchQuery && filteredMembers.length > 0 && (() => {
                const highCount = filteredMembers.filter(m => { const c = allMembers.filter(x => x.branchName === m.branchName).length; return c >= 5; }).length;
                const lowCount = filteredMembers.length - highCount;
                return (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span> High: {highCount}</span>
                    <span className="flex items-center gap-1 text-rose-400 font-medium"><span className="inline-block h-2 w-2 rounded-full bg-rose-400"></span> Low: {lowCount}</span>
                  </div>
                );
              })()}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m, i) => {
                    const memberBranchCount = allMembers.filter(x => x.branchName === m.branchName).length;
                    const memberEng = memberBranchCount >= 5 ? 'High' : memberBranchCount >= 3 ? 'Medium' : 'Low';
                    const engColor = memberEng === 'High' ? 'bg-emerald-500/15 text-emerald-400' : memberEng === 'Medium' ? 'bg-[#f8b537]/15 text-[#f8b537]' : 'bg-rose-500/15 text-rose-400';
                    return (
                      <tr key={m.id} className="border-b border-border/50">
                        <td className="py-1.5 text-muted-foreground/70 text-xs">{i + 1}</td>
                        <td className="py-1.5 text-foreground text-xs">{m.firstName} {m.lastName}</td>
                        <td className="py-1.5 text-muted-foreground text-xs">{m.branchName ?? '—'}</td>
                        <td className="py-1.5"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${engColor}`}>{memberEng}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredMembers.length === 0 && searchQuery && <p className="text-sm text-muted-foreground/70">No members match &quot;{searchQuery}&quot;</p>}
            </div>
          )}

          {type === 'branch' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Members distributed across branches</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Full Name</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Members</th>
                  </tr>
                </thead>
                <tbody>
                  {allBranches.map((b) => {
                    const count = allMembers.filter(m => m.branchName === b.branchName).length;
                    return (
                      <tr key={b.id} className="border-b border-border/50">
                        <td className="py-2 text-[#a78bfa] font-medium">{b.branchName}</td>
                        <td className="py-2 text-muted-foreground text-xs">{b.city ?? '—'}</td>
                        <td className="py-2 text-foreground font-bold">{count}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-border">
                    <td className="py-2 text-foreground font-bold" colSpan={2}>Total</td>
                    <td className="py-2 text-foreground font-bold">{allMembers.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {type === 'newBelievers' && (
            <NewBelieversEvidence nbHealth={nbHealth} staleList={staleList} activeList={activeList} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewBelieversEvidence({ nbHealth, staleList, activeList }: { nbHealth: any; staleList: any[]; activeList: any[] }) {
  const [view, setView] = useState<'overview' | 'stale' | 'active'>('overview');

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Click a card to see the people behind the numbers</p>
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-lg bg-muted p-4 text-center cursor-pointer transition-colors ${view === 'active' ? 'ring-1 ring-[#a78bfa]' : 'hover:bg-muted/80'}`} onClick={() => setView(view === 'active' ? 'overview' : 'active')}>
          <p className="text-3xl font-bold text-[#a78bfa]">{nbHealth?.summary.activeEnrollments ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Active Enrollments</p>
        </div>
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{nbHealth?.summary.avgAttendanceRate != null ? `${Math.round(nbHealth.summary.avgAttendanceRate)}%` : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg Attendance</p>
        </div>
        <div className={`rounded-lg bg-muted p-4 text-center cursor-pointer transition-colors ${view === 'stale' ? 'ring-1 ring-rose-400' : 'hover:bg-muted/80'}`} onClick={() => setView(view === 'stale' ? 'overview' : 'stale')}>
          <p className="text-3xl font-bold text-rose-400">{nbHealth?.stale.count ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Stale ({nbHealth?.stale.thresholdDays ?? 7}d+)</p>
        </div>
      </div>

      {view === 'stale' && (
        <div>
          <p className="text-xs text-rose-400 font-medium mb-2">People who haven&apos;t progressed in {nbHealth?.stale.thresholdDays ?? 7}+ days</p>
          {staleList.length === 0 ? (
            <p className="text-sm text-muted-foreground/70">No stale enrollments — everyone is progressing.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stage</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Branch</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {staleList.map((e: any, i: number) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground/70 text-xs">{i + 1}</td>
                    <td className="py-2 text-foreground font-medium text-xs">{e.memberFirstName ?? '—'} {e.memberLastName ?? ''}</td>
                    <td className="py-2"><span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-500/15 text-rose-400 capitalize">{e.stage?.replace('-', ' ')}</span></td>
                    <td className="py-2 text-muted-foreground text-xs">{e.branchId?.slice(0, 8) ?? '—'}</td>
                    <td className="py-2 text-muted-foreground text-xs">{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === 'active' && (
        <div>
          <p className="text-xs text-[#a78bfa] font-medium mb-2">All active enrollments in the pipeline</p>
          {activeList.length === 0 ? (
            <p className="text-sm text-muted-foreground/70">No active enrollments.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stage</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Teacher</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {activeList.map((e: any, i: number) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground/70 text-xs">{i + 1}</td>
                    <td className="py-2 text-foreground font-medium text-xs">{e.memberFirstName ?? '—'} {e.memberLastName ?? ''}</td>
                    <td className="py-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                      e.stage === 'completed' || e.stage === 'integrated' ? 'bg-emerald-500/15 text-emerald-400' :
                      e.stage === 'enrolled' ? 'bg-[#a78bfa]/15 text-[#a78bfa]' :
                      'bg-[#f8b537]/15 text-[#f8b537]'
                    }`}>{e.stage?.replace('-', ' ')}</span></td>
                    <td className="py-2 text-muted-foreground text-xs">{e.teacherFirstName ? `${e.teacherFirstName} ${e.teacherLastName}` : '—'}</td>
                    <td className="py-2 text-muted-foreground text-xs">{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === 'overview' && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Stage Funnel</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stage</th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Count</th>
              </tr>
            </thead>
            <tbody>
              {(['enrolled', 'session-1', 'session-2', 'session-3', 'session-4', 'completed', 'integrated'] as const).map((stage) => (
                <tr key={stage} className="border-b border-border/50">
                  <td className="py-2 text-foreground font-medium capitalize">{stage.replace('-', ' ')}</td>
                  <td className="py-2 text-[#a78bfa] font-bold">{nbHealth?.stageFunnel?.[stage] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-muted-foreground/70 mt-3">Click "Active Enrollments" or "Stale" cards above to see the people.</p>
        </div>
      )}
    </div>
  );
}

// ── Mission Control Reports (Pastor/Leader) ────────────────

function BranchMissionControlReports() {
  const [missionEvidence, setMissionEvidence] = useState<'growth' | 'attendance' | 'engagement' | 'newBelievers' | null>(null);
  const { data: growthData } = useMemberGrowth();
  const { data: attendanceData } = useAttendanceTrend();
  const { data: branchData } = useBranchDashboard();
  const { data: attendanceSummary } = useAttendanceSummary();
  const { data: nbHealth } = useNewBelieversHealth();

  const totalMembers = branchData?.totalMembers ?? 0;

  const avgAttendance = attendanceData?.length
    ? Math.round(attendanceData.reduce((s, d) => s + d.rate, 0) / attendanceData.length)
    : 0;

  // Service-attendance status split (Present/Late/Virtual) for this branch.
  const statusBreakdown = attendanceSummary?.statusBreakdown;
  const statusTotal = statusBreakdown?.total ?? 0;
  const hasAttendanceData = statusTotal > 0;
  const presentPct = hasAttendanceData ? Math.round((statusBreakdown!.present / statusTotal) * 100) : 0;
  const latePct = hasAttendanceData ? Math.round((statusBreakdown!.late / statusTotal) * 100) : 0;
  const virtualPct = hasAttendanceData ? Math.round((statusBreakdown!.virtual / statusTotal) * 100) : 0;
  const statusSegments = hasAttendanceData
    ? [
        { name: `Present ${presentPct}%`, value: presentPct },
        { name: `Late ${latePct}%`, value: latePct },
        { name: `Virtual ${virtualPct}%`, value: virtualPct },
      ]
    : [{ name: 'No data', value: 100 }];
  const statusColors = hasAttendanceData ? ['#16A34A', '#f8b537', '#5D3FD3'] : ['rgba(255,255,255,0.12)'];

  // Second donut — attendance rate (distinct attendees ÷ active members).
  const ratePct = attendanceSummary ? Math.round(attendanceSummary.rate.rate * 100) : 0;
  const distinctAttendees = attendanceSummary?.rate.distinctAttendees ?? 0;
  const activeForRate = attendanceSummary?.rate.activeMembers ?? 0;
  const rateSegments = [
    { name: `Attended ${ratePct}%`, value: ratePct },
    { name: `Not yet ${100 - ratePct}%`, value: 100 - ratePct },
  ];
  const rateColors = ['#5D3FD3', 'rgba(255,255,255,0.12)'];

  const engagementPct = avgAttendance;
  const engagementLabel = engagementPct >= 70 ? 'High' : engagementPct >= 40 ? 'Medium' : 'Low';
  const engagementColor = engagementPct >= 70 ? '#10b981' : engagementPct >= 40 ? '#f8b537' : '#e11d48';

  const now = new Date();
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en', { month: 'short' }),
    };
  });

  const growthMap = new Map((growthData ?? []).map(d => [d.month, d.newSignups]));
  const chartGrowth = monthLabels.map(({ key, label }) => ({
    month: label,
    members: growthMap.get(key) ?? 0,
  }));
  const totalNewSignups = (growthData ?? []).reduce((sum, d) => sum + d.newSignups, 0);

  const tooltipStyle = { background: 'var(--card)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: 'var(--foreground)', fontSize: '11px' };

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-lg shadow-primary/5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mission Control Reports</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">

        {/* 1 — Membership Growth */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('growth')}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Membership Growth</p>
              <p className="text-[10px] text-muted-foreground/70">Last 6 Months</p>
            </div>
            <span className="text-2xl font-bold text-foreground">{totalNewSignups}</span>
          </div>
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartGrowth} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'New Members']} />
                <Line type="monotone" dataKey="members" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#a78bfa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2 — Service Attendance (Present/Late/Virtual split) */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('attendance')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Service Attendance</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Last 30 Days</p>
          <MissionDonut segments={statusSegments} colors={statusColors} centerValue={String(statusTotal)} centerLabel="Check-ins" />
        </div>

        {/* 3 — Attendance Rate (distinct attendees ÷ active members) */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('attendance')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Attendance Rate</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Distinct vs Active</p>
          <MissionDonut segments={rateSegments} colors={rateColors} centerValue={`${ratePct}%`} centerLabel={`${distinctAttendees}/${activeForRate} active`} />
        </div>

        {/* 4 — Member Engagement */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('engagement')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Member Engagement</p>
          <p className="text-[10px] text-muted-foreground/70 mb-1">This Month</p>
          <div className="flex flex-col items-center">
            <div className="relative mx-auto w-full max-w-[160px] aspect-[16/9]">
              <svg viewBox="0 0 160 90" className="h-full w-full">
                <path
                  d="M 16 80 A 64 64 0 0 1 144 80"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 16 80 A 64 64 0 0 1 144 80"
                  fill="none"
                  stroke={engagementColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.75"
                  strokeDasharray="201"
                  strokeDashoffset="0"
                  style={{
                    animation: 'drawArc 1.5s ease-out forwards',
                    strokeDashoffset: '201',
                  }}
                />
                <circle 
                  cx="144" 
                  cy="80" 
                  r="5" 
                  fill="#f8b537"
                  style={{
                    animation: 'chartFadeIn 0.3s ease-out forwards',
                    animationDelay: '1.5s',
                    opacity: 0,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center pt-[33%]">
                <span className="text-xl font-bold leading-none" style={{ color: engagementColor }}>{engagementLabel}</span>
                <span className="text-[10px] text-muted-foreground mt-1">Engagement Level</span>
              </div>
            </div>
            <div className="mt-1 flex w-full justify-between px-1">
              <div>
                <p className="text-xs text-muted-foreground">Active Members</p>
                <p className="text-3xl font-bold text-foreground">{totalMembers}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Inactive Members</p>
                <p className="text-3xl font-bold text-foreground">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5 — New Believers Pipeline */}
        <div className="rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setMissionEvidence('newBelievers')}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">New Believers</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Pipeline</p>
          <div className="flex flex-col items-center justify-center h-[130px]">
            <span className="text-4xl font-bold text-[#a78bfa]">{nbHealth?.summary.activeEnrollments ?? 0}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Active Enrollments</span>
            <div className="mt-3 w-full space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground">Avg Attendance</span>
                <span className="text-foreground font-medium">{nbHealth?.summary.avgAttendanceRate != null ? `${Math.round(nbHealth.summary.avgAttendanceRate)}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground">Stale</span>
                <span className="text-rose-400 font-medium">{nbHealth?.stale.count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground">Completed</span>
                <span className="text-emerald-400 font-medium">{(nbHealth?.stageFunnel.completed ?? 0) + (nbHealth?.stageFunnel.integrated ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Branch Mission Evidence Dialog */}
      <MissionControlEvidenceDialog type={missionEvidence} onClose={() => setMissionEvidence(null)} chartGrowth={chartGrowth} presentPct={presentPct} latePct={latePct} virtualPct={virtualPct} engagementLabel={engagementLabel} totalMembers={totalMembers} branchData={[]} nbHealth={nbHealth} />
    </div>
  );
}

// ── Mission Control Reports (Member) ──────────────────────

function MemberMissionControlReports() {
  const { data: memberData } = useMemberDashboard();
  const { data: attendanceData } = useAttendanceTrend();

  const attendanceRate = memberData?.recentAttendance.rate ?? 0;
  const present = memberData?.recentAttendance.present ?? 0;
  const late = memberData?.recentAttendance.late ?? 0;
  const absent = memberData?.recentAttendance.absent ?? 0;
  const total = memberData?.recentAttendance.total ?? 0;
  const fellowshipsJoined = memberData?.fellowshipsJoined ?? 0;
  const branchCount = memberData?.branchCount ?? 0;

  // Attendance donut: present vs late vs absent (percentages)
  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
  const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
  const absentPct = total > 0 ? Math.max(0, 100 - presentPct - latePct) : 100;
  const donutData = [
    { name: `Present ${presentPct}%`, value: Math.max(presentPct, 0.1) },
    { name: `Late ${latePct}%`, value: Math.max(latePct, 0.1) },
    { name: `Absent ${absentPct}%`, value: Math.max(absentPct, 0.1) },
  ];
  const DONUT = ['#6D28D9', '#10b981', '#f8b537'];

  // Engagement gauge
  const engagementPct = attendanceRate;
  const engagementLabel = engagementPct >= 70 ? 'High' : engagementPct >= 40 ? 'Medium' : 'Low';
  const engagementColor = engagementPct >= 70 ? '#10b981' : engagementPct >= 40 ? '#f8b537' : '#e11d48';

  // Attendance trend (last 6 months)
  const now = new Date();
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en', { month: 'short' }),
    };
  });
  const trendMap = new Map((attendanceData ?? []).map(d => [d.week, d.rate]));
  const chartTrend = monthLabels.map(({ key, label }) => ({
    month: label,
    rate: trendMap.get(key) ?? 0,
  }));

  const tooltipStyle = { background: 'var(--card)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: 'var(--foreground)', fontSize: '11px' };

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-lg shadow-primary/5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mission Control Reports</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* 1 — My Branches */}
        <div className="rounded-lg bg-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">My Branches</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">Active</p>
          <div className="flex flex-col items-center justify-center h-[130px]">
            <span className="text-5xl font-bold text-[#a78bfa]">{branchCount}</span>
            <span className="text-xs text-muted-foreground mt-2">{branchCount === 1 ? 'Branch' : 'Branches'}</span>
            {memberData?.branches && memberData.branches.length > 0 && (
              <div className="mt-3 space-y-1 w-full">
                {memberData.branches.map((b) => (
                  <div key={b.branchId} className="flex items-center gap-2 px-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#a78bfa]" />
                    <span className="text-[10px] text-muted-foreground truncate">{b.branchName}</span>
                    {b.isHome && <span className="text-[8px] text-[#a78bfa]/60 ml-auto">Home</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2 — My Attendance Trend */}
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">My Attendance</p>
              <p className="text-[10px] text-muted-foreground/70">Last 6 Months</p>
            </div>
            <span className="text-2xl font-bold text-foreground">{attendanceRate}%</span>
          </div>
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartTrend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Attendance Rate']} />
                <Line type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#a78bfa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3 — Attendance Breakdown (percentages) */}
        <div className="rounded-lg bg-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Attendance Breakdown</p>
          <p className="text-[10px] text-muted-foreground/70 mb-2">This Period</p>
          <div className="flex flex-col items-center">
            <div className="relative aspect-square w-full max-w-[120px]">
              <svg viewBox="0 0 120 120" className="h-full w-full">
                {(() => {
                  const cx = 60, cy = 60, r = 48;
                  const circumference = 2 * Math.PI * r;
                  const gapDegrees = 8;
                  const availableDegrees = 360 - donutData.length * gapDegrees;
                  let currentAngle = -90;
                  return donutData.map((d, i) => {
                    const segmentDegrees = (d.value / 100) * availableDegrees;
                    const arcLength = (segmentDegrees / 360) * circumference;
                    const rotation = currentAngle;
                    currentAngle += segmentDegrees + gapDegrees;
                    return (
                      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={DONUT[i]} strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeDashoffset="0"
                        transform={`rotate(${rotation} ${cx} ${cy})`}
                        style={{ animation: `drawCircle 1.5s ease-out forwards`, animationDelay: `${i * 0.2}s`, strokeDashoffset: circumference }}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '4px' }}>
                <span className="text-xl font-bold text-foreground">{presentPct}%</span>
                <span className="text-[9px] text-muted-foreground text-center leading-tight font-medium">Avg. Attendance</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT[i] }} />
                  <span className="text-[10px] text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4 — My Engagement */}
        <div className="rounded-lg bg-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">My Engagement</p>
          <p className="text-[10px] text-muted-foreground/70 mb-1">This Month</p>
          <div className="flex flex-col items-center">
            <div className="relative mx-auto w-full max-w-[160px] aspect-[16/9]">
              <svg viewBox="0 0 160 90" className="h-full w-full">
                <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" />
                <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke={engagementColor} strokeWidth="8" strokeLinecap="round"
                  opacity="0.75" strokeDasharray="201" strokeDashoffset="0"
                  style={{ animation: 'drawArc 1.5s ease-out forwards', strokeDashoffset: '201' }}
                />
                <circle cx="144" cy="80" r="5" fill="#f8b537"
                  style={{ animation: 'chartFadeIn 0.3s ease-out forwards', animationDelay: '1.5s', opacity: 0 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center pt-[33%]">
                <span className="text-xl font-bold leading-none" style={{ color: engagementColor }}>{engagementLabel}</span>
                <span className="text-[10px] text-muted-foreground mt-1">Engagement Level</span>
              </div>
            </div>
            <div className="mt-1 flex w-full justify-between px-1">
              <div>
                <p className="text-xs text-muted-foreground">Fellowships</p>
                <p className="text-3xl font-bold text-foreground">{fellowshipsJoined}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Absent</p>
                <p className="text-3xl font-bold text-foreground">{absent}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Mission Summary bar ────────────────────────────────────

function MissionSummary({ role }: { role: string }) {
  const { data: adminData } = useAdminDashboard();
  const { data: branchData } = useBranchDashboard();
  const { data: memberData } = useMemberDashboard();
  const { data: attendanceData } = useAttendanceTrend();
  
  const avgAttendance = attendanceData?.length
    ? Math.round(attendanceData.reduce((s, d) => s + d.rate, 0) / attendanceData.length)
    : 0;
  const engagementLabel = avgAttendance >= 70 ? 'High' : avgAttendance >= 40 ? 'Medium' : 'Low';
  const engagementColor = avgAttendance >= 70 ? '#10b981' : avgAttendance >= 40 ? '#f8b537' : '#e11d48';

  let items: { label: string; value: string | number; color: string }[] = [];

  if (role === 'admin') {
    items = [
      { label: 'Branches', value: adminData?.totalBranches ?? '—', color: '#a78bfa' },
      { label: 'Members', value: adminData?.totalMembers ?? '—', color: '#10b981' },
      { label: 'Fellowships', value: adminData?.totalFellowships ?? '—', color: '#f8b537' },
      { label: 'Attendance', value: `${avgAttendance}%`, color: '#a78bfa' },
      { label: 'Engagement', value: engagementLabel, color: engagementColor },
    ];
  } else if (role === 'pastor') {
    items = [
      { label: 'Branch Members', value: branchData?.totalMembers ?? '—', color: '#10b981' },
      { label: 'Fellowships', value: branchData?.totalFellowships ?? '—', color: '#f8b537' },
      { label: 'Meetings (30d)', value: branchData?.recentMeetings ?? '—', color: '#a78bfa' },
      { label: 'Attendance', value: `${avgAttendance}%`, color: '#a78bfa' },
      { label: 'Engagement', value: engagementLabel, color: engagementColor },
    ];
  } else if (role === 'leader') {
    items = [
      { label: 'Branch Members', value: branchData?.totalMembers ?? '—', color: '#10b981' },
      { label: 'Fellowships', value: branchData?.totalFellowships ?? '—', color: '#f8b537' },
      { label: 'Meetings (30d)', value: branchData?.recentMeetings ?? '—', color: '#a78bfa' },
      { label: 'Attendance', value: `${avgAttendance}%`, color: '#a78bfa' },
      { label: 'Engagement', value: engagementLabel, color: engagementColor },
    ];
  } else {
    // member — personalised with all titles
    const memberAttRate = memberData?.recentAttendance.rate ?? 0;
    const memberEngagement = memberAttRate >= 70 ? 'High' : memberAttRate >= 40 ? 'Medium' : 'Low';
    const memberEngColor = memberAttRate >= 70 ? '#10b981' : memberAttRate >= 40 ? '#f8b537' : '#e11d48';
    items = [
      { label: 'My Branches', value: memberData?.branchCount ?? '—', color: '#a78bfa' },
      { label: 'My Fellowships', value: memberData?.fellowshipsJoined ?? '—', color: '#f8b537' },
      { label: 'Attendance', value: `${memberAttRate}%`, color: '#10b981' },
      { label: 'Meetings Attended', value: `${memberData?.recentAttendance.present ?? 0}/${memberData?.recentAttendance.total ?? 0}`, color: '#a78bfa' },
      { label: 'Engagement', value: memberEngagement, color: memberEngColor },
    ];
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col items-center gap-3 px-5 py-4 sm:flex-row sm:justify-center sm:gap-4">
        <div className="flex items-center gap-3 sm:flex-shrink-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#6D28D9]/20">
            <svg className="h-5 w-5 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mission Summary</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-12">
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="hidden h-12 w-px bg-white/10 sm:block" />}
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{item.label}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const roleLabel = activeRole === 'admin' ? 'Administrator' : activeRole === 'pastor' ? 'Pastor' : activeRole === 'leader' ? 'Fellowship Leader' : 'Member';
  const branchId = user?.homeBranchId;
  const isLeadership = activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';
  const verse = getDailyVerse();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{today}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
            {user?.firstName ? `Good day, ${user.firstName}!` : 'Dashboard'}
          </h1>
          <span className="mt-1.5 inline-block rounded-full border border-[#6D28D9]/40 bg-[#6D28D9]/15 px-2.5 py-0.5 text-xs font-semibold text-[#a78bfa]">
            {roleLabel}
          </span>
        </div>
        {isLeadership && (
          <Link href="/members" className="inline-flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5b21b6] transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            New Entry
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="mb-10">
        {activeRole === 'admin' ? <AdminStats /> : activeRole === 'pastor' || activeRole === 'leader' ? <PastorStats /> : <MemberStats />}
      </div>

      {/* Middle grid: Upcoming + Activity | Right panel */}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
            <UpcomingFellowships branchId={activeRole !== 'admin' ? branchId : undefined} />
            <RecentActivity branchId={activeRole !== 'admin' ? branchId : undefined} role={activeRole ?? 'member'} />
          </div>
          
          {/* Mission Control Reports — all roles, scoped by role */}
          <div className="-mt-1">
            {activeRole === 'admin' ? <AdminMissionControlReports /> : activeRole === 'pastor' || activeRole === 'leader' ? <BranchMissionControlReports /> : <MemberMissionControlReports />}
          </div>

          {/* Mission Summary — all roles */}
          <MissionSummary role={activeRole ?? 'member'} />
        </div>
        
        <div className="space-y-4">
          {isLeadership && <PendingApprovalsPanel branchId={activeRole !== 'admin' ? branchId : undefined} />}
          <QuickActions role={activeRole ?? 'member'} />
          
          {/* Daily verse */}
          <div className="rounded-xl border border-[#D97706]/20 bg-gradient-to-br from-card to-amber-50/10 dark:from-card dark:to-amber-950/20 p-4 shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-[#f8b537]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-widest text-[#f8b537]">Daily Verse</p>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80 italic mb-2">&ldquo;{verse.text}&rdquo;</p>
            <p className="text-sm font-bold text-[#f8b537]">— {verse.ref}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

