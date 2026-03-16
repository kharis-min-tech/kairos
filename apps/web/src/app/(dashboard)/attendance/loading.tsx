import { LoadingSkeleton } from '@/components/shared';

export default function AttendanceLoading() {
  return <LoadingSkeleton variant="cards" count={4} />;
}
