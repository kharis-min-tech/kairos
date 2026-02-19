'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button, SelectInput, DatePicker, Textarea, Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { attendance, fellowships } from '@kairos/api-client';
import type { Fellowship } from '@kairos/types';

type FellowshipStatus = 'Present' | 'Absent' | 'Excused' | 'Late';

interface MemberRow {
  memberId: number;
  name: string;
  status: FellowshipStatus;
}

const STATUS_OPTIONS: { value: FellowshipStatus; label: string }[] = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Excused', label: 'Excused' },
  { value: 'Late', label: 'Late' },
];

export default function FellowshipAttendancePage() {
  const { user } = useAuth();
  const [meetingDate, setMeetingDate] = useState('');
  const [selectedFellowship, setSelectedFellowship] = useState<string>('');
  const [fellowshipList, setFellowshipList] = useState<Fellowship[]>([]);
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const branchId = user?.branchId ? Number(user.branchId) : undefined;

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    fellowships
      .list({ branchId, limit: 100 })
      .then((res) => setFellowshipList(res.data))
      .catch(() => setError('Failed to load fellowships.'))
      .finally(() => setLoading(false));
  }, [branchId]);

  const loadFellowshipMembers = useCallback(async (fellowshipId: number) => {
    setLoadingMembers(true);
    setError(null);
    try {
      // The API returns fellowship details; members come from the members list filtered by fellowship
      const apiClient = await import('@kairos/api-client');
      const membersRes = await apiClient.members.list({
        fellowshipId,
        limit: 500,
        status: 'active',
      });
      setMemberRows(
        membersRes.data.map((m: { member_id: number; first_name: string; last_name: string }) => ({
          memberId: m.member_id,
          name: `${m.first_name} ${m.last_name}`,
          status: 'Absent' as FellowshipStatus,
        }))
      );
    } catch {
      setError('Failed to load fellowship members.');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFellowship) {
      loadFellowshipMembers(Number(selectedFellowship));
    } else {
      setMemberRows([]);
    }
  }, [selectedFellowship, loadFellowshipMembers]);

  const updateStatus = (memberId: number, status: FellowshipStatus) => {
    setMemberRows((prev) =>
      prev.map((r) => (r.memberId === memberId ? { ...r, status } : r))
    );
  };

  const handleSubmit = async () => {
    if (!meetingDate || !selectedFellowship) {
      setError('Please select a meeting date and fellowship.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await attendance.recordFellowship({
        meetingDate,
        fellowshipId: Number(selectedFellowship),
        location: '',
        notes: notes || undefined,
        records: memberRows.map((r) => ({ memberId: r.memberId, status: r.status })),
      });
      setSuccess('Fellowship attendance recorded successfully.');
    } catch {
      setError('Failed to record attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fellowshipOptions = fellowshipList.map((f) => ({
    value: String(f.fellowship_id),
    label: f.fellowship_name,
  }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Attendance', href: '/attendance' },
          { label: 'Record Fellowship' },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900">Record Fellowship Attendance</h1>
      <p className="mt-1 text-sm text-gray-600">
        Select a fellowship and meeting date, then mark attendance for each member.
      </p>

      {error && <Alert variant="error" className="mt-4" onDismiss={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" className="mt-4" onDismiss={() => setSuccess(null)}>{success}</Alert>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DatePicker
          label="Meeting Date"
          name="meetingDate"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          required
        />
        {loading ? (
          <div className="flex items-end pb-2"><Spinner size="sm" /></div>
        ) : (
          <SelectInput
            label="Fellowship"
            name="fellowship"
            value={selectedFellowship}
            onChange={(e) => setSelectedFellowship(e.target.value)}
            options={fellowshipOptions}
            placeholder="Select fellowship..."
            required
          />
        )}
      </div>

      <div className="mt-4">
        <Textarea
          label="Meeting Notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Topics discussed, prayer points, etc."
          rows={3}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Members ({memberRows.length})
        </h2>

        {loadingMembers ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !selectedFellowship ? (
          <p className="text-gray-500 py-8 text-center">Select a fellowship to see members.</p>
        ) : memberRows.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No members found for this fellowship.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm" role="grid" aria-label="Fellowship member attendance list">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {memberRows.map((row) => (
                  <tr key={row.memberId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{row.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={row.status}
                        onChange={(e) => updateStatus(row.memberId, e.target.value as FellowshipStatus)}
                        aria-label={`Status for ${row.name}`}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-primary focus:outline-2 focus:outline-primary"
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
        <Button onClick={handleSubmit} disabled={submitting || !meetingDate || !selectedFellowship}>
          {submitting ? 'Saving...' : 'Record Attendance'}
        </Button>
      </div>
    </>
  );
}
