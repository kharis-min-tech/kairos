import { cn } from '@kairos/ui';
import type { ServiceAttendanceStatus } from '@kairos/types';

/** Modern Sanctuary status colours: Present green, Late gold, Virtual purple. */
export const STATUS_STYLES: Record<ServiceAttendanceStatus, string> = {
  Present: 'bg-[#16A34A]/15 text-[#16A34A]',
  Late: 'bg-[#f8b537]/20 text-[#a07720] dark:text-[#f8b537]',
  Virtual: 'bg-[#5D3FD3]/15 text-[#5D3FD3] dark:text-[#a392ed]',
};

export function StatusChip({ status }: { status: ServiceAttendanceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
