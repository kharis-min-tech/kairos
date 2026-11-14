'use client';

import { Search } from 'lucide-react';
import { Button, Input } from '@kairos/ui';
import { STAGES, stageLabel } from './stage-config';
import type { NewBelieverStageValue } from '@kairos/types';
import { useTranslation } from 'react-i18next';
import { localiseOptions } from '@/lib/localise-options';

export type EnrollmentSortOption = 'date-added' | 'name' | 'last-activity';

interface PipelineToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterStage: NewBelieverStageValue | '';
  onFilterStageChange: (value: NewBelieverStageValue | '') => void;
  sortBy: EnrollmentSortOption;
  onSortChange: (value: EnrollmentSortOption) => void;
  /** Counts per stage for the chip badges. */
  countsByStage: Record<string, number>;
  totalCount: number;
  /** When true, render the Select / Deselect All controls. */
  canBulkSelect?: boolean;
  hasSelection?: boolean;
  onSelectAllVisible?: () => void;
  onDeselectAll?: () => void;
}

// i18n-ignore(5): the English source; `newBelievers:sortBy_<value>` holds the display
// text and `localiseOptions` swaps it in at the render site.
const SORT_OPTIONS: { value: EnrollmentSortOption; label: string }[] = [
  { value: 'date-added', label: 'Date Added' },
  { value: 'name', label: 'Name' },
  { value: 'last-activity', label: 'Last Activity' },
];

export function PipelineToolbar({
  search,
  onSearchChange,
  filterStage,
  onFilterStageChange,
  sortBy,
  onSortChange,
  countsByStage,
  totalCount,
  canBulkSelect = false,
  hasSelection = false,
  onSelectAllVisible,
  onDeselectAll,
}: PipelineToolbarProps) {  const { t } = useTranslation(['newBelievers', 'common']);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('newBelievers:searchByMemberOrTeacherName')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            aria-label={t('newBelievers:searchEnrollments')}
          />
        </div>
        {canBulkSelect && totalCount > 0 && (
          <div className="flex gap-2">
            {onSelectAllVisible && (
              <Button variant="outline" size="sm" onClick={onSelectAllVisible}>{t('newBelievers:selectAll')}</Button>
            )}
            {hasSelection && onDeselectAll && (
              <Button variant="outline" size="sm" onClick={onDeselectAll}>{t('newBelievers:deselectAll')}</Button>
            )}
          </div>
        )}
      </div>

      {/* Stage chips + Sort segmented control */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-xl bg-[#f0f0f3] p-1 dark:bg-white/[0.06] flex-wrap">
          <button
            type="button"
            onClick={() => onFilterStageChange('')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              filterStage === ''
                ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >{t('newBelievers:all')}<span className={`${filterStage === '' ? 'opacity-60' : 'opacity-50'}`}>
              ({totalCount})
            </span>
          </button>
          {STAGES.map((s) => {
            const isActive = filterStage === s.value;
            const count = countsByStage[s.value] ?? 0;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => onFilterStageChange(isActive ? '' : s.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dotColor}`} aria-hidden />
                {stageLabel(t, s)}
                <span className={`${isActive ? 'opacity-60' : 'opacity-50'}`}>({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t('newBelievers:sort')}</span>
          <div role="tablist" aria-label={t('newBelievers:sortEnrollmentsBy')} className="flex rounded-xl bg-[#f0f0f3] p-1 dark:bg-white/[0.06]">
            {localiseOptions(t, 'newBelievers:sortBy_', SORT_OPTIONS).map(({ value, label }) => {
              const isActive = sortBy === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSortChange(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
