'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { DatePicker } from '@/components/date-picker';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useBranches } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';

const SERVICE_TYPES = [
  'Sunday Service',
  'Midweek Service',
  'Special Service',
  'Prayer Meeting',
  'Other',
] as const;

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Virtual', 'Late'] as const;

export default function RecordServiceAttendancePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const { data: branches } = useBranches();

  const [serviceDate, setServiceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [serviceType, setServiceType] = useState<string>('Sunday Service');
  const [customServiceType, setCustomServiceType] = useState('');
  const [branchId, setBranchId] = useState(user?.homeBranchId ?? '');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [preacherId, setPreacherId] = useState('');
  const [topic, setTopic] = useState('');
  const [expectedAttendance, setExpectedAttendance] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [attendanceData, setAttendanceData] = useState<Map<string, {
    status: string;
    isFirstTimeVisitor: boolean;
    visitorName?: string;
    visitorPhone?: string;
    visitorEmail?: string;
  }>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);

  // Fetch members for the selected branch
  const { data: membersResult } = useMembers({
    branchId: branchId || undefined,
    limit: 500,
    approvalStatus: 'approved',
  });

  // Auto-fill service time from branch schedule for Sunday/Midweek services
  useEffect(() => {
    if (!branchId || !branches?.data) return;
    const branch = branches.data.find((b: any) => b.id === branchId);
    if (!branch?.serviceSchedule) return;
    const schedule = (branch.serviceSchedule as Array<{ day: string; time: string; type: string }>)
      .find((s) => s.type === serviceType);
    if (schedule?.time) {
      setServiceTime(schedule.time);
    } else {
      setServiceTime('');
    }
  }, [branchId, serviceType, branches]);

  const members = membersResult?.data ?? [];

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(query) ||
        m.lastName.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query),
    );
  }, [members, searchQuery]);

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map((m) => m.id)));
    }
  };

  const handleMarkAllPresent = () => {
    const newData = new Map(attendanceData);
    selectedMembers.forEach((memberId) => {
      newData.set(memberId, {
        ...(newData.get(memberId) ?? {}),
        status: 'Present',
        isFirstTimeVisitor: false,
      });
    });
    setAttendanceData(newData);
  };

  const handleToggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
      // Initialize with Present status
      if (!attendanceData.has(memberId)) {
        const newData = new Map(attendanceData);
        newData.set(memberId, { status: 'Present', isFirstTimeVisitor: false });
        setAttendanceData(newData);
      }
    }
    setSelectedMembers(newSelected);
  };

  const handleStatusChange = (memberId: string, status: string) => {
    const newData = new Map(attendanceData);
    newData.set(memberId, {
      ...(newData.get(memberId) ?? { isFirstTimeVisitor: false }),
      status,
    });
    setAttendanceData(newData);
  };

  const handleFirstTimeVisitorToggle = (memberId: string) => {
    const newData = new Map(attendanceData);
    const current = newData.get(memberId) ?? { status: 'Present', isFirstTimeVisitor: false };
    newData.set(memberId, {
      ...current,
      isFirstTimeVisitor: !current.isFirstTimeVisitor,
    });
    setAttendanceData(newData);
  };

  const handleCreateService = async () => {
    if (!branchId) {
      toast.error('Please select a branch');
      return;
    }

    if (!serviceDate) {
      toast.error('Please select a service date');
      return;
    }

    if (serviceType === 'Other' && !customServiceType.trim()) {
      toast.error('Please specify the service type');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time for the service datetime
      let fullServiceDate = serviceDate;
      if (serviceTime) {
        fullServiceDate = `${serviceDate}T${serviceTime}:00`;
      }

      const serviceResponse = await api.attendance.services.create({
        branchId,
        serviceDate: fullServiceDate,
        serviceType: serviceType === 'Other' ? 'Other' : serviceType,
        serviceTitle: serviceType === 'Other' ? customServiceType.trim() : (serviceTitle || undefined),
        preacherId: preacherId || undefined,
        topic: topic || undefined,
        expectedAttendance: expectedAttendance ? parseInt(expectedAttendance, 10) : undefined,
      });

      setCreatedServiceId(serviceResponse.data.id);
      toast.success('Service created. Now mark attendance below.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!createdServiceId) {
      toast.error('Please create the service first');
      return;
    }

    if (selectedMembers.size === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setIsSubmitting(true);

    try {
      const records = Array.from(selectedMembers).map((memberId) => {
        const data = attendanceData.get(memberId) ?? { status: 'Present', isFirstTimeVisitor: false };
        return {
          memberId,
          attendanceStatus: data.status,
          isFirstTimeVisitor: data.isFirstTimeVisitor,
          visitorName: data.visitorName,
          visitorPhone: data.visitorPhone,
          visitorEmail: data.visitorEmail,
        };
      });

      await api.attendance.services.recordAttendance(createdServiceId, { records });

      toast.success(`Attendance recorded for ${selectedMembers.size} members`);
      router.push('/attendance/services');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Service Attendance</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Record attendance for a church service
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/attendance/services')}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <DatePicker
                label="Service Date"
                value={serviceDate}
                onChange={setServiceDate}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Service Type</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {serviceType === 'Other' && (
                <Input
                  value={customServiceType}
                  onChange={(e) => setCustomServiceType(e.target.value)}
                  placeholder="Specify service type (e.g., Youth Service)"
                  className="mt-2"
                />
              )}
            </div>

            {activeRole === 'admin' && (
              <div>
                <label className="text-sm font-medium">Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
                >
                  <option value="">Select Branch</option>
                  {(branches ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Service Title (Optional)</label>
              <Input
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder="e.g., Easter Sunday Service"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Preacher (Optional)</label>
              <select
                value={preacherId}
                onChange={(e) => setPreacherId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
              >
                <option value="">Select Preacher</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Topic (Optional)</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Power of Faith"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Service Time</label>
              <div className="mt-2 flex items-center gap-3">
                {/* Hour input */}
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={serviceTime ? (() => { const h = parseInt(serviceTime.split(':')[0], 10); return h === 0 ? 12 : h > 12 ? h - 12 : h; })() : ''}
                    onChange={(e) => {
                      let h = parseInt(e.target.value, 10);
                      if (isNaN(h)) { setServiceTime(''); return; }
                      if (h < 1) h = 1;
                      if (h > 12) h = 12;
                      const isPM = serviceTime ? parseInt(serviceTime.split(':')[0], 10) >= 12 : true;
                      let hour24 = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
                      const mins = serviceTime ? serviceTime.split(':')[1] : '00';
                      setServiceTime(`${String(hour24).padStart(2, '0')}:${mins}`);
                    }}
                    placeholder="--"
                    className="h-16 w-20 rounded-lg border-2 border-primary/50 bg-background text-center text-3xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="mt-1 text-xs text-muted-foreground">Hour</span>
                </div>

                <span className="text-3xl font-bold text-muted-foreground pb-5">:</span>

                {/* Minute input */}
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={serviceTime ? serviceTime.split(':')[1] : ''}
                    onChange={(e) => {
                      let m = parseInt(e.target.value, 10);
                      if (isNaN(m)) m = 0;
                      if (m < 0) m = 0;
                      if (m > 59) m = 59;
                      const hour = serviceTime ? serviceTime.split(':')[0] : '14';
                      setServiceTime(`${hour}:${String(m).padStart(2, '0')}`);
                    }}
                    placeholder="--"
                    className="h-16 w-20 rounded-lg border-2 border-muted bg-muted/30 text-center text-3xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="mt-1 text-xs text-muted-foreground">Minute</span>
                </div>

                {/* AM/PM toggle */}
                <div className="flex flex-col rounded-lg border-2 border-muted overflow-hidden ml-2 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!serviceTime) { setServiceTime('00:00'); return; }
                      let hour = parseInt(serviceTime.split(':')[0], 10);
                      if (hour >= 12) hour -= 12;
                      setServiceTime(`${String(hour).padStart(2, '0')}:${serviceTime.split(':')[1]}`);
                    }}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      serviceTime && parseInt(serviceTime.split(':')[0], 10) < 12
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!serviceTime) { setServiceTime('12:00'); return; }
                      let hour = parseInt(serviceTime.split(':')[0], 10);
                      if (hour < 12) hour += 12;
                      setServiceTime(`${String(hour).padStart(2, '0')}:${serviceTime.split(':')[1]}`);
                    }}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      serviceTime && parseInt(serviceTime.split(':')[0], 10) >= 12
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
              {(serviceType === 'Sunday Service' || serviceType === 'Midweek Service') && serviceTime && (
                <p className="text-xs text-muted-foreground mt-1">Sunday & Midweek times are set automatically from your branch schedule</p>
              )}
              {serviceType !== 'Sunday Service' && serviceType !== 'Midweek Service' && (
                <p className="text-xs text-muted-foreground mt-1">Set the expected start time for this service</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Expected Attendance (Optional)</label>
              <Input
                type="number"
                min="0"
                value={expectedAttendance}
                onChange={(e) => setExpectedAttendance(e.target.value)}
                placeholder="e.g., 250"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Service button - shown before service is created */}
      {!createdServiceId && (
        <Button onClick={handleCreateService} disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating...' : 'Create Service'}
        </Button>
      )}

      {/* Mark Attendance - only shown after service is created */}
      {createdServiceId && (
      <>
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedMembers.size === filteredMembers.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkAllPresent}
              disabled={selectedMembers.size === 0}
            >
              ☑ Mark Selected as Present
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Selected: {selectedMembers.size} of {filteredMembers.length} members
          </div>

          <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-lg border p-4">
            {filteredMembers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No members found</p>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedMembers.has(member.id);
                const data = attendanceData.get(member.id);
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected ? 'border-primary/40 bg-primary/5' : 'border-input/15'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleMember(member.id)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    {isSelected && (
                      <>
                        <select
                          value={data?.status ?? 'Present'}
                          onChange={(e) => handleStatusChange(member.id, e.target.value)}
                          className="h-9 rounded-lg border border-input/15 bg-background px-3 text-sm"
                        >
                          {ATTENDANCE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={data?.isFirstTimeVisitor ?? false}
                            onChange={() => handleFirstTimeVisitorToggle(member.id)}
                            className="h-4 w-4"
                          />
                          First Time
                        </label>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || selectedMembers.size === 0}>
          {isSubmitting ? 'Saving...' : 'Save Attendance'}
        </Button>
      </div>
      </>
      )}
    </div>
  );
}
