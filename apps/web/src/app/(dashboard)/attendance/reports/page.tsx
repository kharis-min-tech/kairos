'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, SelectInput, DatePicker, Alert, Spinner, Card, CardHeader, CardBody } from '@/components/ui';
import { AttendanceChart } from '@/components/dashboard/attendance-chart';
import { useAuth } from '@/lib/auth';
import { attendance, branches } from '@kairos/api-client';
import type { BranchWithRegion } from '@kairos/types';

interface TrendPoint { week: string; percentage: number; }
interface MissingMember { memberId: string; memberName: string; lastAttendanceDate: string | null; missedCount: number; }

export default function AttendanceReportsPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';
  const [branchList, setBranchList] = useState<BranchWithRegion[]>([]);
  const [branchFilter, setBranchFilter] = useState(isPastor && user?.branchId ? user.branchId : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [missingMembers, setMissingMembers] = useState<MissingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isPastor) {
      branches.list().then((res) => setBranchList(res.data ?? [])).catch(() => {});
    }
  }, [isPastor]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number | undefined> = {};
      if (branchFilter) params.branchId = branchFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [trendsRes, missingRes] = await Promise.all([
        attendance.getTrends(params),
        attendance.getMissingMembers(params),
      ]);
      setTrends((trendsRes.data as TrendPoint[]) ?? []);
      setMissingMembers((missingRes.data as MissingMember[]) ?? []);
    } catch {
      setError('Failed to load attendance reports.');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (branchFilter) params.branchId = branchFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await attendance.export(params);
      if (res.data?.url) window.open(res.data.url, '_blank');
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

  return (
    <>
      <Breadcrumbs items={[{ label: 'Attendance', href: '/attendance' }, { label: 'Reports' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          <Download size={16} className="mr-2" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-medium text-gray-700">Filters</h2></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!isPastor && (
              <SelectInput
                label="Branch"
                name="branchFilter"
                options={branchList.map((b) => ({ value: String(b.id), label: b.branchName }))}
                placeholder="All Branches"
                value={String(branchFilter)}
                onChange={(e) => setBranchFilter(e.target.value)}
              />
            )}
            <DatePicker label="Start Date" name="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <DatePicker label="End Date" name="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-medium text-gray-700">Attendance Trends (Last 8 Weeks)</h2></CardHeader>
            <CardBody>
              <AttendanceChart data={trends} height={250} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="text-sm font-medium text-gray-700">
                  Members Missing 4+ Consecutive Services ({missingMembers.length})
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              {missingMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No members with 4+ consecutive absences.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Member</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Last Attended</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Missed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingMembers.map((m) => (
                        <tr key={m.memberId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-900">{m.memberName}</td>
                          <td className="py-2 px-3 text-gray-600">{formatDate(m.lastAttendanceDate)}</td>
                          <td className="py-2 px-3">
                            <span className="text-red-600 font-medium">{m.missedCount} services</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
