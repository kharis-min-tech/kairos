'use client';

import { Breadcrumbs } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { PastorDashboard } from '@/components/dashboard/pastor-dashboard';
import { LeaderDashboard } from '@/components/dashboard/leader-dashboard';
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

  return (
    <>
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      {role === 'Admin' && <AdminDashboard />}
      {role === 'Pastor' && <PastorDashboard />}
      {(role === 'Leader' || role === 'Member') && <LeaderDashboard />}
      {!role && (
        <p className="text-gray-500">Welcome to Kairos Church Administration.</p>
      )}
    </>
  );
}
