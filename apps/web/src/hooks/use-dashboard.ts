import { useQuery } from '@tanstack/react-query';
import { dashboard } from '@kairos/api-client';
import type { AdminDashboard, PastorDashboard, LeaderDashboard } from '@kairos/api-client';

export const dashboardKeys = {
  admin: ['dashboard', 'admin'] as const,
  pastor: ['dashboard', 'pastor'] as const,
  leader: ['dashboard', 'leader'] as const,
};

export function useAdminDashboard() {
  return useQuery<AdminDashboard>({
    queryKey: dashboardKeys.admin,
    queryFn: () => dashboard.getAdmin(),
  });
}

export function usePastorDashboard() {
  return useQuery<PastorDashboard>({
    queryKey: dashboardKeys.pastor,
    queryFn: () => dashboard.getPastor(),
  });
}

export function useLeaderDashboard() {
  return useQuery<LeaderDashboard>({
    queryKey: dashboardKeys.leader,
    queryFn: () => dashboard.getLeader(),
  });
}
