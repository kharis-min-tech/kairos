'use client';

import { TimeSelect, cn } from '@kairos/ui';
import { MemberAvatar } from '@/components/member-avatar';
import { ServiceAttendanceStatus } from '@kairos/types';
import type { ServiceAttendanceStatus as Status } from '@kairos/types';

export interface MarkState {
  status: Status;
  arrivalTime?: string;
}

const STATUS_ORDER: Status[] = [
  ServiceAttendanceStatus.Present,
  ServiceAttendanceStatus.Late,
  ServiceAttendanceStatus.Virtual,
];

const ACTIVE_STYLES: Record<Status, string> = {
  Present: 'bg-[#16A34A] text-white',
  Late: 'bg-[#f8b537] text-[#1a1c1c]',
  Virtual: 'bg-[#5D3FD3] text-white',
};

interface RosterRowProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  mark?: MarkState;
  onSetStatus: (status: Status) => void;
  onSetArrival: (time: string) => void;
  onClear: () => void;
}

export function RosterRow({
  firstName,
  lastName,
  photoUrl,
  mark,
  onSetStatus,
  onSetArrival,
  onClear,
}: RosterRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-foreground/[0.03]">
      <MemberAvatar photoUrl={photoUrl} firstName={firstName} lastName={lastName} size="sm" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {firstName} {lastName}
      </span>

      <div className="flex items-center gap-1.5">
        {STATUS_ORDER.map((s) => {
          const active = mark?.status === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              aria-label={`Mark ${firstName} ${lastName} ${s}`}
              onClick={() => (active ? onClear() : onSetStatus(s))}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                active
                  ? ACTIVE_STYLES[s]
                  : 'bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1]',
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      {mark?.status === ServiceAttendanceStatus.Late && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Arrived</span>
          <TimeSelect
            value={mark.arrivalTime ?? ''}
            onValueChange={onSetArrival}
            allowEmpty
          />
        </div>
      )}
    </div>
  );
}
