'use client';

import type { NewBelieverSession } from '@kairos/types';
import {
  formatShortSessionDate,
  formatSessionTime,
  getSessionStageDef,
  isUpcomingSession,
} from './session-helpers';

interface Props {
  session: NewBelieverSession;
  enrolledCount?: number;
  attendanceCount?: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function SessionListItem({
  session,
  enrolledCount,
  attendanceCount,
  isSelected,
  onSelect,
}: Props) {
  const stageDef = getSessionStageDef(session.sessionStage);
  const upcoming = isUpcomingSession(session.sessionDate);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={[
        'group flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        isSelected
          ? 'border-[#5D3FD3]/30 bg-[#5D3FD3]/10'
          : 'border-transparent bg-card hover:border-[#5D3FD3]/20 hover:bg-[#5D3FD3]/5',
      ].join(' ')}
    >
      <span
        className={[
          'mt-1 inline-block h-2 w-2 shrink-0 rounded-full',
          upcoming ? 'bg-[#5D3FD3]' : 'bg-muted-foreground/40',
        ].join(' ')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {formatShortSessionDate(session.sessionDate)}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatSessionTime(session.sessionDate)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {stageDef && (
            <span className="font-medium text-[#5D3FD3]">{stageDef.label}</span>
          )}
          <span className="truncate">{session.topic}</span>
        </div>
        {(enrolledCount !== undefined || attendanceCount !== undefined) && (
          <div className="mt-1 text-xs text-muted-foreground">
            {upcoming
              ? `${enrolledCount ?? 0} enrolled`
              : `${attendanceCount ?? 0}/${enrolledCount ?? 0} attended`}
          </div>
        )}
      </div>
    </button>
  );
}
