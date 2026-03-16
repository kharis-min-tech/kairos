import { LoadingSkeleton } from '@/components/shared';

export default function DashboardLoading() {
  return <LoadingSkeleton variant="cards" count={6} />;
}
