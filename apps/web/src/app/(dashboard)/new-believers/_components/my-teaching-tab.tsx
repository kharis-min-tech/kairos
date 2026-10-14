'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { formatShortDate } from '@kairos/core';
import { getStageByValue } from './stage-config';
import type { EnrollmentCardData } from './types';
import { useTranslation } from 'react-i18next';

interface MyTeachingTabProps {
  enrollments: EnrollmentCardData[];
}

export function MyTeachingTab({ enrollments }: MyTeachingTabProps) {  const { t } = useTranslation(['newBelievers', 'common']);

  if (enrollments.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed p-8 text-center"
        role="status"
      >
        <GraduationCap className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">{t('newBelievers:youAreNotCurrentlyAssignedAs')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('newBelievers:speakToYourNbDepartmentLeader')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label={t('newBelievers:enrollmentsITeach')}>
      {enrollments.map((e) => {
        const stage = getStageByValue(e.stage);
        return (
          <li key={e.id}>
            <Link
              href={`/new-believers/${e.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:bg-foreground/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {e.memberFirstName} {e.memberLastName}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${stage?.dotColor ?? 'bg-slate-400'}`}
                      aria-hidden
                    />
                    {stage?.label ?? e.stage}
                  </span>
                  <span aria-hidden>·</span>
                  <span>Updated {formatShortDate(e.updatedAt)}</span>
                </div>
              </div>
              <span
                className="text-xs font-medium text-[#5D3FD3] hover:underline"
                aria-hidden
              >{t('newBelievers:open')}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
