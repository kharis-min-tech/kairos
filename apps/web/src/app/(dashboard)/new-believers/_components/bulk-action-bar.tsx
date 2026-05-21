'use client';

import { Button, CustomSelect } from '@kairos/ui';
import { STAGES, MAX_BULK_SELECT } from './stage-config';
import type { NewBelieverStageValue } from '@kairos/types';

interface BulkActionBarProps {
  selectedCount: number;
  targetStage: NewBelieverStageValue | '';
  onTargetStageChange: (value: NewBelieverStageValue | '') => void;
  onAdvance: () => void;
  onClear: () => void;
  isAdvancing: boolean;
  requiresIndividualFeedback?: boolean;
}

export function BulkActionBar({
  selectedCount,
  targetStage,
  onTargetStageChange,
  onAdvance,
  onClear,
  isAdvancing,
  requiresIndividualFeedback = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const atCap = selectedCount >= MAX_BULK_SELECT;

  return (
    <div
      className="sticky top-0 z-20 bg-card border rounded-xl p-3 shadow-sm flex items-center gap-3 flex-wrap"
      role="region"
      aria-label="Bulk actions"
    >
      <span className="text-sm font-semibold">
        {selectedCount} selected
        <span className="ml-1 text-muted-foreground font-normal">
          (max {MAX_BULK_SELECT})
        </span>
      </span>
      {atCap && (
        <span className="text-xs font-medium text-[#f8b537]">
          Cap reached — deselect a card to choose another.
        </span>
      )}
      {requiresIndividualFeedback && (
        <span className="text-xs font-medium text-[#f8b537]">
          Session moves need individual feedback. Open each card or drag one member at a time.
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <CustomSelect
          value={targetStage}
          onValueChange={(v) => onTargetStageChange(v as NewBelieverStageValue | '')}
          options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
          placeholder="Advance to..."
          className="w-44"
        />
        <Button
          onClick={onAdvance}
          disabled={!targetStage || isAdvancing || requiresIndividualFeedback}
          className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
        >
          {isAdvancing ? 'Advancing...' : 'Advance'}
        </Button>
        <Button variant="outline" onClick={onClear} disabled={isAdvancing}>
          Clear
        </Button>
      </div>
    </div>
  );
}
