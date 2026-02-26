'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button, SelectInput, DatePicker, Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { attendance, members, branches as branchesApi } from '@kairos/api-client';
import type { Branch } from '@kairos/types';

type ServiceType = 'Sunday Service' | 'Midweek Service' | 'Special Service';
type AttendanceStatus = 'Present' | 'Absent' | 'Virtual';

interface MemberRow {
  memberId: number;
  name: string;
  status: AttendanceStatus;
  selected: boolean;
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'Sunday Service', label: 'Sunday Service' },
  { value: 'Midweek Service', label: 'Midweek Service' },
  { value: 'Special Service', label: 'Special Service' },
];

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Virtual', label: 'Virtual' },
];

export default function ServiceAttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [serviceDate, setServiceDate] = useState('');
  const [serviceType, setServiceType] = useState<string>('');
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allSelected, setAllSelected] = useState(false);
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  const branchId = isAdmin
    ? (selectedBranch ? Number(selectedBranch) : undefined)
    : (user?.branchId ? Number(user.branchId) : undefined);

  // Load branch list for Admin users
  useEffect(() => {
    if (isAdmin) {
      branchesApi.list({ limit: 100 }).then((res) => setBranchList(res.data as unknown as Branch[])).catch(() => {});
    }
  }, [isAdmin]);

  const loadMembers = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await members.list({ branchId, limit: 500, status: 'active' });
      setMemberRows(
        res.data.map((m: { memberId: number; firstName: string; lastName: string }) => ({
          memberId: m.memberId,
          name: `${m.firstName} ${m.lastName}`,
          status: 'Absent' as AttendanceStatus,
          selected: false,
        }))
      );
    } catch {
      setError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const toggleAll = () => {
    const next = !allSelected;
    setAllSelected(next);
    setMemberRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: next,
        status: next ? 'Present' : 'Absent',
      }))
    );
  };

  const toggleMember = (memberId: number) => {
    setMemberRows((prev) =>
      prev.map((r) =>
        r.memberId === memberId
          ? { ...r, selected: !r.selected, status: !r.selected ? 'Present' : 'Absent' }
          : r
      )
    );
  };

  const updateStatus = (memberId: number, status: AttendanceStatus) => {
    setMemberRows((prev) =>
      prev.map((r) =>
        r.memberId === memberId
          ? { ...r, status, selected: status !== 'Absent' }
          : r
      )
    );
  };

  const handleSubmit = async () => {
    if (!serviceDate || !serviceType || !branchId) {
      setError(isAdmin && !branchId ? 'Please select a branch.' : 'Please select a service date and type.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await attendance.recordService({
        serviceDate,
        serviceType,
        branchId,
        records: memberRows.map((r) => ({ memberId: r.memberId, status: r.status })),
      });
      setSuccess('Service attendance recorded successfully.');
    } catch {
      setError('Failed to record attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Attendance', href: '/attendance' },
          { label: 'Record Service' },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900">Record Service Attendance</h1>
      <p className="mt-1 text-sm text-gray-600">
        Select a service date and type, then mark attendance for each member.
      </p>

      {error && <Alert variant="error" className="mt-4" onDismiss={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" className="mt-4" onDismiss={() => setSuccess(null)}>{success}</Alert>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <SelectInput
            label="Branch"
            name="branch"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            options={branchList.map((b) => ({ value: String(b.branchId), label: b.branchName }))}
            placeholder="Select branch..."
            required
          />
        )}
        <DatePicker
          label="Service Date"
          name="serviceDate"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
          required
        />
        <SelectInput
          label="Service Type"
          name="serviceType"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          options={SERVICE_TYPES}
          placeholder="Select type..."
          required
        />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Members ({memberRows.length})
          </h2>
          <Button variant="secondary" size="sm" onClick={toggleAll}>
            {allSelected ? 'Deselect All' : 'Mark All Present'}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : memberRows.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No members found for this branch.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm" role="grid" aria-label="Member attendance list">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all members"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {memberRows.map((row) => (
                  <tr key={row.memberId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleMember(row.memberId)}
                        aria-label={`Select ${row.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900">{row.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={row.status}
                        onChange={(e) => updateStatus(row.memberId, e.target.value as AttendanceStatus)}
                        aria-label={`Status for ${row.name}`}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm min-h-[44px] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || !serviceDate || !serviceType}>
          {submitting ? 'Saving...' : 'Record Attendance'}
        </Button>
      </div>
    </>
  );
}
