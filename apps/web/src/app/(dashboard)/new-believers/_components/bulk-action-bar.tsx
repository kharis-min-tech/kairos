'use client';

import { Button, CustomSelect } from '@kairos/ui';
import { STAGES, MAX_BULK_SELECT } from './stage-config';
import type { NewBelieverStageValue } from '@kairos/types';
import { useTranslation } from 'react-i18next';

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
}: BulkActionBarProps) {  const { t } = useTranslation(['newBelievers', 'common']);

  if (selectedCount === 0) return null;

  const atCap = selectedCount >= MAX_BULK_SELECT;

  return (
    <div
      className="sticky top-0 z-20 bg-card border rounded-xl p-3 shadow-sm flex items-center gap-3 flex-wrap"
      role="region"
      aria-label={t('newBelievers:bulkActions')}
    >
      <span className="text-sm font-semibold">
        {selectedCount} selected
        <span className="ml-1 text-muted-foreground font-normal">
          (max {MAX_BULK_SELECT})
        </span>
      </span>
      {atCap && (
        <span className="text-xs font-medium text-[#f8b537]">{t('newBelievers:capReachedDeselectACardTo')}</span>
      )}
      {requiresIndividualFeedback && (
        <span className="text-xs font-medium text-[#f8b537]">{t('newBelievers:sessionMovesNeedIndividualFeedbackOpen')}</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <CustomSelect
          value={targetStage}
          onValueChange={(v) => onTargetStageChange(v as NewBelieverStageValue | '')}
          options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
          placeholder={t('newBelievers:advanceTo')}
          className="w-44"
        />
        <Button
          onClick={onAdvance}
          disabled={!targetStage || isAdvancing || requiresIndividualFeedback}
          className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
        >
          {isAdvancing ? 'Advancing...' : 'Advance'}
        </Button>
        <Button variant="outline" onClick={onClear} disabled={isAdvancing}>{t('newBelievers:clear')}</Button>
      </div>
    </div>
  );
}
