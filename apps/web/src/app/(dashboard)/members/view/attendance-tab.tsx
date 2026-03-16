'use client';

import { useMemo } from 'react';
import { Card, CardContent, DataTable, Spinner, Badge, Alert } from '@/components/ui';
import { useServiceAttendance } from '@/hooks/use-attendance';
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

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Present: 'default',
  Virtual: 'outline',
  Absent: 'secondary',
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
      return <Badge variant={statusVariant[status] ?? 'secondary'}>{status}</Badge>;
    },
  },
];

export function computeAttendanceSummary(records: AttendanceRecord[]) {
  if (records.length === 0) {
    return { totalAttended: 0, totalServices: 0, attendancePercentage: 0, lastAttendanceDate: null as string | null };
  }
  const totalServices = records.length;
  const totalAttended = records.filter(
    (r) => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Virtual'
  ).length;
  const attendancePercentage = Math.round((totalAttended / totalServices) * 100);
  const sorted = [...records].sort(
    (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
  );
  const lastAttendanceDate = sorted[0]?.serviceDate
    ? new Date(sorted[0].serviceDate).toLocaleDateString('en-GB')
    : null;
  return { totalAttended, totalServices, attendancePercentage, lastAttendanceDate };
}

export function AttendanceTab({ memberId }: AttendanceTabProps) {
  const { data: res, isLoading, error } = useServiceAttendance({
    memberId,
    sortBy: 'serviceDate',
    sortOrder: 'desc',
  });

  const records = useMemo(() => {
    const data = (res?.data ?? []) as unknown as AttendanceRecord[];
    return [...data].sort(
      (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
    );
  }, [res?.data]);

  const summary = useMemo(() => computeAttendanceSummary(records), [records]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error" title="Error">Failed to load attendance records.</Alert>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No attendance records yet.</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable data={records} columns={columns} />
      )}
    </div>
  );
}
