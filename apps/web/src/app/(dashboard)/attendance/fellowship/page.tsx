'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button, SelectInput, DatePicker, Textarea, Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useRecordFellowshipAttendance } from '@/hooks/use-attendance';
import { useFellowships } from '@/hooks/use-fellowships';
import { useMembers } from '@/hooks/use-members';

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
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const branchId = user?.branchId ? Number(user.branchId) : undefined;

  const { data: fellowshipsRes, isLoading: loadingFellowships } = useFellowships(
    branchId ? { branchId, limit: 100 } : undefined
  );
  const fellowshipList = fellowshipsRes?.data ?? [];

  const { data: membersRes, isLoading: loadingMembers } = useMembers(
    selectedFellowship ? { fellowshipId: Number(selectedFellowship), limit: 500, status: 'active' } : undefined
  );

  const recordAttendance = useRecordFellowshipAttendance();

  useEffect(() => {
    const members = membersRes?.data ?? [];
    setMemberRows(
      members.map((m: { memberId: number; firstName: string; lastName: string }) => ({
        memberId: m.memberId,
        name: `${m.firstName} ${m.lastName}`,
        status: 'Absent' as FellowshipStatus,
      }))
    );
  }, [membersRes]);

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
    setError(null);
    setSuccess(null);
    try {
      await recordAttendance.mutateAsync({
        meetingDate,
        fellowshipId: Number(selectedFellowship),
        location: '',
        notes: notes || undefined,
        records: memberRows.map((r) => ({ memberId: r.memberId, status: r.status })),
      });
      setSuccess('Fellowship attendance recorded successfully.');
    } catch {
      setError('Failed to record attendance. Please try again.');
    }
  };

  const fellowshipOptions = fellowshipList.map((f: { fellowshipId: number; fellowshipName: string }) => ({
    value: String(f.fellowshipId),
    label: f.fellowshipName,
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
        {loadingFellowships ? (
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
        <Button onClick={handleSubmit} disabled={recordAttendance.isPending || !meetingDate || !selectedFellowship}>
          {recordAttendance.isPending ? 'Saving...' : 'Record Attendance'}
        </Button>
      </div>
    </>
  );
}
