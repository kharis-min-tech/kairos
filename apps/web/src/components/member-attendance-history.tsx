'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { useMemberAttendanceHistory } from '@/hooks/use-attendance';

interface MemberAttendanceHistoryProps {
  memberId: string;
}

export function MemberAttendanceHistory({ memberId }: MemberAttendanceHistoryProps) {
  const { data: response, isLoading } = useMemberAttendanceHistory(memberId, { limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const history = response?.data ?? [];

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No attendance records found</p>
        </CardContent>
      </Card>
    );
  }

  const totalServices = history.length;
  const presentCount = history.filter((h) => h.attendanceStatus === 'Present').length;
  const virtualCount = history.filter((h) => h.attendanceStatus === 'Virtual').length;
  const lateCount = history.filter((h) => h.attendanceStatus === 'Late').length;
  const attendanceRate = Math.round(((presentCount + virtualCount + lateCount) / totalServices) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4 rounded-lg bg-muted/50 p-4">
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
            <div className="text-xs text-muted-foreground">Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{presentCount}</div>
            <div className="text-xs text-muted-foreground">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{virtualCount}</div>
            <div className="text-xs text-muted-foreground">Virtual</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{lateCount}</div>
            <div className="text-xs text-muted-foreground">Late</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Recent Services (Last 10)</div>
          {history.map((record, idx) => {
            const statusColor =
              record.attendanceStatus === 'Present'
                ? 'text-emerald-600'
                : record.attendanceStatus === 'Virtual'
                  ? 'text-blue-600'
                  : record.attendanceStatus === 'Late'
                    ? 'text-amber-600'
                    : 'text-gray-600';

            return (
              <div key={idx} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <div>
                  <div className="font-medium">
                    {record.serviceTitle || record.serviceType}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(record.serviceDate).toLocaleDateString()} • {record.branchName}
                  </div>
                </div>
                <span className={`font-medium ${statusColor}`}>{record.attendanceStatus}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
