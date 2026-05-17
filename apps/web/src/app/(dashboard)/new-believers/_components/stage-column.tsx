'use client';

import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { EnrollmentCard } from './enrollment-card';
import { getNextStage, type StageDef } from './stage-config';
import type { EnrollmentCardData } from './types';

interface StageColumnProps {
  stage: StageDef;
  enrollments: EnrollmentCardData[];
  canDrag: boolean;
  canSelect: boolean;
  selectedIds: Set<string>;
  selectionAtCap: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDrawer: (id: string) => void;
}

export function StageColumn({
  stage,
  enrollments,
  canDrag,
  canSelect,
  selectedIds,
  selectionAtCap,
  onToggleSelect,
  onOpenDrawer,
}: StageColumnProps) {
  const { setNodeRef, isOver, active } = useDroppable({ id: stage.value });
  const count = enrollments.length;
  const activeStage = active?.data.current?.stage as string | undefined;
  const expectedNextStage = activeStage ? getNextStage(activeStage)?.value : undefined;
  const isValidDropTarget = isOver && expectedNextStage === stage.value;
  const isInvalidDropTarget = isOver && !!activeStage && expectedNextStage !== stage.value;

  return (
    <div className="flex-1 min-w-[280px]">
      <Card className="bg-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${stage.dotColor}`}
              aria-hidden
            />
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              {stage.label}
            </CardTitle>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded text-xs font-semibold bg-foreground/10 text-foreground/60">
              {count}
            </span>
          </div>
          {stage.topic && (
            <p className="mt-1 text-xs text-muted-foreground">{stage.topic}</p>
          )}
        </CardHeader>
        <CardContent
          ref={setNodeRef}
          className={`space-y-2 px-2 pb-2 pt-0 max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin rounded-md transition-colors ${
            isValidDropTarget
              ? 'bg-primary/5 ring-2 ring-[#5D3FD3]/35 shadow-inner'
              : isInvalidDropTarget
                ? 'bg-muted/70 ring-1 ring-foreground/10'
                : ''
          }`}
        >
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No enrollments in this stage
            </p>
          ) : (
            enrollments.map((e) => {
              const isSelected = selectedIds.has(e.id);
              return (
                <EnrollmentCard
                  key={e.id}
                  enrollment={e}
                  isDraggable={canDrag}
                  canSelect={canSelect}
                  isSelected={isSelected}
                  selectionDisabled={selectionAtCap && !isSelected}
                  onToggleSelect={onToggleSelect}
                  onOpenDrawer={onOpenDrawer}
                />
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
