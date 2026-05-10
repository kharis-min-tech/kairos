'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, Label, Input, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kairos/ui';
import { DatePicker } from '@/components/date-picker';
import { useAuthStore } from '@/lib/auth-store';

interface ConversionMetrics {
  totalSouls: number;
  conversionRate?: number;
  avgDaysToConversion?: number | null;
  statusCounts?: Record<string, number>;
  dropOffRates?: Record<string, number>;
}

export default function OutreachReportsPage() {
  const api = useApi();
  const { activeRole } = useAuthStore();

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    outreachId: '',
    branchId: '',
  });

  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Array<{ id: string; programName: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; branchName: string }>>([]);

  useEffect(() => {
    if (api) {
      fetchPrograms();
      if (activeRole === 'admin') {
        fetchBranches();
      }
      fetchMetrics();
    }
  }, [api]);

  const fetchPrograms = async () => {
    if (!api) return;
    try {
      const response = await api.outreach.programs.list({ page: 1, limit: 100 });
      if (response.success) {
        setPrograms(response.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    }
  };

  const fetchBranches = async () => {
    if (!api) return;
    try {
      const response = await api.branches.list();
      if (response.success) {
        setBranches(response.data ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchMetrics = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const response = await api.outreach.reports.conversionFunnel(filters);
      if (response.success) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchMetrics();
  };

  const statusOrder = ['New', 'Following Up', 'Interested', 'Converted'];
  const statusColors: Record<string, string> = {
    'New': 'bg-blue-500',
    'Following Up': 'bg-yellow-500',
    'Interested': 'bg-purple-500',
    'Converted': 'bg-green-500',
    'Not Interested': 'bg-gray-400',
    'Lost Contact': 'bg-red-400',
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conversion Funnel Report</h1>
        <p className="text-muted-foreground">Track soul progression through the evangelism pipeline</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => setFilters({ ...filters, startDate: date })}
              />
            </div>

            <div className="space-y-2">
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters({ ...filters, endDate: date })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Outreach Program</Label>
              <Select
                value={filters.outreachId}
                onValueChange={(value) => setFilters({ ...filters, outreachId: value })}
              >
                <SelectTrigger id="program">
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All programs</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.programName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeRole === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={filters.branchId}
                  onValueChange={(value) => setFilters({ ...filters, branchId: value })}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button onClick={handleApplyFilters} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Souls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{metrics.totalSouls || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-emerald-600">
                  {metrics.conversionRate !== undefined ? `${metrics.conversionRate}%` : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Days to Convert</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {metrics.avgDaysToConversion !== undefined && metrics.avgDaysToConversion !== null
                    ? Math.round(metrics.avgDaysToConversion)
                    : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusOrder.map((status) => {
                const count = metrics.statusCounts?.[status] || 0;
                const percentage = metrics.totalSouls > 0
                  ? ((count / metrics.totalSouls) * 100).toFixed(1)
                  : '0';
                const width = metrics.totalSouls > 0
                  ? (count / metrics.totalSouls) * 100
                  : 0;

                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{status}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${statusColors[status]} transition-all duration-500 flex items-center justify-end px-3`}
                        style={{ width: `${width}%` }}
                      >
                        {width > 15 && (
                          <span className="text-white text-sm font-medium">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {metrics.statusCounts && (
                <div className="pt-4 mt-4 space-y-2">
                  <p className="text-sm font-medium">Other Statuses</p>
                  {Object.entries(metrics.statusCounts)
                    .filter(([status]) => !statusOrder.includes(status))
                    .map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span>{status}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {metrics.dropOffRates && Object.keys(metrics.dropOffRates).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Drop-off Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.dropOffRates).map(([transition, rate]) => (
                    <div key={transition} className="flex items-center justify-between text-sm">
                      <span>{transition}</span>
                      <span className={rate > 50 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                        {rate}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!metrics && !loading && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No data available. Apply filters to view metrics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
