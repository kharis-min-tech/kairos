'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, analyticsRes, followUpRes, soulsRes, followUpsRes] = await Promise.all([
        api.dashboard.overview(),
        api.dashboard.analytics(),
        api.dashboard.followUpsOverview(),
        api.dashboard.souls({ limit: 1000 }),
        api.dashboard.followUps({ limit: 1000 }),
      ]);

      console.log('Dashboard API Responses:', {
        overview: overviewRes,
        analytics: analyticsRes,
        followUp: followUpRes,
        souls: soulsRes,
        followUps: followUpsRes,
      });

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
  };

  if (loading) {
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
    />
  );
}
