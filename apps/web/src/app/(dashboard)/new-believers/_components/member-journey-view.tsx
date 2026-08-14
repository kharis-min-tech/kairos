'use client';

import { Card, CardContent } from '@kairos/ui';
import { Check, Award } from 'lucide-react';
import { formatShortDate } from '@kairos/core';
import { STAGES } from './stage-config';
import type { EnrollmentCardData } from './types';

interface MemberJourneyViewProps {
  enrollment: EnrollmentCardData;
}

export function MemberJourneyView({ enrollment }: MemberJourneyViewProps) {
  const currentIdx = STAGES.findIndex((s) => s.value === enrollment.stage);
  const stage = STAGES[currentIdx];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${stage?.dotColor ?? 'bg-slate-400'}`}
            aria-hidden
          />
          {stage?.label ?? enrollment.stage}
        </span>
        <span className="text-sm text-muted-foreground">
          Enrolled {formatShortDate(enrollment.enrolledAt)}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex gap-1">
          {STAGES.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-colors ${
                idx <= currentIdx ? 'bg-[#5D3FD3]' : 'bg-foreground/10'
              }`}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Session 1</span>
          <span>Joined a Department</span>
        </div>
      </div>

      {/* Journey checklist */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Your Journey</h3>
          <ol className="space-y-2">
            {STAGES.map((s, idx) => {
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isIntegrated = s.value === 'integrated';
              return (
                <li key={s.value} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent && isIntegrated
                          ? 'bg-[#f8b537] text-white'
                          : isCurrent
                            ? 'bg-[#5D3FD3] text-white'
                            : 'bg-foreground/10 text-muted-foreground'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : isCurrent && isIntegrated ? (
                      <Award className="h-3 w-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm ${
                        isCurrent
                          ? 'font-semibold text-[#5D3FD3]'
                          : isDone
                            ? 'text-muted-foreground line-through'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {s.label}
                    </p>
                    {s.topic && (
                      <p className="text-xs text-muted-foreground">{s.topic}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Support team */}
      {(enrollment.teacherFirstName || enrollment.mentorFirstName) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Your Support Team</h3>
            <dl className="space-y-2 text-sm">
              {enrollment.teacherFirstName && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Teacher</dt>
                  <dd className="font-medium">
                    {enrollment.teacherFirstName} {enrollment.teacherLastName}
                  </dd>
                </div>
              )}
              {enrollment.mentorFirstName && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Mentor</dt>
                  <dd className="font-medium">
                    {enrollment.mentorFirstName} {enrollment.mentorLastName}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
