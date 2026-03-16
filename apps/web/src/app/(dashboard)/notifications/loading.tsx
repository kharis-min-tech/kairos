import { LoadingSkeleton } from '@/components/shared';

export default function NotificationsLoading() {
  return <LoadingSkeleton variant="list" count={6} />;
}
