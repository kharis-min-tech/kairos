'use client';

import { useState } from 'react';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Badge } from '@kairos/ui';
import type { NewBelieverSession, NewBelieverStageValue } from '@kairos/types';
import { useCapabilities } from '@/hooks/use-capabilities';
import { AttendanceTab } from './attendance-tab';
import { NotesTab } from './notes-tab';
import { RosterTab } from './roster-tab';
import {
  formatSessionDate,
  formatSessionTime,
  getSessionStageDef,
  isUpcomingSession,
  teacherName,
} from './session-helpers';

type Tab = 'attendance' | 'notes' | 'roster';

interface Props {
  session: NewBelieverSession;
  branchId: string;
  userMemberId: string;
}

export function SessionDetailPane({ session, branchId, userMemberId }: Props) {
  const caps = useCapabilities();
  const [tab, setTab] = useState<Tab>('attendance');
  const stageDef = getSessionStageDef(session.sessionStage);
  const upcoming = isUpcomingSession(session.sessionDate);
  const status = upcoming ? 'Upcoming' : 'Past';

  // Mirrors the server gate in apps/api/src/new-believers/service.ts: the
  // session's own teacher, or anyone holding branch:read.
  //
  // This used to compare a role string against 'admin' | 'pastor' | 'leader'.
  // SystemRole has only been 'admin' | 'member' since the RBAC rebuild, so the
  // pastor and leader branches were dead and a branch pastor could neither
  // edit session notes nor record attendance unless they happened to be the
  // teacher. Authority comes from capabilities, never from a role name.
  const isTeacherOfSession = !!session.teacherId && session.teacherId === userMemberId;
  const canEditNotes = isTeacherOfSession || caps.has('branch:read');
  const canRecordAttendance = canEditNotes || caps.has('newbelievers:teach');

  return (
    <div className="rounded-xl border border-input/10 bg-card shadow-ambient">
      <div className="border-b border-foreground/10 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {stageDef && (
            <Badge
              variant="outline"
              className="border-[#5D3FD3]/30 bg-[#5D3FD3]/10 text-[#5D3FD3]"
            >
              {stageDef.label}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              upcoming
                ? 'border-[#5D3FD3]/30 bg-[#5D3FD3]/10 text-[#5D3FD3]'
                : 'border-foreground/10 bg-muted text-muted-foreground'
            }
          >
            {status}
          </Badge>
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{session.topic}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatSessionDate(session.sessionDate)}
            <span aria-hidden="true">·</span>
            {formatSessionTime(session.sessionDate)}
          </span>
          {session.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {session.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {teacherName(session)}
          </span>
        </div>
      </div>

      <div className="border-b border-foreground/10 px-5">
        <nav className="-mb-px flex gap-4" aria-label="Session detail tabs">
          {[
            { value: 'attendance', label: 'Attendance' },
            { value: 'notes', label: 'Notes' },
            { value: 'roster', label: 'Roster' },
          ].map((option) => {
            const isActive = tab === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(option.value as Tab)}
                className={[
                  'border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-[#5D3FD3] text-[#5D3FD3]'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {option.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-5 py-5">
        {tab === 'attendance' && (
          <AttendanceTab
            session={session}
            branchId={branchId}
            canRecordAttendance={canRecordAttendance}
          />
        )}
        {tab === 'notes' && <NotesTab session={session} canEdit={canEditNotes} />}
        {tab === 'roster' && (
          <RosterTab
            branchId={branchId}
            sessionStage={session.sessionStage as NewBelieverStageValue}
          />
        )}
      </div>
    </div>
  );
}
