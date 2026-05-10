'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useService, useServiceAttendance, useUpdateAttendance, useDeleteAttendance, useSelfCheckIn, useMyAttendanceStatus } from '@/hooks/use-attendance';

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Virtual', 'Late'] as const;

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null); // null = all, or specific status

  const { data: serviceResponse, isLoading: serviceLoading } = useService(id);
  const { data: attendanceResponse, isLoading: attendanceLoading, refetch } = useServiceAttendance(id);
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();
  const selfCheckIn = useSelfCheckIn();
  const { data: myStatusResult } = useMyAttendanceStatus(id);
  const myCheckInStatus = myStatusResult?.data;

  const service = serviceResponse?.data;
  const attendance = attendanceResponse?.data ?? [];

  const canEdit = activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';
  const isMember = activeRole === 'member';
  
  console.log('DEBUG - activeRole:', activeRole, 'isMember:', isMember);
  
  // Members only see their own attendance
  const visibleAttendance = isMember 
    ? attendance.filter((a) => a.memberId === user?.id)
    : attendance;

  const filteredAttendance = visibleAttendance.filter((a) => {
    // Filter by status if selected
    if (statusFilter && a.attendanceStatus !== statusFilter) {
      return false;
    }
    // Filter by search query (only for non-members)
    if (isMember) return true;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.memberFirstName.toLowerCase().includes(query) ||
      a.memberLastName.toLowerCase().includes(query)
    );
  });

  const handleEditClick = (memberId: string, currentStatus: string) => {
    setEditingMemberId(memberId);
    setEditStatus(currentStatus);
  };

  const handleSaveEdit = async (memberId: string) => {
    try {
      await updateAttendance.mutateAsync({
        serviceId: id,
        memberId,
        data: { attendanceStatus: editStatus },
      });
      toast.success('Attendance updated');
      setEditingMemberId(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update attendance');
    }
  };

  const handleUndo = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove attendance record for ${memberName}? This action can be undone by re-recording.`)) {
      return;
    }

    try {
      await deleteAttendance.mutateAsync({ serviceId: id, memberId });
      toast.success('Attendance record removed');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove attendance');
    }
  };

  if (serviceLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading service details...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Service not found.</p>
      </div>
    );
  }

  const totalAttendance = attendance.length;
  const presentCount = attendance.filter((a) => a.attendanceStatus === 'Present').length;
  const virtualCount = attendance.filter((a) => a.attendanceStatus === 'Virtual').length;
  const lateCount = attendance.filter((a) => a.attendanceStatus === 'Late').length;
  const absentCount = attendance.filter((a) => a.attendanceStatus === 'Absent').length;
  const firstTimeCount = attendance.filter((a) => a.isFirstTimeVisitor).length;

  // For members, only show their own status
  const myAttendance = isMember ? visibleAttendance[0] : null;

  // For members, calculate their personal stats (always 1 or 0 for a single service)
  const myPresentCount = isMember && myAttendance?.attendanceStatus === 'Present' ? 1 : 0;
  const myVirtualCount = isMember && myAttendance?.attendanceStatus === 'Virtual' ? 1 : 0;
  const myLateCount = isMember && myAttendance?.attendanceStatus === 'Late' ? 1 : 0;
  const myAbsentCount = isMember && (!myAttendance || myAttendance?.attendanceStatus === 'Absent') ? 1 : 0;

  const attendanceRate =
    Number(service.branchMemberCount) > 0
      ? Math.round(((presentCount + virtualCount + lateCount) / Number(service.branchMemberCount)) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          ← Back to Services
        </Button>
        
        {/* Compact Service Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {service.serviceTitle || service.serviceType}
              </h1>
              {isMember && myAttendance && (
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                  myAttendance.attendanceStatus === 'Present'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : myAttendance.attendanceStatus === 'Late'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : myAttendance.attendanceStatus === 'Absent'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}>
                  {myAttendance.attendanceStatus === 'Present' && '✓ Present'}
                  {myAttendance.attendanceStatus === 'Late' && 'Late'}
                  {myAttendance.attendanceStatus === 'Absent' && '✗ Absent'}
                  {myAttendance.attendanceStatus === 'Virtual' && 'Virtual'}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <strong>Date:</strong> {new Date(service.serviceDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <strong>Branch:</strong> {service.branchName}
              </span>
              {service.preacherFirstName && (
                <span className="flex items-center gap-1">
                  <strong>Preacher:</strong> {service.preacherFirstName} {service.preacherLastName}
                </span>
              )}
              {service.topic && (
                <span className="flex items-center gap-1">
                  <strong>Topic:</strong> {service.topic}
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {!isMember && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ fontVariantNumeric: 'normal', fontFeatureSettings: '"tnum" 0, "lnum" 0' }}>
                  {String(totalAttendance).replace(/^0+/, '') || '0'}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600" style={{ fontVariantNumeric: 'normal', fontFeatureSettings: '"tnum" 0, "lnum" 0' }}>
                  {String(presentCount).replace(/^0+/, '') || '0'}
                </div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600" style={{ fontVariantNumeric: 'normal', fontFeatureSettings: '"tnum" 0, "lnum" 0' }}>
                  {String(virtualCount).replace(/^0+/, '') || '0'}
                </div>
                <div className="text-xs text-muted-foreground">Virtual</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600" style={{ fontVariantNumeric: 'normal', fontFeatureSettings: '"tnum" 0, "lnum" 0' }}>
                  {String(lateCount).replace(/^0+/, '') || '0'}
                </div>
                <div className="text-xs text-muted-foreground">Late</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-rose-600" style={{ fontVariantNumeric: 'normal', fontFeatureSettings: '"tnum" 0, "lnum" 0' }}>
                  {String(absentCount).replace(/^0+/, '') || '0'}
                </div>
                <div className="text-xs text-muted-foreground">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600" style={{ fontVariantNumeric: 'normal', fontFeatureSettings: 'normal' }}>
                  {firstTimeCount || '0'}
                </div>
                <div className="text-xs text-muted-foreground">First Time</div>
              </div>
              {attendanceRate !== null && (
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    attendanceRate >= 80 ? 'text-emerald-600' :
                    attendanceRate >= 60 ? 'text-amber-600' :
                    'text-rose-600'
                  }`} style={{ fontVariantNumeric: 'normal', fontFeatureSettings: '"tnum" 0, "lnum" 0' }}>
                    {attendanceRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">Attendance Rate</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Summary */}
      {isMember ? (
        // Member view - simplified to just show status or check-in button
        <Card>
          <CardHeader>
            <CardTitle>Your Attendance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            {myAttendance ? (
              <div className="text-center space-y-4">
                <div className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-lg font-semibold ${
                  myAttendance.attendanceStatus === 'Present'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : myAttendance.attendanceStatus === 'Late'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : myAttendance.attendanceStatus === 'Absent'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}>
                  {myAttendance.attendanceStatus === 'Present' && '✓ Present'}
                  {myAttendance.attendanceStatus === 'Late' && 'Late'}
                  {myAttendance.attendanceStatus === 'Absent' && '✗ Absent'}
                  {myAttendance.attendanceStatus === 'Virtual' && 'Virtual'}
                </div>
                {myAttendance.arrivalTime && (
                  <p className="text-sm text-muted-foreground">
                    Checked in at {new Date(myAttendance.arrivalTime).toLocaleTimeString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                {new Date(service.serviceDate) > new Date() ? (
                  <>
                    <p className="text-muted-foreground">Check-in is not available yet</p>
                    <p className="text-sm text-muted-foreground">
                      You can check in on {new Date(service.serviceDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">You haven't checked in yet</p>
                    <Button
                      size="lg"
                      onClick={() => router.push(`/attendance/services/${id}/check-in`)}
                    >
                      Check In
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Attendance List - Only for Leadership */}
      {!isMember && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                {statusFilter && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Showing {statusFilter} members • {filteredAttendance.length} of {totalAttendance}
                    <button 
                      onClick={() => setStatusFilter(null)}
                      className="ml-2 text-primary hover:underline"
                    >
                      Clear filter
                    </button>
                  </p>
                )}
              </div>
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredAttendance.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No attendance records found</p>
              ) : (
                filteredAttendance.map((record) => {
                  const isEditing = editingMemberId === record.memberId;
                  const statusColor =
                    record.attendanceStatus === 'Present'
                      ? 'text-emerald-600'
                      : record.attendanceStatus === 'Virtual'
                        ? 'text-blue-600'
                        : record.attendanceStatus === 'Late'
                          ? 'text-amber-600'
                          : 'text-gray-600';

                  return (
                    <div
                      key={record.memberId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {record.memberFirstName} {record.memberLastName}
                          </p>
                          {record.isFirstTimeVisitor && (
                            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-600">
                              First Time
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{record.memberEmail}</p>
                        {record.memberBranchName && (
                          <p className="text-xs text-muted-foreground">{record.memberBranchName}</p>
                        )}
                        {record.notes && (
                          <p className="mt-1 text-xs text-muted-foreground italic">{record.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="h-9 rounded-lg border border-input/15 bg-background px-3 text-sm"
                            >
                              {ATTENDANCE_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <Button size="sm" onClick={() => handleSaveEdit(record.memberId)}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingMemberId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className={`font-medium ${statusColor}`}>
                              {record.attendanceStatus}
                            </span>
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleEditClick(record.memberId, record.attendanceStatus)
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleUndo(
                                      record.memberId,
                                      `${record.memberFirstName} ${record.memberLastName}`,
                                    )
                                  }
                                >
                                  Undo
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
