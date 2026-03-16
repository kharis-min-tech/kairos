import { LoadingSkeleton } from '@/components/shared';

export default function DonationsLoading() {
  return <LoadingSkeleton variant="cards" count={4} />;
}
