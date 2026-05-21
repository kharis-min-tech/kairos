'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@/lib/api-client';
import { UnifiedDashboard } from '@/components/dashboard/unified-dashboard';
import type { DashboardOverview, DashboardAnalytics, FollowUpOverviewData, PaginatedDashboardData, DashboardSoul, DashboardFollowUp } from '@/components/dashboard/types';
import { Loader2 } from 'lucide-react';

export default function SoulsDashboardPage() {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [followUpOverview, setFollowUpOverview] = useState<FollowUpOverviewData | null>(null);
  const [soulsData, setSoulsData] = useState<PaginatedDashboardData<DashboardSoul> | null>(null);
  const [followUpsData, setFollowUpsData] = useState<PaginatedDashboardData<DashboardFollowUp> | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Array<{ id: string; programName: string }>>([]);

  // Load outreach programs for the filter dropdown (once on mount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.outreach.programs.list({ page: 1, limit: 200 });
        if (cancelled) return;
        if (res.success && res.data) {
          const items = (res.data.data ?? []) as Array<{ id: string; programName: string }>;
          setPrograms(items.map((p) => ({ id: p.id, programName: p.programName })));
        }
      } catch (error) {
        console.error('Failed to load outreach programs:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const baseParams: { dateFrom?: string; dateTo?: string; programId?: string } = {};
      if (dateFrom && dateTo) {
        baseParams.dateFrom = dateFrom;
        baseParams.dateTo = dateTo;
      }
      if (programId) {
        baseParams.programId = programId;
      }
      const hasParams = Object.keys(baseParams).length > 0;
      const params = hasParams ? baseParams : undefined;
      const [overviewRes, analyticsRes, followUpRes, soulsRes, followUpsRes] = await Promise.all([
        api.dashboard.overview(params),
        api.dashboard.analytics(params),
        api.dashboard.followUpsOverview(params),
        api.dashboard.souls({ limit: 1000, ...baseParams }),
        api.dashboard.followUps({ limit: 1000, ...baseParams }),
      ]);

      if (overviewRes.success) {
        setOverview(overviewRes.data);
      }
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
      if (followUpRes.success) {
        setFollowUpOverview(followUpRes.data);
      }
      if (soulsRes.success && soulsRes.data) {
        setSoulsData(soulsRes.data);
      }
      if (followUpsRes.success && followUpsRes.data) {
        setFollowUpsData(followUpsRes.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [api, dateFrom, dateTo, programId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleDateRangeChange = useCallback((from: string | null, to: string | null) => {
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const handleProgramChange = useCallback((id: string | null) => {
    setProgramId(id);
  }, []);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedDashboard
      overview={overview}
      analytics={analytics}
      followUpOverview={followUpOverview}
      soulsData={soulsData}
      followUpsData={followUpsData}
      onRefresh={loadDashboardData}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateRangeChange={handleDateRangeChange}
      programId={programId}
      onProgramChange={handleProgramChange}
      programs={programs}
      isRefreshing={loading}
    />
  );
}
