'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check } from 'lucide-react';
import { Card, CardContent } from '@kairos/ui';
import { formatShortDate } from '@kairos/core';
import { STAGES, getStaleDays } from './stage-config';
import type { EnrollmentCardData } from './types';

interface EnrollmentCardProps {
  enrollment: EnrollmentCardData;
  isDraggable: boolean;
  /** When true, the card surfaces its checkbox affordance. */
  canSelect?: boolean;
  isSelected?: boolean;
  /**
   * When true, selecting the card is suppressed (e.g. the bulk cap has been
   * reached and this card is not already selected).
   */
  selectionDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpenDrawer: (id: string) => void;
}

interface EnrollmentCardContentProps {
  enrollment: EnrollmentCardData;
  canSelect: boolean;
  isSelected: boolean;
  selectionDisabled: boolean;
  onToggleSelect?: (id: string) => void;
}

function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase() || '?';
}

function EnrollmentCardContent({
  enrollment,
  canSelect,
  isSelected,
  selectionDisabled,
  onToggleSelect,
}: EnrollmentCardContentProps) {
  const stage = STAGES.find((s) => s.value === enrollment.stage);
  const staleDays = getStaleDays(enrollment.updatedAt, enrollment.stage);

  const hasTeacher = !!(enrollment.teacherFirstName || enrollment.teacherLastName);
  const hasMentor = !!(enrollment.mentorFirstName || enrollment.mentorLastName);
  const hasSupport = hasTeacher || hasMentor;

  return (
    <CardContent className="p-3">
      <div className="flex items-start gap-2">
        {canSelect && onToggleSelect && (
          <button
            type="button"
            disabled={selectionDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!selectionDisabled) onToggleSelect(enrollment.id);
            }}
            className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-foreground/10 border border-foreground/60 shadow-[0_0_0_2px_hsl(var(--foreground)/0.15)]'
                : 'border border-foreground/30 bg-transparent hover:border-foreground/50 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
            aria-label={isSelected ? 'Deselect enrollment' : 'Select enrollment'}
            aria-pressed={isSelected}
          >
            {isSelected && <Check className="h-3 w-3 text-foreground" strokeWidth={2.5} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                stage?.dotColor ?? 'bg-slate-400'
              }`}
              aria-hidden
            />
            <p className="font-semibold leading-tight truncate">
              {enrollment.memberFirstName} {enrollment.memberLastName}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Enrolled {formatShortDate(enrollment.enrolledAt)}
          </p>
        </div>
      </div>

      <hr className="my-2.5 border-foreground/10" />

      {hasSupport ? (
        <div className="space-y-1.5">
          {hasTeacher && (
            <div className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {initials(enrollment.teacherFirstName, enrollment.teacherLastName)}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                Teacher: {enrollment.teacherFirstName} {enrollment.teacherLastName}
              </span>
            </div>
          )}
          {hasMentor && (
            <div className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {initials(enrollment.mentorFirstName, enrollment.mentorLastName)}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                Mentor: {enrollment.mentorFirstName} {enrollment.mentorLastName}
              </span>
            </div>
          )}
          {staleDays !== null && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" aria-hidden />
              <span className="text-xs font-medium text-rose-600">
                Stale: {staleDays} day{staleDays !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs italic text-muted-foreground">No support team assigned</p>
          {staleDays !== null && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" aria-hidden />
              <span className="text-xs font-medium text-rose-600">
                Stale: {staleDays} day{staleDays !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </CardContent>
  );
}

export function EnrollmentCard({
  enrollment,
  isDraggable,
  canSelect = false,
  isSelected = false,
  selectionDisabled = false,
  onToggleSelect,
  onOpenDrawer,
}: EnrollmentCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: enrollment.id,
    data: { stage: enrollment.stage },
    // Selecting anything disables drag — same convention as the souls Kanban.
    disabled: !isDraggable || isSelected,
  });

  return (
    <Card
      ref={setNodeRef}
      {...(isDraggable && !isSelected ? attributes : {})}
      {...(isDraggable && !isSelected ? listeners : {})}
      onClick={() => onOpenDrawer(enrollment.id)}
      className={`cursor-pointer hover:shadow-ambient transition-shadow select-none ${
        isDragging ? 'opacity-50' : ''
      } ${isSelected ? 'ring-2 ring-[#5D3FD3]/60' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDrawer(enrollment.id);
        }
      }}
    >
      <EnrollmentCardContent
        enrollment={enrollment}
        canSelect={canSelect}
        isSelected={isSelected}
        selectionDisabled={selectionDisabled}
        onToggleSelect={onToggleSelect}
      />
    </Card>
  );
}

export function EnrollmentCardDragPreview({
  enrollment,
}: {
  enrollment: EnrollmentCardData;
}) {
  return (
    <Card
      className="pointer-events-none w-[280px] rotate-[1deg] border-[#5D3FD3]/15 bg-background/80 opacity-80 shadow-[0_16px_34px_rgba(15,23,42,0.14)] ring-1 ring-[#5D3FD3]/10 backdrop-blur-sm"
      aria-hidden="true"
    >
      <EnrollmentCardContent
        enrollment={enrollment}
        canSelect={false}
        isSelected={false}
        selectionDisabled={false}
      />
    </Card>
  );
}
