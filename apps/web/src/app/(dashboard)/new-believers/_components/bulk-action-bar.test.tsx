import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionBar } from './bulk-action-bar';

const baseProps = {
  selectedCount: 0,
  targetStage: '' as const,
  onTargetStageChange: vi.fn(),
  onAdvance: vi.fn(),
  onClear: vi.fn(),
  isAdvancing: false,
};

describe('BulkActionBar', () => {
  it('renders nothing when no rows are selected', () => {
    const { container } = render(<BulkActionBar {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selection count and the cap', () => {
    render(<BulkActionBar {...baseProps} selectedCount={2} />);
    expect(screen.getByText(/2 selected/)).toBeInTheDocument();
    expect(screen.getByText(/max 5/)).toBeInTheDocument();
  });

  it('disables the Advance button when no target stage is chosen', () => {
    render(<BulkActionBar {...baseProps} selectedCount={3} />);
    expect(screen.getByRole('button', { name: /^Advance$/ })).toBeDisabled();
  });

  it('enables the Advance button once a target stage is set', () => {
    render(
      <BulkActionBar
        {...baseProps}
        selectedCount={3}
        targetStage={'session-2' as never}
      />,
    );
    expect(screen.getByRole('button', { name: /^Advance$/ })).not.toBeDisabled();
  });

  it('fires onClear when Clear is clicked', () => {
    const onClear = vi.fn();
    render(<BulkActionBar {...baseProps} selectedCount={1} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('fires onAdvance when Advance is clicked', () => {
    const onAdvance = vi.fn();
    render(
      <BulkActionBar
        {...baseProps}
        selectedCount={2}
        targetStage={'session-1' as never}
        onAdvance={onAdvance}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Advance$/ }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('disables bulk advance when individual session feedback is required', () => {
    render(
      <BulkActionBar
        {...baseProps}
        selectedCount={2}
        targetStage={'session-2' as never}
        requiresIndividualFeedback
      />,
    );
    expect(screen.getByText(/Session moves need individual feedback/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Advance$/ })).toBeDisabled();
  });

  it('shows the cap hint when selectedCount === MAX_BULK_SELECT', () => {
    render(<BulkActionBar {...baseProps} selectedCount={5} />);
    expect(screen.getByText(/Cap reached/i)).toBeInTheDocument();
  });

  it('shows the advancing label and disables actions while pending', () => {
    render(
      <BulkActionBar
        {...baseProps}
        selectedCount={3}
        targetStage={'session-1' as never}
        isAdvancing
      />,
    );
    expect(screen.getByRole('button', { name: /Advancing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Clear/ })).toBeDisabled();
  });
});
