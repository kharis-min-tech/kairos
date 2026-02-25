'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, DataTable, Spinner, Badge } from '@/components/ui';
import { attendance } from '@kairos/api-client';
import type { ColumnDef } from '@tanstack/react-table';

interface AttendanceTabProps {
  memberId: number;
}

interface AttendanceRecord {
  serviceId: number;
  serviceDate: string | Date;
  serviceType: string;
  attendanceStatus: string;
  [key: string]: unknown;
}

interface AttendanceSummary {
  totalAttended: number;
  totalServices: number;
  attendancePercentage: number;
  lastAttendanceDate: string | null;
}

export function computeAttendanceSummary(records: AttendanceRecord[]): AttendanceSummary {
  if (records.length === 0) {
    return { totalAttended: 0, totalServices: 0, attendancePercentage: 0, lastAttendanceDate: null };
  }

  const totalServices = records.length;
  const totalAttended = records.filter(
    (r) => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Virtual'
  ).length;
  const attendancePercentage = totalServices > 0 ? Math.round((totalAttended / totalServices) * 100) : 0;

  const sorted = [...records].sort(
    (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
  );
  const lastAttendanceDate = sorted[0]?.serviceDate
    ? new Date(sorted[0].serviceDate).toLocaleDateString('en-GB')
    : null;

  return { totalAttended, totalServices, attendancePercentage, lastAttendanceDate };
}

const statusVariant: Record<string, 'active' | 'inactive' | 'pending'> = {
  Present: 'active',
  Virtual: 'pending',
  Absent: 'inactive',
};

const columns: ColumnDef<AttendanceRecord, unknown>[] = [
  {
    accessorKey: 'serviceDate',
    header: 'Service Date',
    cell: ({ getValue }) => {
      const val = getValue();
      return val ? new Date(val as string | Date).toLocaleDateString('en-GB') : '—';
    },
  },
  {
    accessorKey: 'serviceType',
    header: 'Service Type',
  },
  {
    accessorKey: 'attendanceStatus',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return <Badge variant={statusVariant[status] ?? 'inactive'}>{status}</Badge>;
    },
  },
];

export function AttendanceTab({ memberId }: AttendanceTabProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalAttended: 0,
    totalServices: 0,
    attendancePercentage: 0,
    lastAttendanceDate: null,
  });

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await attendance.listService({ memberId, sortBy: 'serviceDate', sortOrder: 'desc' });
      const data = (res.data ?? []) as unknown as AttendanceRecord[];

      // Sort by serviceDate descending (most recent first)
      const sorted = [...data].sort(
        (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
      );

      setRecords(sorted);
      setSummary(computeAttendanceSummary(sorted));
    } catch {
      setError('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">{error}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardBody>
          <h3 className="text-sm font-medium text-gray-500 mb-4">Attendance Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Services Attended</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.totalAttended} / {summary.totalServices}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Attendance Rate</p>
              <p className="text-lg font-semibold text-gray-900">{summary.attendancePercentage}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Attendance</p>
              <p className="text-lg font-semibold text-gray-900">{summary.lastAttendanceDate ?? '—'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Attendance Table or Empty State */}
      {records.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500">No attendance records yet.</p>
          </CardBody>
        </Card>
      ) : (
        <DataTable data={records} columns={columns} />
      )}
    </div>
  );
}
