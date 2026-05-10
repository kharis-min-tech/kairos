'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { useAttendanceTrends, useMemberAttendanceHistory } from '@/hooks/use-attendance';
import { useAuthStore } from '@/lib/auth-store';

export function AttendanceWidget() {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isMember = activeRole === 'member';

  // For members, fetch their personal attendance history
  const { data: memberHistory, isLoading: memberLoading } = useMemberAttendanceHistory(
    user?.id ?? '',
    {
      startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 28 days ago
      limit: 50,
    },
  );

  console.log('=== ATTENDANCE WIDGET DEBUG ===');
  console.log('User:', user);
  console.log('User ID:', user?.id);
  console.log('Active Role:', activeRole);
  console.log('Is Member:', isMember);
  console.log('Start Date:', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  console.log('Member Loading:', memberLoading);
  console.log('Member History Response:', memberHistory);

  // For admins/pastors/leaders, fetch branch-wide trends
  const { data: response, isLoading } = useAttendanceTrends({
    branchId: activeRole === 'admin' ? undefined : user?.homeBranchId,
    weeks: 4,
  });

  // Show loading for members
  if (isMember && memberLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Service Attendance (Last 4 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !isMember) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Attendance (Last 4 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // For members, show same layout as leaders but with personal data
  if (isMember) {
    const allHistory = memberHistory?.data || [];
    // Only count services that have already happened
    const history = allHistory.filter((s: any) => new Date(s.serviceDate) <= new Date());

    const totalServices = history.length;
    const presentCount = history.filter((s: any) => s.attendanceStatus === 'Present').length;
    const lateCount = history.filter((s: any) => s.attendanceStatus === 'Late').length;
    const virtualCount = history.filter((s: any) => s.attendanceStatus === 'Virtual').length;
    const absentCount = history.filter((s: any) => s.attendanceStatus === 'Absent').length;
    const attended = presentCount + lateCount + virtualCount;
    const avgRate = totalServices > 0 ? Math.round((attended / totalServices) * 100) : 0;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Attendance (Last 4 Weeks)</CardTitle>
          <Link href="/attendance/reports" className="text-sm text-primary hover:underline">
            View Reports
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${avgRate >= 80 ? 'text-emerald-600' : avgRate >= 60 ? 'text-amber-600' : avgRate > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                {totalServices > 0 ? `${avgRate}%` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Your Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{attended}</div>
              <div className="text-xs text-muted-foreground">Attended</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{virtualCount}</div>
              <div className="text-xs text-muted-foreground">Virtual</div>
            </div>
          </div>

          {history.length > 0 ? (
            <div className="space-y-2 pt-2">
              <div className="text-sm font-medium">Recent Services</div>
              {history.slice(0, 6).map((service: any) => (
                <Link key={service.serviceId} href={`/attendance/services/${service.serviceId}`} className="block">
                  <div className="flex items-center justify-between rounded-lg border p-2 text-sm transition-colors hover:bg-accent/50">
                    <div>
                      <div className="font-medium">{service.serviceType}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(service.serviceDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      service.attendanceStatus === 'Present' ? 'bg-emerald-500/15 text-emerald-600' :
                      service.attendanceStatus === 'Virtual' ? 'bg-blue-500/15 text-blue-600' :
                      service.attendanceStatus === 'Late' ? 'bg-amber-500/15 text-amber-600' :
                      'bg-rose-500/15 text-rose-600'
                    }`}>
                      {service.attendanceStatus}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No attendance records found for the last 4 weeks. If you&apos;ve attended services, your leader may not have recorded your attendance yet.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // For admins/pastors/leaders, show branch-wide stats
  const trends = response?.data ?? [];
  const recentServices = trends.slice(0, 4);
  
  console.log('Recent services:', recentServices);
  
  // Calculate average attendance rate from services that have valid percentages
  const servicesWithPercentage = recentServices.filter(s => 
    s.attendancePercentage !== null && s.attendancePercentage !== undefined && !isNaN(s.attendancePercentage)
  );
  
  console.log('Services with percentage:', servicesWithPercentage);
  
  const avgAttendanceRate = servicesWithPercentage.length > 0
    ? Math.round(
        servicesWithPercentage.reduce((sum, s) => sum + Number(s.attendancePercentage), 0) / servicesWithPercentage.length
      )
    : 0;
    
  console.log('Average attendance rate:', avgAttendanceRate);

  const totalPresent = recentServices.reduce((sum, s) => sum + Number(s.presentCount), 0);
  const totalVirtual = recentServices.reduce((sum, s) => sum + Number(s.virtualCount), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Service Attendance (Last 4 Weeks)</CardTitle>
        <Link href="/attendance/reports" className="text-sm text-primary hover:underline">
          View Reports
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${
                avgAttendanceRate >= 80
                  ? 'text-emerald-600'
                  : avgAttendanceRate >= 60
                    ? 'text-amber-600'
                    : avgAttendanceRate > 0
                      ? 'text-rose-600'
                      : 'text-muted-foreground'
              }`}
            >
              {avgAttendanceRate > 0 ? `${avgAttendanceRate}%` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">{totalPresent}</div>
            <div className="text-xs text-muted-foreground">Present</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{totalVirtual}</div>
            <div className="text-xs text-muted-foreground">Virtual</div>
          </div>
        </div>

        {recentServices.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-sm font-medium">Recent Services</div>
            {recentServices.map((service) => (
              <Link
                key={service.serviceId}
                href={`/attendance/services/${service.serviceId}`}
                className="block"
              >
                <div className="flex items-center justify-between rounded-lg border p-2 text-sm transition-colors hover:bg-accent/50">
                  <div>
                    <div className="font-medium">{service.serviceType}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(service.serviceDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-emerald-600">{Number(service.presentCount)} Present</span>
                    <span className="text-blue-600">{Number(service.virtualCount)} Virtual</span>
                    {service.attendancePercentage !== null && (
                      <span
                        className={
                          service.attendancePercentage >= 80
                            ? 'text-emerald-600'
                            : service.attendancePercentage >= 60
                              ? 'text-amber-600'
                              : 'text-rose-600'
                        }
                      >
                        {Number(service.attendancePercentage).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
