'use client';

import { useState, useMemo } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, SelectInput, DatePicker, Card, CardHeader, CardContent } from '@/components/ui';
import { LoadingSkeleton } from '@/components/shared';
import { useAuth } from '@/lib/auth';
import { useAttendanceTrends, useMissingMembers } from '@/hooks/use-attendance';
import { useBranches } from '@/hooks/use-branches';
import { attendance } from '@kairos/api-client';

export default function AttendanceReportsPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';
  const [branchFilter, setBranchFilter] = useState(isPastor && user?.branchId ? user.branchId : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: branchesRes } = useBranches(!isPastor ? { limit: 100 } : undefined);
  const branchList = (branchesRes?.data ?? []) as Array<{ branchId: number; branchName: string }>;

  const trendParams = useMemo(() => {
    const p: Record<string, number | undefined> = {};
    if (branchFilter) p.branchId = Number(branchFilter);
    return p;
  }, [branchFilter]);

  const missingParams = useMemo(() => {
    const p: Record<string, number | undefined> = {};
    if (branchFilter) p.branchId = Number(branchFilter);
    return p;
  }, [branchFilter]);

  const { data: trendsRaw, isLoading: loadingTrends } = useAttendanceTrends(trendParams);
  const { data: missingRaw, isLoading: loadingMissing } = useMissingMembers(missingParams);

  // Normalize trend data — API may return wrapped or raw arrays
  const trends = Array.isArray(trendsRaw) ? trendsRaw : (trendsRaw as unknown as { trends?: Array<{ serviceDate: string; attendancePercentage: number }> })?.trends ?? [];
  const missingMembers = Array.isArray(missingRaw) ? missingRaw : (missingRaw as unknown as { missingMembers?: Array<{ memberId: number; firstName: string; lastName: string; lastAttendanceDate: string | null }> })?.missingMembers ?? [];

  const isLoading = loadingTrends || loadingMissing;

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (branchFilter) params.branchId = Number(branchFilter);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await attendance.export(params);
      if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const maxPercentage = Math.max(...trends.map((t: { attendancePercentage?: number; percentage?: number }) => t.attendancePercentage ?? t.percentage ?? 0), 100);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Attendance', href: '/attendance' }, { label: 'Reports' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download size={16} className="mr-2" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-medium text-gray-700">Filters</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!isPastor && (
              <SelectInput
                label="Branch"
                name="branchFilter"
                options={branchList.map((b) => ({ value: String(b.branchId), label: b.branchName }))}
                placeholder="All Branches"
                value={String(branchFilter)}
                onChange={(e) => setBranchFilter(e.target.value)}
              />
            )}
            <DatePicker label="Start Date" name="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <DatePicker label="End Date" name="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSkeleton variant="cards" count={2} />
      ) : (
        <div className="space-y-6">
          {/* Attendance Trends */}
          <Card>
            <CardHeader><h2 className="text-sm font-medium text-gray-700">Attendance Trends</h2></CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No trend data available.</p>
              ) : (
                <div className="space-y-2">
                  {trends.map((t: { serviceDate?: string; week?: string; attendancePercentage?: number; percentage?: number }, i: number) => {
                    const pct = t.attendancePercentage ?? t.percentage ?? 0;
                    const label = t.serviceDate
                      ? new Date(t.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      : t.week ?? `Week ${i + 1}`;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${(pct / maxPercentage) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-12 text-right">{Math.round(pct)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Missing Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="text-sm font-medium text-gray-700">
                  Members Missing 4+ Consecutive Services ({missingMembers.length})
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              {missingMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No members with 4+ consecutive absences.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Member</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Last Attended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingMembers.map((m: { memberId: number; firstName?: string; lastName?: string; memberName?: string; lastAttendanceDate?: string | null }) => (
                        <tr key={m.memberId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-900">{m.memberName ?? `${m.firstName} ${m.lastName}`}</td>
                          <td className="py-2 px-3 text-gray-600">{formatDate(m.lastAttendanceDate ?? null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
