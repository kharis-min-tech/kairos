import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PipelineToolbar } from './pipeline-toolbar';

const defaultProps = {
  search: '',
  onSearchChange: vi.fn(),
  filterStage: '' as const,
  onFilterStageChange: vi.fn(),
  sortBy: 'date-added' as const,
  onSortChange: vi.fn(),
  countsByStage: { enrolled: 2, 'session-1': 1 } as Record<string, number>,
  totalCount: 3,
};

describe('PipelineToolbar', () => {
  it('fires onSearchChange when typing in the search input', () => {
    const onSearchChange = vi.fn();
    render(<PipelineToolbar {...defaultProps} onSearchChange={onSearchChange} />);
    const input = screen.getByLabelText(/Search enrollments/i);
    fireEvent.change(input, { target: { value: 'ada' } });
    expect(onSearchChange).toHaveBeenCalledWith('ada');
  });

  it('fires onSortChange when a sort tab is clicked', () => {
    const onSortChange = vi.fn();
    render(<PipelineToolbar {...defaultProps} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith('name');
  });

  it('marks the active sort tab with aria-selected=true', () => {
    render(<PipelineToolbar {...defaultProps} sortBy="last-activity" />);
    expect(
      screen.getByRole('tab', { name: /Last Activity/ }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tab', { name: /Date Added/ }),
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onFilterStageChange when a stage chip is clicked', () => {
    const onFilterStageChange = vi.fn();
    render(<PipelineToolbar {...defaultProps} onFilterStageChange={onFilterStageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Session 1/ }));
    expect(onFilterStageChange).toHaveBeenCalledWith('session-1');
  });

  it('clears the stage filter when the active chip is clicked again', () => {
    const onFilterStageChange = vi.fn();
    render(
      <PipelineToolbar
        {...defaultProps}
        filterStage="session-1"
        onFilterStageChange={onFilterStageChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Session 1/ }));
    expect(onFilterStageChange).toHaveBeenCalledWith('');
  });

  it('renders Select All / Deselect All only when canBulkSelect and rows exist', () => {
    const onSelectAll = vi.fn();
    const onDeselectAll = vi.fn();
    const { rerender } = render(
      <PipelineToolbar
        {...defaultProps}
        canBulkSelect
        hasSelection={false}
        onSelectAllVisible={onSelectAll}
        onDeselectAll={onDeselectAll}
      />,
    );
    expect(screen.getByRole('button', { name: /Select All/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deselect All/ })).not.toBeInTheDocument();

    rerender(
      <PipelineToolbar
        {...defaultProps}
        canBulkSelect
        hasSelection
        onSelectAllVisible={onSelectAll}
        onDeselectAll={onDeselectAll}
      />,
    );
    expect(screen.getByRole('button', { name: /Deselect All/ })).toBeInTheDocument();
  });

  it('does not render Select All when canBulkSelect is false', () => {
    render(<PipelineToolbar {...defaultProps} canBulkSelect={false} />);
    expect(screen.queryByRole('button', { name: /Select All/ })).not.toBeInTheDocument();
  });
});
