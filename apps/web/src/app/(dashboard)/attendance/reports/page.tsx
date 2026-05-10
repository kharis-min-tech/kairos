'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useAttendanceTrends, useDetailedAttendanceTrends, useMissingMembers, useAttendanceByServiceType } from '@/hooks/use-attendance';
import { useMembers } from '@/hooks/use-members';
import { api } from '@/lib/api';
import { MonthDayPicker } from '@/components/month-day-picker';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

// Custom tick component to ensure no leading zeros
const CustomYAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="currentColor"
        className="fill-foreground"
        style={{ fontSize: '12px', fontVariantNumeric: 'normal' }}
      >
        {parseInt(payload.value, 10)}
      </text>
    </g>
  );
};

const ATTENDANCE_TYPES = [
  { label: 'Service Attendance', value: 'service' },
  { label: 'Outreach Attendance', value: 'outreach' },
  { label: 'Fellowship (K-Group)', value: 'fellowship' },
  { label: 'Department', value: 'department' },
];

const COLORS = {
  present: '#059669',
  late: '#D97706',
  absent: '#DC2626',
};

export default function AttendanceReportsPage() {
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const user = useAuthStore((s) => s.user);
  const isActualMember = activeRole === 'member';
  const [attendanceType, setAttendanceType] = useState('service');
  const [timePeriod, setTimePeriod] = useState('1M'); // Default to 1 month
  const isMember = isActualMember || timePeriod === 'my-report';
  const isLeadershipReport = timePeriod === 'leadership-report';
  const showPersonalView = isMember;
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Default to 1 month ago
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Function to update dates based on time period
  const updateDatesForPeriod = (period: string) => {
    const end = new Date();
    const start = new Date();
    
    switch(period) {
      case '1W':
        start.setDate(start.getDate() - 7);
        break;
      case '1M':
        start.setMonth(start.getMonth() - 1);
        break;
      case '3M':
        start.setMonth(start.getMonth() - 3);
        break;
      case '6M':
        start.setMonth(start.getMonth() - 6);
        break;
      default:
        return; // Don't update for custom
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };
  const [selectedService, setSelectedService] = useState<any>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [tooltipSearchTerm, setTooltipSearchTerm] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [pinnedTooltip, setPinnedTooltip] = useState<any>(null);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [ringsServiceDropdownOpen, setRingsServiceDropdownOpen] = useState(false);
  const [punctualityServiceDropdownOpen, setPunctualityServiceDropdownOpen] = useState(false);
  const [selectedMissingMember, setSelectedMissingMember] = useState<any>(null);
  const [selectedMissedServices, setSelectedMissedServices] = useState<any>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<any>(null);
  const [missingMemberSearch, setMissingMemberSearch] = useState('');
  const [serviceTypeSearch, setServiceTypeSearch] = useState('');

  // Calculate weeks from time period or date range
  const calculateWeeks = () => {
    if (timePeriod === 'custom') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.ceil(diffDays / 7);
    }
    
    // Parse time period (e.g., "1W", "1M", "3M", "6M")
    if (timePeriod.endsWith('W')) {
      return parseInt(timePeriod);
    } else if (timePeriod.endsWith('M')) {
      const months = parseInt(timePeriod);
      return Math.ceil((months * 30) / 7); // Approximate weeks
    }
    return 8; // Default
  };

  const weeks = calculateWeeks();

  const { data: trendsResponse, isLoading } = useAttendanceTrends({
    weeks,
    branchId: activeRole === 'admin' ? undefined : user?.homeBranchId,
  });

  const trends = trendsResponse?.data ?? [];

  // Fetch detailed attendance for each service
  const [servicesWithAttendance, setServicesWithAttendance] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load attendance details for all services (leaders/admins only)
  useEffect(() => {
    if (isMember) return; // Members don't need per-service attendance details
    if (trends.length > 0 && servicesWithAttendance.length === 0 && !loadingDetails) {
      setLoadingDetails(true);
      Promise.all(
        trends.map(async (trend) => {
          try {
            const response = await api.attendance.services.getAttendance(trend.serviceId);
            return {
              ...trend,
              attendanceRecords: response.data || [],
            };
          } catch (error) {
            console.error(`Failed to fetch attendance for service ${trend.serviceId}:`, error);
            return {
              ...trend,
              attendanceRecords: [],
            };
          }
        })
      ).then((results) => {
        console.log('=== LOADED ALL SERVICE ATTENDANCE ===');
        console.log('Services with attendance:', results);
        setServicesWithAttendance(results);
        setLoadingDetails(false);
      });
    }
  }, [trends, servicesWithAttendance.length, loadingDetails]);

  const { data: detailedResponse, isLoading: detailedLoading, error: detailedError } = useDetailedAttendanceTrends({
    weeks,
    branchId: activeRole === 'admin' ? undefined : user?.homeBranchId,
  });

  const { data: missingMembersResponse } = useMissingMembers(
    !isMember ? { weeks, branchId: activeRole === 'admin' ? undefined : user?.homeBranchId } : undefined
  );
  const missingMembers = missingMembersResponse?.data ?? [];

  const { data: byServiceTypeResponse } = useAttendanceByServiceType(
    !isMember ? { weeks, branchId: activeRole === 'admin' ? undefined : user?.homeBranchId } : undefined
  );
  const serviceTypeStats = byServiceTypeResponse?.data ?? [];

  // Fetch all members to identify leadership for the Leadership Report
  const { data: allMembersData } = useMembers(isLeadershipReport ? { limit: 500, approvalStatus: 'approved' } : undefined);
  const allLeaders = (allMembersData?.data ?? []).filter((m: any) => m.systemRole === 'pastor' || m.systemRole === 'leader');

  const detailedRecords = detailedResponse?.data ?? [];

  console.log('=== ATTENDANCE REPORTS DEBUG ===');
  console.log('User:', user);
  console.log('User ID:', user?.id);
  console.log('Active Role:', activeRole);
  console.log('Is Member:', isMember);
  console.log('System Role:', user?.systemRole);
  console.log('Trends count:', trends.length);
  console.log('Trends data:', trends);
  console.log('Detailed Records count:', detailedRecords.length);
  console.log('Detailed Records error:', detailedError);
  console.log('Detailed Records response:', detailedResponse);

  // CRITICAL: For members, we should ONLY use their detailed records, NOT the trends data
  // The trends data contains ALL members' data aggregated
  const filteredDetailedRecords = isMember 
    ? detailedRecords.filter(record => {
        return record.memberId === user?.id;
      })
    : isLeadershipReport
      ? detailedRecords.filter(record => {
          return record.memberRole === 'pastor' || record.memberRole === 'leader';
        })
      : detailedRecords;

  console.log('Filtered Records (for member):', filteredDetailedRecords);
  console.log('Filtered count:', filteredDetailedRecords.length);

  // For members with no records, we'll show inline empty state (not early return)
  // so the filter buttons remain accessible
  const memberHasNoRecords = isMember && filteredDetailedRecords.length === 0 && !isLoading && !detailedLoading;

  if (isLoading || detailedLoading || (!isMember && loadingDetails)) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  // Process data for charts
  // CRITICAL: Members should ONLY see their own data from filteredDetailedRecords
  // Leaders/Admins see aggregated data from trends
  const timeSeriesData = isMember
    ? // For members: group their own records by date
      filteredDetailedRecords
        .reduce((acc: any[], record) => {
          const date = new Date(record.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const existing = acc.find(item => item.date === date && item.serviceType === record.serviceType);
          
          const isAttended = ['Present', 'Late'].includes(record.attendanceStatus);
          const isOnTime = record.attendanceStatus === 'Present';
          const isLate = record.attendanceStatus === 'Late';
          const isAbsent = record.attendanceStatus === 'Absent';
          
          if (existing) {
            if (isAttended) existing.attended += 1;
            if (isOnTime) existing.onTime += 1;
            if (isLate) existing.late += 1;
            if (isAbsent) existing.absent += 1;
            existing.records.push(record);
          } else {
            acc.push({
              date,
              serviceDate: record.serviceDate,
              serviceType: record.serviceType,
              attended: isAttended ? 1 : 0,
              onTime: isOnTime ? 1 : 0,
              late: isLate ? 1 : 0,
              absent: isAbsent ? 1 : 0,
              records: [record],
            });
          }
          return acc;
        }, [])
        .sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime())
    : // For leaders: use aggregated trends data - SHOW EACH SERVICE SEPARATELY
      (servicesWithAttendance.length > 0 ? servicesWithAttendance : trends)
        .sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime())
        .map((t) => {
          const records = t.attendanceRecords || [];
          
          console.log(`Building chart data for ${t.serviceDate} ${t.serviceType}:`, {
            serviceId: t.serviceId,
            recordsCount: records.length,
            recordsPreview: records.slice(0, 3).map((r: any) => ({
              name: `${r.memberFirstName} ${r.memberLastName}`,
              status: r.attendanceStatus
            }))
          });
          
          // CRITICAL: Ensure numeric addition, not string concatenation
          const presentCount = Number(t.presentCount) || 0;
          const lateCount = Number(t.lateCount) || 0;
          const absentCount = Number(t.absentCount) || 0;
          
          const attended = presentCount + lateCount;
          const onTime = presentCount;
          
          return {
            // Use unique label for each service: "Apr 20 - Midweek Service"
            date: `${new Date(t.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${t.serviceType}`,
            serviceDate: t.serviceDate,
            serviceType: t.serviceType,
            branchName: t.branchName,
            attended: attended,
            onTime: onTime,
            late: lateCount,
            absent: absentCount,
            total: Number(t.totalAttendance) || 0,
            records: records,
          };
        });

  console.log('Time Series Data:', timeSeriesData);

  // Group by service type for comparison
  // For members, calculate from their filtered records only
  const serviceTypeData = isMember
    ? filteredDetailedRecords.reduce((acc: any[], r) => {
        const existing = acc.find((item) => item.serviceType === r.serviceType);
        
        const isAttended = ['Present', 'Late'].includes(r.attendanceStatus);
        const isOnTime = r.attendanceStatus === 'Present';
        const isLate = r.attendanceStatus === 'Late';
        const isAbsent = r.attendanceStatus === 'Absent';
        
        if (existing) {
          if (isAttended) existing.attended += 1;
          if (isOnTime) existing.onTime += 1;
          if (isLate) existing.late += 1;
          if (isAbsent) existing.absent += 1;
          existing.total += 1;
          existing.count += 1;
          existing.records.push(r);
        } else {
          acc.push({
            serviceType: r.serviceType,
            attended: isAttended ? 1 : 0,
            onTime: isOnTime ? 1 : 0,
            late: isLate ? 1 : 0,
            absent: isAbsent ? 1 : 0,
            total: 1,
            count: 1,
            records: [r],
          });
        }
        return acc;
      }, [])
    : trends.reduce((acc: any[], t) => {
        const existing = acc.find((item) => item.serviceType === t.serviceType);
        const recordsForService = filteredDetailedRecords.filter((r) => r.serviceType === t.serviceType);
        
        // CRITICAL: Ensure numeric addition, not string concatenation
        const presentCount = Number(t.presentCount) || 0;
        const lateCount = Number(t.lateCount) || 0;
        const absentCount = Number(t.absentCount) || 0;
        
        const attended = presentCount + lateCount;
        const onTime = presentCount;
        
        if (existing) {
          existing.attended += attended;
          existing.onTime += onTime;
          existing.late += lateCount;
          existing.absent += absentCount;
          existing.total += Number(t.totalAttendance) || 0;
          existing.count += 1;
          existing.records.push(...recordsForService);
        } else {
          acc.push({
            serviceType: t.serviceType,
            attended: attended,
            onTime: onTime,
            late: lateCount,
            absent: absentCount,
            total: Number(t.totalAttendance) || 0,
            count: 1,
            records: recordsForService,
          });
        }
        return acc;
      }, []);

  // Calculate averages
  const serviceTypeAverages = serviceTypeData.map((item) => ({
    serviceType: item.serviceType,
    avgAttended: isMember ? item.attended : Math.round(item.attended / item.count),
    avgOnTime: isMember ? item.onTime : Math.round(item.onTime / item.count),
    avgLate: isMember ? item.late : Math.round(item.late / item.count),
    avgAbsent: isMember ? item.absent : Math.round(item.absent / item.count),
    records: item.records,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          ← Back to Services
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {isMember ? 'Your Attendance' : 'Attendance Reports'}
          </h1>
          <button
            className="group relative inline-flex items-center justify-center"
            aria-label="Information about attendance reports"
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
                ? 'See how you\'re doing across services and track your check-ins.'
                : 'Analyze attendance trends across services and view detailed member attendance records.'}
            </span>
          </button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isMember ? 'See how you\'re doing across services' : 'Monitor and analyze service attendance patterns'}
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
        <CardContent className="pt-6">
          {/* Time Period Buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(['1W', '1M', '3M', '6M', 'custom'] as const).map((period) => {
              const label = period === '1W' ? 'Week' : period === 'custom' ? 'Custom' : period;
              const isActive = timePeriod === period;
              return (
                <button
                  key={period}
                  onClick={() => {
                    setTimePeriod(period);
                    if (period === 'custom') { setShowCustomDates(true); }
                    else { setShowCustomDates(false); updateDatesForPeriod(period); }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {!isActualMember && (
              <button
                onClick={() => setTimePeriod(activeRole === 'admin' ? 'leadership-report' : 'my-report')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  timePeriod === 'my-report' || timePeriod === 'leadership-report'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white'
                }`}
              >
                {activeRole === 'admin' ? 'Leadership Report' : 'My Report'}
              </button>
            )}

            {/* Date Pickers - Only show when Custom is selected */}
            {showCustomDates && (
              <div className="flex items-center gap-2 ml-4">
                <MonthDayPicker
                  label="Start date"
                  value={startDate}
                  onChange={setStartDate}
                  max={endDate}
                />
                <span className="text-slate-500">to</span>
                <MonthDayPicker
                  label="End date"
                  value={endDate}
                  onChange={setEndDate}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}
          </div>

          {/* Date Range Display - Only show when Custom is selected */}
          {showCustomDates && (
            <p className="text-sm text-slate-400">
              Showing data from {new Date(startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} to {new Date(endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
            </p>
          )}
        </CardContent>
      </Card>

      {attendanceType !== 'service' ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <svg className="h-16 w-16 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium mb-2">
              {attendanceType === 'outreach' && 'Outreach Attendance Reports'}
              {attendanceType === 'fellowship' && 'Fellowship (K-Group) Attendance Reports'}
              {attendanceType === 'department' && 'Department Attendance Reports'}
            </p>
            <p className="text-muted-foreground text-center max-w-md">
              {attendanceType === 'outreach' && 'View attendance data from outreach programs and evangelism events.'}
              {attendanceType === 'fellowship' && 'Track attendance for fellowship meetings and K-Group gatherings.'}
              {attendanceType === 'department' && 'Monitor attendance across different church departments and ministries.'}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              This feature is coming soon. Currently showing Service Attendance only.
            </p>
          </CardContent>
        </Card>
      ) : isLeadershipReport ? (
        /* Leadership Report - shows all pastors/leaders attendance */
        <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Leadership Attendance</CardTitle>
            <p className="text-sm text-slate-400">Pastors and leaders check-in records</p>
          </CardHeader>
          <CardContent>
            {/* All leaders summary at the top */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-700/50">
              {allLeaders.map((leader: any) => {
                const leaderRecords = filteredDetailedRecords.filter((r: any) => r.memberId === leader.id);
                const hasCheckedIn = leaderRecords.length > 0;
                return (
                  <div
                    key={leader.id}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${
                      hasCheckedIn
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <span>{leader.firstName} {leader.lastName}</span>
                    <span className="text-[10px] opacity-70">
                      {leader.systemRole === 'pastor' ? 'Pastor' : 'Leader'}
                    </span>
                    {hasCheckedIn ? (
                      <span className="text-[10px]">· {leaderRecords.length}</span>
                    ) : (
                      <span className="text-[10px]">· No check-ins</span>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredDetailedRecords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No leadership attendance records found for this period</p>
                <p className="text-xs text-slate-500 mt-1">Leaders and pastors need to check in to services for their data to appear here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {/* Group by leader */}
                {Array.from(
                  filteredDetailedRecords.reduce((map, record) => {
                    if (!map.has(record.memberId)) {
                      map.set(record.memberId, {
                        name: `${record.memberFirstName} ${record.memberLastName}`,
                        role: record.memberRole,
                        records: [],
                      });
                    }
                    map.get(record.memberId)!.records.push(record);
                    return map;
                  }, new Map<string, { name: string; role: string; records: any[] }>()),
                ).map(([memberId, leader]) => (
                  <div key={memberId} className="rounded-lg border border-slate-700/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{leader.name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-500/15 text-violet-400">
                          {leader.role === 'pastor' ? 'Pastor' : 'Leader'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">{leader.records.length} service{leader.records.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1">
                      {leader.records.map((record: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-t border-slate-700/30">
                          <div className="flex items-center gap-2 text-slate-300">
                            <span>{new Date(record.serviceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span className="text-slate-500">·</span>
                            <span>{record.serviceType}</span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 font-medium ${
                            record.attendanceStatus === 'Present' ? 'bg-emerald-500/15 text-emerald-400' :
                            record.attendanceStatus === 'Late' ? 'bg-amber-500/15 text-amber-400' :
                            record.attendanceStatus === 'Virtual' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-rose-500/15 text-rose-400'
                          }`}>
                            {record.attendanceStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : memberHasNoRecords ? (
        <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <svg className="h-14 w-14 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-semibold text-white mb-1">No records yet</p>
            <p className="text-slate-400 text-center text-sm max-w-sm">
              No attendance records found for this period. Try a longer time range, or your leader may not have recorded your attendance yet.
            </p>
          </CardContent>
        </Card>
      ) : trends.length === 0 ? (
        <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <svg className="h-12 w-12 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <p className="text-white font-semibold mb-1">No data for this period</p>
            <p className="text-slate-400 text-sm text-center max-w-sm">
              Try selecting a longer time range to see attendance data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Attendance Trends Over Time - Gradient Area Chart */}
          <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-lg">Attendance Status</CardTitle>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {isMember
                      ? 'Track your check-ins over time'
                      : 'Track whether members attended services over time'}
                  </p>
                </div>
                {/* Legend pills */}
                <div className="hidden sm:flex items-center gap-3">
                  {[
                    { label: 'Attended', color: '#10b981', glow: 'shadow-emerald-500/40' },
                    { label: 'Late', color: '#f59e0b', glow: 'shadow-amber-500/40' },
                    { label: 'Absent', color: '#ef4444', glow: 'shadow-red-500/40' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${item.glow}`} style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-4">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={timeSeriesData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      setPinnedTooltip(data.activePayload[0].payload);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <defs>
                    <linearGradient id="gradAttended" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                    <filter id="glow-green">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glow-amber">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glow-red">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  <XAxis dataKey="date" hide />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => String(parseInt(v, 10))}
                  />
                  {/* Subtle horizontal grid lines */}
                  <Tooltip
                    cursor={{ stroke: 'rgba(148,163,184,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const records = d?.records || [];
                      return (
                        <div
                          style={{
                            background: 'rgba(15,23,42,0.92)',
                            border: '1px solid rgba(148,163,184,0.15)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                            minWidth: '180px',
                          }}
                        >
                          <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 2, fontSize: 13 }}>{d.serviceType}</p>
                          <p style={{ color: '#64748b', fontSize: 11, marginBottom: 10 }}>
                            {new Date(d.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {d.branchName && ` · ${d.branchName}`}
                          </p>
                          {[
                            { label: 'Attended', value: d.attended, color: '#10b981' },
                            { label: 'Late', value: d.late, color: '#f59e0b' },
                            { label: 'Absent', value: d.absent, color: '#ef4444' },
                          ].map((row) => (
                            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: row.color, display: 'inline-block', boxShadow: `0 0 6px ${row.color}` }} />
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>{row.label}</span>
                              </div>
                              <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{row.value}</span>
                            </div>
                          ))}
                          {!isMember && records.length > 0 && (
                            <></>
                          )}
                        </div>
                      );
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="attended"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#gradAttended)"
                    dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 2, filter: 'url(#glow-green)' }}
                    name="Attended"
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fill="url(#gradLate)"
                    dot={{ r: 4, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2, filter: 'url(#glow-amber)' }}
                    name="Late"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fill="url(#gradAbsent)"
                    dot={{ r: 4, fill: '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 2, filter: 'url(#glow-red)' }}
                    name="Absent"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Mobile legend */}
              <div className="flex sm:hidden items-center justify-center gap-4 mt-2">
                {[
                  { label: 'Attended', color: '#10b981' },
                  { label: 'Late', color: '#f59e0b' },
                  { label: 'Absent', color: '#ef4444' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Clickable service buttons */}
              {timeSeriesData.length > 0 && (
                <div className="mt-4 relative">
                  <button
                    onClick={() => setServiceDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 px-4 py-2 text-xs rounded-full border border-slate-600 text-slate-300 hover:border-violet-500 hover:text-violet-400 transition-colors bg-slate-800/50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Services ({timeSeriesData.length})
                    <svg className={`w-3 h-3 transition-transform ${serviceDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {serviceDropdownOpen && (
                    <div className="absolute left-0 mt-2 z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[220px] max-h-[250px] overflow-y-auto">
                      {timeSeriesData.map((service, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setPinnedTooltip(service); setServiceDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-between gap-4 border-b border-slate-700/50 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{service.serviceType}</span>
                            <span className="text-slate-500">{new Date(service.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          {isMember && service.records?.[0] ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              service.records[0].attendanceStatus === 'Present' ? 'bg-emerald-500/20 text-emerald-400' :
                              service.records[0].attendanceStatus === 'Late' ? 'bg-amber-500/20 text-amber-400' :
                              service.records[0].attendanceStatus === 'Virtual' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {service.records[0].attendanceStatus}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members Missing Recently */}
          {!isMember && (
            <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Members Missing Recently</CardTitle>
                    <p className="text-sm text-slate-400 mt-0.5">Active members with no attendance in the selected period</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {missingMembers.length} missing
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {missingMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-slate-300 font-medium">All members attended recently</p>
                    <p className="text-slate-500 text-xs">No missing members in this period</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <Input
                        type="text"
                        placeholder="Search by name..."
                        value={missingMemberSearch}
                        onChange={(e) => setMissingMemberSearch(e.target.value)}
                        className="bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {missingMembers
                      .filter((m: any) => {
                        if (!missingMemberSearch.trim()) return true;
                        const q = missingMemberSearch.toLowerCase();
                        return `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
                      })
                      .map((m: any) => (
                      <div key={m.memberId} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
                        <button className="flex items-center gap-3 text-left flex-1 min-w-0" onClick={() => setSelectedMissingMember(m)}>
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                            {m.firstName[0]}{m.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white hover:text-violet-300 transition-colors truncate">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-slate-500 truncate">{m.email}{m.branchName && <span className="text-slate-600"> · {m.branchName}</span>}</p>
                          </div>
                        </button>
                        <button onClick={() => setSelectedMissedServices(m)} className="text-xs text-rose-400 font-medium whitespace-nowrap ml-3 hover:text-rose-300 hover:underline transition-colors">
                          {m.servicesMissed} service{m.servicesMissed !== 1 ? 's' : ''} missed
                        </button>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Member Info Modal */}
          {selectedMissingMember && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMissingMember(null)}>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-200">
                      {selectedMissingMember.firstName[0]}{selectedMissingMember.lastName[0]}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-base">{selectedMissingMember.firstName} {selectedMissingMember.lastName}</p>
                      {selectedMissingMember.branchName && <p className="text-xs text-violet-400">{selectedMissingMember.branchName}</p>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedMissingMember(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Email', value: selectedMissingMember.email, icon: (
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    )},
                    { label: 'Phone', value: selectedMissingMember.phone || '—', icon: (
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    )},
                    { label: 'Gender', value: selectedMissingMember.gender || '—', icon: (
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    )},
                    { label: 'Member since', value: selectedMissingMember.membershipDate ? new Date(selectedMissingMember.membershipDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: (
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    )},
                    { label: 'Services missed', value: `${selectedMissingMember.servicesMissed} in this period`, icon: (
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                    )},
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 shrink-0">{row.icon}</span>
                      <div>
                        <p className="text-slate-500 text-xs">{row.label}</p>
                        <p className="text-slate-200">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setSelectedMissedServices(selectedMissingMember); setSelectedMissingMember(null); }}
                  className="mt-5 w-full py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-rose-400 hover:border-rose-500/50 transition-colors"
                >
                  View missed services →
                </button>
              </div>
            </div>
          )}

          {/* Missed Services Modal */}
          {selectedMissedServices && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMissedServices(null)}>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-white font-semibold">{selectedMissedServices.firstName} {selectedMissedServices.lastName}</p>
                    <p className="text-xs text-slate-500">Services missed in this period</p>
                  </div>
                  <button onClick={() => setSelectedMissedServices(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(selectedMissedServices.missedServices ?? []).map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                      <div>
                        <p className="text-sm font-medium text-white">{s.serviceTitle || s.serviceType}</p>
                        {s.serviceTitle && <p className="text-xs text-slate-500">{s.serviceType}</p>}
                      </div>
                      <span className="text-xs text-slate-500 ml-3 shrink-0">
                        {new Date(s.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attendance by Service Type */}
          <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">{isMember ? 'Your Breakdown' : 'Attendance by Service Type'}</CardTitle>
              <p className="text-sm text-slate-400 mt-0.5">
                {isMember ? 'How you\'re doing across different service types' : 'Average attendance per service type over the selected period'}
              </p>
            </CardHeader>
            <CardContent>
              {/* Radial Rings Summary */}
              {(() => {
                // For members, compute from their own records
                if (isMember) {
                  const mPresent = filteredDetailedRecords.filter(r => r.attendanceStatus === 'Present').length;
                  const mLate = filteredDetailedRecords.filter(r => r.attendanceStatus === 'Late').length;
                  const mAbsent = filteredDetailedRecords.filter(r => r.attendanceStatus === 'Absent').length;
                  const mTotal = filteredDetailedRecords.length;
                  const mAttended = mPresent + mLate;
                  const attendedPct = mTotal > 0 ? Math.round((mAttended / mTotal) * 100) : 0;
                  const absentPct = mTotal > 0 ? Math.round((mAbsent / mTotal) * 100) : 0;

                  const rings = [
                    { label: 'Overall', pct: attendedPct, color: '#8b5cf6', glow: '#8b5cf644' },
                    { label: 'Attended', pct: attendedPct, color: '#10b981', glow: '#10b98144' },
                    { label: 'Absent', pct: absentPct, color: '#ef4444', glow: '#ef444444' },
                  ];
                  const size = 90; const sw = 8; const r = (size - sw) / 2; const circ = 2 * Math.PI * r;

                  return (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {rings.map((ring) => {
                        const offset = circ - (ring.pct / 100) * circ;
                        return (
                          <div key={ring.label} className="flex flex-col items-center gap-1.5">
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
                              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ring.color} strokeWidth={sw}
                                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 8px ${ring.glow})` }}
                              />
                              <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
                                style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`, fontSize: '15px', fontWeight: 700, fill: '#f1f5f9' }}
                              >{ring.pct}%</text>
                            </svg>
                            <span className="text-xs font-medium" style={{ color: ring.color }}>{ring.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // For leaders/admins, use server data
                const totalAttended = serviceTypeStats.reduce((sum: number, r: any) => sum + (Number(r.totalAttended) || 0), 0);
                const totalAbsent = serviceTypeStats.reduce((sum: number, r: any) => sum + (Number(r.totalAbsent) || 0), 0);
                const totalRecords = serviceTypeStats.reduce((sum: number, r: any) => sum + (Number(r.totalRecords) || 0), 0);
                const all = totalRecords || 1;
                const attendanceRate = Math.round((totalAttended / all) * 100);
                const absentPct = Math.round((totalAbsent / all) * 100);

                const rings = [
                  { label: 'Overall', pct: attendanceRate, color: '#8b5cf6', glow: '#8b5cf644' },
                  { label: 'Attended', pct: attendanceRate, color: '#10b981', glow: '#10b98144' },
                  { label: 'Absent', pct: absentPct, color: '#ef4444', glow: '#ef444444' },
                ];
                const size = 90;
                const sw = 8;
                const r = (size - sw) / 2;
                const circ = 2 * Math.PI * r;

                return (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {rings.map((ring) => {
                      const offset = circ - (ring.pct / 100) * circ;
                      return (
                        <div key={ring.label} className="flex flex-col items-center gap-1.5">
                          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ring.color} strokeWidth={sw}
                              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 8px ${ring.glow})` }}
                            />
                            <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
                              style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`, fontSize: '15px', fontWeight: 700, fill: '#f1f5f9' }}
                            >{ring.pct}%</text>
                          </svg>
                          <span className="text-xs font-medium" style={{ color: ring.color }}>{ring.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Service Type Bars */}
              {(() => {
                // For members, derive from their own records
                if (isMember) {
                  const memberByType = filteredDetailedRecords.reduce((acc: Record<string, { attended: number; absent: number; total: number }>, r) => {
                    if (!acc[r.serviceType]) acc[r.serviceType] = { attended: 0, absent: 0, total: 0 };
                    acc[r.serviceType].total++;
                    if (['Present', 'Late', 'Virtual'].includes(r.attendanceStatus)) acc[r.serviceType].attended++;
                    if (r.attendanceStatus === 'Absent') acc[r.serviceType].absent++;
                    return acc;
                  }, {});
                  const entries = Object.entries(memberByType).filter(([type]) =>
                    !serviceTypeSearch.trim() || type.toLowerCase().includes(serviceTypeSearch.toLowerCase())
                  );
                  if (Object.keys(memberByType).length === 0) return <p className="text-slate-500 text-sm text-center py-6">No service data yet</p>;
                  return (
                    <>
                    <div className="mb-3">
                      <Input
                        type="text"
                        placeholder="Search service type..."
                        value={serviceTypeSearch}
                        onChange={(e) => setServiceTypeSearch(e.target.value)}
                        className="bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-5">
                      {entries.map(([type, data]) => {
                        const pct = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-white font-semibold">{type}</span>
                              <span className="text-xs text-violet-400 font-bold">{pct}% rate</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #8b5cf6, #10b981)' }} />
                            </div>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span><span className="text-emerald-400 font-medium">{data.attended}</span> <span className="text-slate-600">you attended</span></span>
                              <span><span className="text-rose-400 font-medium">{data.absent}</span> <span className="text-slate-600">you missed</span></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  );
                }

                // For leaders/admins
                if (serviceTypeStats.length === 0) return <p className="text-slate-500 text-sm text-center py-6">No data available</p>;
                const filteredStats = serviceTypeStats.filter((row: any) =>
                  !serviceTypeSearch.trim() || row.serviceType.toLowerCase().includes(serviceTypeSearch.toLowerCase())
                );
                return (
                <>
                <div className="mb-3">
                  <Input
                    type="text"
                    placeholder="Search service type..."
                    value={serviceTypeSearch}
                    onChange={(e) => setServiceTypeSearch(e.target.value)}
                    className="bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-5">
                  {filteredStats.map((row: any) => {
                    const avg = Number(row.avgAttendance) || 0;
                    const attended = Number(row.totalAttended) || 0;
                    const absent = Number(row.totalAbsent) || 0;
                    const total = attended + absent || 1;
                    const pct = Math.round((attended / total) * 100);
                    return (
                      <button
                        key={row.serviceType}
                        className="w-full text-left hover:bg-slate-700/20 rounded-lg px-2 py-2 -mx-2 transition-colors"
                        onClick={() => setSelectedServiceType(row.serviceType)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-white font-semibold">{row.serviceType}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-500">{row.totalServices} service{Number(row.totalServices) !== 1 ? 's' : ''}</span>
                            <span className="text-emerald-400 font-bold">{avg} avg</span>
                            <span className="text-violet-400 font-bold">{pct}% rate</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #8b5cf6, #10b981)' }}
                          />
                        </div>
                        <div className="flex gap-3 mt-1 text-xs">
                          <span><span className="text-emerald-400 font-medium">{attended}</span> <span className="text-slate-600">attended</span></span>
                          <span><span className="text-rose-400 font-medium">{absent}</span> <span className="text-slate-600">absent</span></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Service Type Detail Modal */}
          {selectedServiceType && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedServiceType(null)}>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                  <div>
                    <p className="text-white font-semibold text-lg">{selectedServiceType}</p>
                    <p className="text-xs text-slate-500">Individual services in this period</p>
                  </div>
                  <button onClick={() => setSelectedServiceType(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>
                <div className="overflow-y-auto max-h-[60vh] p-5 space-y-3">
                  {timeSeriesData
                    .filter((s) => s.serviceType === selectedServiceType)
                    .map((service, idx) => {
                      const sAttended = (service.attended || 0) + (service.late || 0);
                      const sTotal = sAttended + (service.absent || 0);
                      const sPct = sTotal > 0 ? Math.round((sAttended / sTotal) * 100) : 0;
                      return (
                        <button
                          key={idx}
                          className="w-full text-left rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 hover:border-slate-600 transition-colors"
                          onClick={() => { setPinnedTooltip(service); setSelectedServiceType(null); }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">
                              {new Date(service.serviceDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-violet-400 font-bold">{sPct}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-700/50 overflow-hidden mb-2">
                            <div className="h-full rounded-full" style={{ width: `${sPct}%`, background: 'linear-gradient(90deg, #8b5cf6, #10b981)' }} />
                          </div>
                          <div className="flex gap-4 text-xs">
                            <span><span className="text-emerald-400 font-medium">{sAttended}</span> <span className="text-slate-600">attended</span></span>
                            <span><span className="text-rose-400 font-medium">{service.absent || 0}</span> <span className="text-slate-600">absent</span></span>
                            {service.branchName && <span className="text-slate-600 ml-auto">{service.branchName}</span>}
                          </div>
                        </button>
                      );
                    })}
                  {timeSeriesData.filter((s) => s.serviceType === selectedServiceType).length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-6">No services found for this type</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detailed Attendance Records - Members only */}
      {isMember && filteredDetailedRecords.length > 0 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">{isMember ? 'Your Service History' : 'Detailed Attendance Records'}</CardTitle>
            <p className="text-sm text-slate-400">
              {isMember 
                ? `Your check-ins and absences (${filteredDetailedRecords.length} records)`
                : `All attendance records for the selected period (${filteredDetailedRecords.length} records)`
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2 font-medium text-slate-400">Date</th>
                    <th className="text-left p-2 font-medium text-slate-400">Service Type</th>
                    {!isMember && <th className="text-left p-2 font-medium text-slate-400">Member Name</th>}
                    <th className="text-left p-2 font-medium text-slate-400">Fellowship/Department</th>
                    <th className="text-left p-2 font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetailedRecords.map((record, idx) => (
                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-2 text-slate-300">
                        {new Date(record.serviceDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-2 text-slate-300">{record.serviceType}</td>
                      {!isMember && (
                        <td className="p-2 font-medium text-white">
                          {record.memberFirstName} {record.memberLastName}
                        </td>
                      )}
                      <td className="p-2 text-slate-300">
                        {record.fellowshipName && <span>{record.fellowshipName}</span>}
                      </td>
                      <td className="p-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            record.attendanceStatus === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : record.attendanceStatus === 'Late'
                                ? 'bg-amber-500/20 text-amber-400'
                                : record.attendanceStatus === 'Virtual'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {record.attendanceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pinned Tooltip with Working Search */}
      {pinnedTooltip && !isMember && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setPinnedTooltip(null);
            setTooltipSearchTerm('');
          }}
        >
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{pinnedTooltip.serviceType}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(pinnedTooltip.serviceDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {pinnedTooltip.branchName && ` • ${pinnedTooltip.branchName}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setPinnedTooltip(null);
                  setTooltipSearchTerm('');
                }}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{pinnedTooltip.attended}</div>
                  <div className="text-xs text-muted-foreground">Attended</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{pinnedTooltip.onTime}</div>
                  <div className="text-xs text-muted-foreground">On Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{pinnedTooltip.late}</div>
                  <div className="text-xs text-muted-foreground">Late</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-600">{pinnedTooltip.absent}</div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Search members by name..."
                  className="mb-3"
                  value={tooltipSearchTerm}
                  onChange={(e) => setTooltipSearchTerm(e.target.value)}
                  autoFocus
                />
                
                <h3 className="font-semibold text-sm">
                  Members ({(() => {
                    const records = pinnedTooltip.records || [];
                    if (!tooltipSearchTerm) return records.length;
                    return records.filter((record: any) => {
                      const fullName = `${record.memberFirstName} ${record.memberLastName}`.toLowerCase();
                      return fullName.includes(tooltipSearchTerm.toLowerCase());
                    }).length;
                  })()})
                </h3>
                
                {(() => {
                  const records = pinnedTooltip.records || [];
                  const filtered = tooltipSearchTerm
                    ? records.filter((record: any) => {
                        const fullName = `${record.memberFirstName} ${record.memberLastName}`.toLowerCase();
                        return fullName.includes(tooltipSearchTerm.toLowerCase());
                      })
                    : records;
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center border-2 border-dashed rounded">
                        <p className="text-sm text-muted-foreground">No members found matching "{tooltipSearchTerm}"</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {filtered.map((record: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded border text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{record.memberFirstName} {record.memberLastName}</div>
                            <div className="text-xs text-muted-foreground">
                              {record.memberEmail || 'No email'}
                              {record.fellowshipName && ` • ${record.fellowshipName}`}
                            </div>
                          </div>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                              record.attendanceStatus === 'Present'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : record.attendanceStatus === 'Late'
                                  ? 'bg-amber-500/15 text-amber-600'
                                  : record.attendanceStatus === 'Virtual'
                                    ? 'bg-blue-500/15 text-blue-600'
                                    : 'bg-rose-500/15 text-rose-600'
                            }`}
                          >
                            {record.attendanceStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Details Modal */}
      {selectedService && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedService(null);
            setMemberSearchTerm('');
          }}
        >
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedService.serviceType}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedService.serviceDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {selectedService.branchName && ` • ${selectedService.branchName}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedService(null);
                  setMemberSearchTerm('');
                }}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{selectedService.attended}</div>
                  <div className="text-xs text-muted-foreground">Attended</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{selectedService.onTime}</div>
                  <div className="text-xs text-muted-foreground">On Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{selectedService.late}</div>
                  <div className="text-xs text-muted-foreground">Late</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-600">{selectedService.absent}</div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">
                    Members ({(() => {
                      const records = selectedService.records || [];
                      if (!memberSearchTerm) return records.length;
                      return records.filter((record: any) => {
                        const fullName = `${record.memberFirstName} ${record.memberLastName}`.toLowerCase();
                        const email = (record.memberEmail || '').toLowerCase();
                        return fullName.includes(memberSearchTerm.toLowerCase()) || email.includes(memberSearchTerm.toLowerCase());
                      }).length;
                    })()})
                  </h3>
                </div>
                
                {/* Search Bar */}
                <Input
                  type="text"
                  placeholder="Search members by name or email..."
                  className="mb-3"
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                />

                {selectedService.records && selectedService.records.length > 0 ? (
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {(() => {
                      const records = selectedService.records || [];
                      const filtered = memberSearchTerm
                        ? records.filter((record: any) => {
                            const fullName = `${record.memberFirstName} ${record.memberLastName}`.toLowerCase();
                            const email = (record.memberEmail || '').toLowerCase();
                            return fullName.includes(memberSearchTerm.toLowerCase()) || email.includes(memberSearchTerm.toLowerCase());
                          })
                        : records;
                      
                      if (filtered.length === 0) {
                        return (
                          <div className="py-8 text-center border-2 border-dashed rounded">
                            <p className="text-sm text-muted-foreground">No members found matching "{memberSearchTerm}"</p>
                          </div>
                        );
                      }
                      
                      return filtered.map((record: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded border text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{record.memberFirstName} {record.memberLastName}</div>
                            <div className="text-xs text-muted-foreground">
                              {record.memberEmail || 'No email'}
                              {record.fellowshipName && ` • ${record.fellowshipName}`}
                            </div>
                          </div>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                              record.attendanceStatus === 'Present'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : record.attendanceStatus === 'Late'
                                  ? 'bg-amber-500/15 text-amber-600'
                                  : record.attendanceStatus === 'Virtual'
                                    ? 'bg-blue-500/15 text-blue-600'
                                    : 'bg-rose-500/15 text-rose-600'
                            }`}
                          >
                            {record.attendanceStatus}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed rounded">
                    <svg className="h-12 w-12 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium mb-1">
                      No attendance records found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No members were recorded for this service.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
