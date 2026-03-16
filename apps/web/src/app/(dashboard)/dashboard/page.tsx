'use client';

import { useAuth } from '@/lib/auth';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { PastorDashboard } from '@/components/dashboard/pastor-dashboard';
import { LeaderDashboard } from '@/components/dashboard/leader-dashboard';
import { PageHeader } from '@/components/shared';
import { Spinner } from '@/components/ui';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const role = user?.role;
  const greeting = user?.email ? `Welcome back` : 'Dashboard';

  return (
    <div className="space-y-6">
      <PageHeader title={greeting} description="Here's what's happening across your church." className="hidden lg:flex" />
      {role === 'Admin' && <AdminDashboard />}
      {role === 'Pastor' && <PastorDashboard />}
      {(role === 'Leader' || role === 'Member') && <LeaderDashboard />}
      {!role && (
        <p className="text-muted-foreground">Welcome to Kairos Church Administration.</p>
      )}
    </div>
  );
}
