'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@kairos/ui';
import { DatePicker } from '@/components/date-picker';
import { useAuthStore } from '@/lib/auth-store';
import { useBranches } from '@/hooks/use-branches';
import { useServices, useSelfCheckIn, useMyAttendanceStatus } from '@/hooks/use-attendance';
import { api } from '@/lib/api';

const SERVICE_TYPES = [
  { label: 'All', value: '' },
  { label: 'Sunday Service', value: 'Sunday Service' },
  { label: 'Midweek Service', value: 'Midweek Service' },
  { label: 'Special Service', value: 'Special Service' },
  { label: 'Prayer Meeting', value: 'Prayer Meeting' },
  { label: 'Other', value: 'Other' },
];

function CrossBranchVisitsAdmin() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.attendance.reports.crossBranchVisits({ weeks: 2 })
      .then((res) => {
        // Filter out any entries where home branch equals visited branch
        const filtered = (res.data ?? []).filter((v: any) => v.homeBranchId !== v.visitedBranchId);
        setVisits(filtered);
      })
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-xs text-muted-foreground pl-6">Loading...</p>;

  if (visits.length === 0) {
    return <p className="text-xs text-muted-foreground pl-6">No cross-branch visits this period</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pl-6 mb-2">
        <span className="rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-semibold">
          {visits.length} cross-branch visit{visits.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pl-6">
        {visits.map((visit: any, idx: number) => (
          <div key={idx} className="rounded-lg border border-border/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{visit.memberFirstName} {visit.memberLastName}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  visit.visitedAttendanceStatus === 'Present' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                  visit.visitedAttendanceStatus === 'Late' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                  'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}>
                  {visit.visitedAttendanceStatus}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(visit.homeServiceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span>From: <strong className="text-foreground">{visit.homeBranchName}</strong></span>
              <span>→</span>
              <span>Visited: <strong className="text-foreground">{visit.visitedBranchName}</strong></span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {visit.visitedServiceType}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeAttendanceSection({ myStatus, service, selfCheckIn, handleCheckIn }: { myStatus: any; service: any; selfCheckIn: any; handleCheckIn: (e: React.MouseEvent, status: 'Present' | 'Virtual' | 'Late') => void }) {
  const [expanded, setExpanded] = useState(false);
  const serviceNotOpen = new Date(service.serviceDate) > new Date();

  return (
    <div className="w-full mt-2 pt-2 border-t border-border/20">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!serviceNotOpen) setExpanded(!expanded); }}
        className={`flex items-center gap-2 w-full text-xs transition-colors ${serviceNotOpen ? 'text-muted-foreground/50 cursor-default' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${serviceNotOpen ? 'bg-muted/30 text-muted-foreground/50' : 'bg-primary/10 text-primary'}`}>Me</span>
        {serviceNotOpen ? (
          <span>Check-in not open yet</span>
        ) : (
          <>
            <span>My attendance</span>
            {myStatus && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                myStatus.attendanceStatus === 'Present'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : myStatus.attendanceStatus === 'Late'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}>
                {myStatus.attendanceStatus}
              </span>
            )}
            <svg className={`w-3 h-3 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
      {expanded && !serviceNotOpen && (
        <div className="mt-2 pl-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          {myStatus ? (
            <div className="flex items-center gap-3 text-xs">
              <span className={`font-medium ${
                myStatus.attendanceStatus === 'Present' ? 'text-emerald-600' :
                myStatus.attendanceStatus === 'Late' ? 'text-amber-600' : 'text-blue-600'
              }`}>
                {myStatus.attendanceStatus}
              </span>
              {myStatus.arrivalTime && (
                <span className="text-muted-foreground">
                  Checked in at {new Date(myStatus.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleCheckIn(e, 'Present'); }}
                disabled={selfCheckIn.isPending}
                className="h-7 text-xs px-3 rounded-full"
              >
                Check In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleCheckIn(e, 'Virtual'); }}
                disabled={selfCheckIn.isPending}
                className="h-7 text-xs px-3 rounded-full"
              >
                Virtual
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, activeRole, onDelete }: { service: any; activeRole: string; onDelete?: (id: string) => void }) {
  const selfCheckIn = useSelfCheckIn();
  const { data: statusResult } = useMyAttendanceStatus(service.id);
  const myStatus = statusResult?.data;
  
  const isMember = activeRole === 'member';

  // For members, show their personal counts (1 or 0)
  const myPresentCount = isMember && myStatus?.attendanceStatus === 'Present' ? 1 : 0;
  const myVirtualCount = isMember && myStatus?.attendanceStatus === 'Virtual' ? 1 : 0;
  const myLateCount = isMember && myStatus?.attendanceStatus === 'Late' ? 1 : 0;
  const myAbsentCount = isMember && (!myStatus || myStatus?.attendanceStatus === 'Absent') ? 1 : 0;

  // Rate = (Present + Virtual + Late) / total branch members
  const attended = Number(service.presentCount) + Number(service.virtualCount) + Number(service.lateCount);
  const totalMembers = Number(service.branchMemberCount) || 0;
  const attendanceRate = totalMembers > 0 ? Math.round((attended / totalMembers) * 100) : null;

  const handleCheckIn = async (e: React.MouseEvent, status: 'Present' | 'Virtual' | 'Late' = 'Present') => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await selfCheckIn.mutateAsync({
        serviceId: service.id,
        data: { attendanceStatus: status },
      });
      toast.success(`Checked in as ${status}!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in');
    }
  };

  const isLeadership = activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';
  const isAdmin = activeRole === 'admin';
  const serviceDateReached = new Date(service.serviceDate) <= new Date();
  const canCheckIn = !isAdmin && !myStatus && serviceDateReached;

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4">
        <Link href={`/attendance/services/${service.id}`} className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {service.serviceTitle || service.serviceType}
              </h3>
              <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                {service.serviceType}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span><strong className="text-foreground">Date:</strong> {new Date(service.serviceDate).toLocaleDateString()}</span>
              <span><strong className="text-foreground">Branch:</strong> {service.branchName}</span>
              {service.preacherFirstName && (
                <span>
                  <strong className="text-foreground">Preacher:</strong> {service.preacherFirstName} {service.preacherLastName}
                </span>
              )}
              {service.topic && <span><strong className="text-foreground">Topic:</strong> {service.topic}</span>}
            </div>
          </div>

          {isMember && !myStatus && !isAdmin ? (
            // Member hasn't checked in yet - show check-in buttons (disabled if date not reached)
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1" onClick={(e) => e.preventDefault()}>
                <Button
                  size="sm"
                  onClick={(e) => handleCheckIn(e, 'Present')}
                  disabled={!serviceDateReached || selfCheckIn.isPending}
                  className="h-8"
                >
                  {serviceDateReached ? 'Check In' : 'Check-in opens on the day'}
                </Button>
                {serviceDateReached && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleCheckIn(e, 'Virtual')}
                      disabled={selfCheckIn.isPending}
                      className="h-7 text-xs px-2"
                    >
                      Virtual
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : isMember && myStatus ? (
            // Member has checked in - just show their status badge (no stats)
            <div className="flex items-center">
              <span className={`rounded-full px-4 py-2 text-sm font-semibold ${
                myStatus.attendanceStatus === 'Present'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : myStatus.attendanceStatus === 'Late'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : myStatus.attendanceStatus === 'Absent'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}>
                {myStatus.attendanceStatus === 'Present' && '✓ Present'}
                {myStatus.attendanceStatus === 'Late' && 'Late'}
                {myStatus.attendanceStatus === 'Absent' && '✗ Absent'}
                {myStatus.attendanceStatus === 'Virtual' && 'Virtual'}
              </span>
            </div>
          ) : !isMember ? (
            // Leadership - show member stats
            <div className="flex flex-col items-end gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Members</span>
              {new Date(service.serviceDate) > new Date() ? (
                <span className="text-xs text-muted-foreground">Service not open yet</span>
              ) : (
              <div className="flex flex-wrap items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {service.presentCount}
                </div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {isMember ? myVirtualCount : service.virtualCount}
                </div>
                <div className="text-xs text-muted-foreground">Virtual</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {isMember ? myLateCount : service.lateCount}
                </div>
                <div className="text-xs text-muted-foreground">Late</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-600">
                  {isMember ? myAbsentCount : service.absentCount}
                </div>
                <div className="text-xs text-muted-foreground">Absent</div>
              </div>
              {!isMember && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {service.firstTimeVisitorCount || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">First Time</div>
                </div>
              )}
              {isMember ? (
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    100%
                  </div>
                  <div className="text-xs text-muted-foreground">Rate</div>
                </div>
              ) : attendanceRate !== null ? (
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      attendanceRate >= 80
                        ? 'text-emerald-600'
                        : attendanceRate >= 60
                          ? 'text-amber-600'
                          : 'text-rose-600'
                    }`}
                  >
                    {attendanceRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Rate
                  </div>
                </div>
              ) : null}
              </div>
              )}
            </div>
          ) : null}
        </Link>
        {/* Delete button for leadership */}
        {(activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader') && onDelete && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(service.id); }}
            className="ml-2 p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Delete service"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        )}
        {/* Leadership personal attendance - small "Me" toggle */}
        {(activeRole === 'pastor' || activeRole === 'leader') && (
          <MeAttendanceSection
            myStatus={myStatus}
            service={service}
            selfCheckIn={selfCheckIn}
            handleCheckIn={handleCheckIn}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const { data: branches } = useBranches();
  const isMember = activeRole === 'member';
  const isLeadership = activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';

  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'deleted'>('current');
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    branchId: activeRole === 'admin' ? undefined : user?.homeBranchId,
    serviceType: undefined as string | undefined,
  });

  const { data: result, isLoading, error, refetch } = useServices(params);
  const [deletedServices, setDeletedServices] = useState<any[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [pastDateFilter, setPastDateFilter] = useState('');
  const [otherBranchServices, setOtherBranchServices] = useState<any[]>([]);
  const [showOtherBranches, setShowOtherBranches] = useState(false);

  // Fetch other branch services for cross-branch check-in
  useEffect(() => {
    if (showOtherBranches) {
      api.attendance.services.listOtherBranches()
        .then((res) => setOtherBranchServices(res.data ?? []))
        .catch(() => setOtherBranchServices([]));
    }
  }, [showOtherBranches]);

  // Fetch deleted services count on load, full data when tab is active
  useEffect(() => {
    if (isLeadership) {
      api.attendance.services.listDeleted()
        .then((res) => setDeletedServices(res.data ?? []))
        .catch(() => setDeletedServices([]));
    }
  }, [isLeadership]);

  useEffect(() => {
    if (activeTab === 'deleted' && isLeadership) {
      setLoadingDeleted(true);
      api.attendance.services.listDeleted()
        .then((res) => setDeletedServices(res.data ?? []))
        .catch(() => setDeletedServices([]))
        .finally(() => setLoadingDeleted(false));
    }
  }, [activeTab, isLeadership]);

  const handleDelete = async (id: string) => {
    if (!confirm('Move this service to trash? It will be permanently deleted in 20 days.')) return;
    try {
      await api.attendance.services.delete(id);
      toast.success('Service moved to trash');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.attendance.services.restore(id);
      toast.success('Service restored');
      setDeletedServices((prev) => prev.filter((s) => s.id !== id));
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore');
    }
  };

  const services = result?.data?.data ?? [];
  const pagination = result?.data?.meta;

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const currentCount = services.filter((s: any) => new Date(s.serviceDate) >= today).length;
  const pastCount = services.filter((s: any) => new Date(s.serviceDate) < today).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load services. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Service Attendance</h1>
            <button
              className="group relative inline-flex items-center justify-center"
              aria-label="Information about service attendance"
            >
              <svg
                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border">
                {isMember
                  ? 'View your personal service attendance history. Check in to services and track your attendance over time.'
                  : 'Manage service attendance records for your branch. Record attendance, view statistics, and track trends.'}
              </span>
            </button>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            View and manage service attendance records{pagination ? ` — ${pagination.total} total` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/attendance/reports">
            <Button variant="outline" size="sm">
              View Reports
            </Button>
          </Link>
          {(activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader') && (
            <Link href="/attendance/record-service">
              <Button size="sm">+ Record Attendance</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {SERVICE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  serviceType: type.value || undefined,
                  page: 1,
                }))
              }
              className={
                ((params.serviceType || '') === type.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-input/15 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground') +
                ' rounded-full px-4 py-1.5 text-sm font-medium transition-colors'
              }
            >
              {type.label}
            </button>
          ))}
        </div>
        {activeRole === 'admin' && (
          <select
            value={params.branchId ?? ''}
            onChange={(e) =>
              setParams((p) => ({ ...p, branchId: e.target.value || undefined, page: 1 }))
            }
            className="h-9 rounded-lg border border-input/15 bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
          >
            <option value="">All Branches</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.branchName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs for leadership */}
      {isLeadership && (
        <div className="flex gap-1 border-b border-border/50 pb-0">
          {(['current', 'past', 'deleted'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'current' ? `Current (${currentCount})` : tab === 'past' ? `Past (${pastCount})` : `Deleted (${deletedServices.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Deleted tab */}
      {activeTab === 'deleted' && isLeadership ? (
        <div className="space-y-3">
          {loadingDeleted ? (
            <p className="text-muted-foreground text-sm text-center py-8">Loading...</p>
          ) : deletedServices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No deleted services</p>
              </CardContent>
            </Card>
          ) : (
            deletedServices.map((service: any) => (
              <Card key={service.id} className="border-rose-500/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{service.serviceTitle || service.serviceType}</h3>
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-500">
                        {service.daysRemaining} days left
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(service.serviceDate).toLocaleDateString()} · {service.branchName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {service.deletedByFirstName
                        ? `Deleted by ${service.deletedByFirstName} ${service.deletedByLastName} (${service.deletedByRole === 'admin' ? 'Admin' : service.deletedByRole === 'pastor' ? 'Pastor' : 'Leader'}) · ${new Date(service.deletedAt).toLocaleDateString()}`
                        : `Deleted on ${new Date(service.deletedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleRestore(service.id)}>
                    Restore
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : activeTab === 'past' && isLeadership ? (
        /* Past tab - show past services with calendar */
        <>
          <DatePicker
            value={pastDateFilter}
            onChange={(date) => setPastDateFilter(date === pastDateFilter ? '' : date)}
            alwaysOpen
            highlightedDates={services
              .filter((s: any) => new Date(s.serviceDate) < new Date(new Date().setHours(0, 0, 0, 0)))
              .map((s: any) => {
                const d = new Date(s.serviceDate);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              })}
          />
          <div className="space-y-3 mt-4">
            {services
              .filter((s: any) => {
                const serviceDate = new Date(s.serviceDate);
                if (serviceDate >= new Date(new Date().setHours(0, 0, 0, 0))) return false;
                if (pastDateFilter) {
                  const filterDate = new Date(pastDateFilter + 'T00:00:00');
                  return serviceDate.toDateString() === filterDate.toDateString();
                }
                return true;
              })
              .map((service: any) => (
                <ServiceCard key={service.id} service={service} activeRole={activeRole!} onDelete={handleDelete} />
              ))}
            {services.filter((s: any) => {
              const serviceDate = new Date(s.serviceDate);
              if (serviceDate >= new Date(new Date().setHours(0, 0, 0, 0))) return false;
              if (pastDateFilter) {
                const filterDate = new Date(pastDateFilter + 'T00:00:00');
                return serviceDate.toDateString() === filterDate.toDateString();
              }
              return true;
            }).length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">{pastDateFilter ? 'No services on this date' : 'No past services found'}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No services found.</p>
            {(activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader') && (
              <Link href="/attendance/record-service">
                <Button className="mt-4" size="sm">
                  Record First Service
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {services
              .filter((s: any) => !isLeadership || new Date(s.serviceDate) >= new Date(new Date().setHours(0, 0, 0, 0)))
              .map((service: any) => (
              <ServiceCard key={service.id} service={service} activeRole={activeRole!} onDelete={isLeadership ? handleDelete : undefined} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}

          {/* Cross-branch check-in option */}
          {activeTab === 'current' && (
            <div className="mt-6">
              <button
                onClick={() => setShowOtherBranches(!showOtherBranches)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {activeRole === 'admin' ? 'Cross-Branch Visits' : 'Visiting another branch this week?'}
                <svg className={`w-3 h-3 transition-transform ${showOtherBranches ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showOtherBranches && (
                <div className="mt-3">
                  {activeRole === 'admin' ? (
                    <CrossBranchVisitsAdmin />
                  ) : (
                    <div className="space-y-2">
                      {otherBranchServices.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-6">No services at other branches this week</p>
                      ) : (
                        otherBranchServices.map((service: any) => (
                          <ServiceCard key={service.id} service={service} activeRole="member" />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
