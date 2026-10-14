'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useEnrollments } from '@/hooks/use-new-believers';
import type { NewBelieverEnrollmentWithMember, NewBelieverStageValue } from '@kairos/types';
import { getSessionStageDef } from './session-helpers';
import { useTranslation } from 'react-i18next';

interface Props {
  branchId: string;
  sessionStage: NewBelieverStageValue;
}

export function RosterTab({ branchId, sessionStage }: Props) {  const { t } = useTranslation(['newBelievers', 'common']);

  const stageDef = getSessionStageDef(sessionStage);
  const { data, isLoading } = useEnrollments(
    { branchId, stage: sessionStage, limit: 500 },
    { enabled: !!branchId },
  );

  const enrolled = useMemo(
    () =>
      ((data?.data ?? []) as NewBelieverEnrollmentWithMember[])
        .filter((enrollment) => enrollment.isActive)
        .sort((a, b) => {
          const last = a.memberLastName.localeCompare(b.memberLastName);
          return last !== 0 ? last : a.memberFirstName.localeCompare(b.memberFirstName);
        }),
    [data?.data],
  );

  if (isLoading) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{t('newBelievers:loadingRoster')}</p>
    );
  }

  if (enrolled.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t('newBelievers:noActiveEnrollmentsAt', {
          stage: stageDef?.label ?? t('newBelievers:thisStage'),
        })}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('newBelievers:showingActiveEnrollmentsAt', {
          count: enrolled.length,
          stage: stageDef?.label ?? sessionStage,
        })}
      </p>
      <div className="overflow-hidden rounded-lg border border-input/10">
        {enrolled.map((enrollment) => (
          <div
            key={enrollment.id}
            className="flex items-center justify-between gap-3 border-b border-input/10 bg-background px-3 py-2.5 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5D3FD3]/10 text-[#5D3FD3]">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {enrollment.memberFirstName} {enrollment.memberLastName}
                </p>
                {enrollment.teacherFirstName && (
                  <p className="text-xs text-muted-foreground">
                    Teacher: {enrollment.teacherFirstName} {enrollment.teacherLastName ?? ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
