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

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const dateParams = dateFrom && dateTo ? { dateFrom, dateTo } : undefined;
      const [overviewRes, analyticsRes, followUpRes, soulsRes, followUpsRes] = await Promise.all([
        api.dashboard.overview(dateParams),
        api.dashboard.analytics(dateParams),
        api.dashboard.followUpsOverview(dateParams),
        api.dashboard.souls({ limit: 1000, ...(dateParams ?? {}) }),
        api.dashboard.followUps({ limit: 1000, ...(dateParams ?? {}) }),
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
  }, [api, dateFrom, dateTo]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleDateRangeChange = useCallback((from: string | null, to: string | null) => {
    setDateFrom(from);
    setDateTo(to);
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
      isRefreshing={loading}
    />
  );
}
