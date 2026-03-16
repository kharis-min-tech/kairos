import { LoadingSkeleton } from '@/components/shared';

export default function MembersLoading() {
  return <LoadingSkeleton variant="table" count={8} />;
}
