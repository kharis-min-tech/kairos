import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { StageColumn } from './stage-column';
import { STAGES } from './stage-config';
import type { EnrollmentCardData } from './types';

function renderWithDnd(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

const session1Stage = STAGES.find((s) => s.value === 'session-1')!;
const completedStage = STAGES.find((s) => s.value === 'completed')!;

function makeEnrollment(overrides: Partial<EnrollmentCardData> = {}): EnrollmentCardData {
  return {
    id: 'enr-1',
    memberId: 'm-1',
    stage: 'session-1',
    memberFirstName: 'Ada',
    memberLastName: 'Lovelace',
    enrolledAt: new Date('2026-01-15').toISOString(),
    updatedAt: new Date('2026-05-13').toISOString(),
    ...overrides,
  };
}

const baseProps = {
  stage: session1Stage,
  canDrag: true,
  canSelect: false,
  selectedIds: new Set<string>(),
  selectionAtCap: false,
  onToggleSelect: vi.fn(),
  onOpenDrawer: vi.fn(),
};

describe('StageColumn', () => {
  it('renders the stage label in uppercase styling and the topic when present', () => {
    renderWithDnd(<StageColumn {...baseProps} enrollments={[]} />);
    // The Tailwind class `uppercase` styles the label; the source text is the canonical label.
    const heading = screen.getByText(session1Stage.label);
    expect(heading).toBeInTheDocument();
    expect(heading.className).toMatch(/uppercase/);
    // Topic for session-1 is "Foundations of Faith"
    expect(screen.getByText(/Foundations of Faith/i)).toBeInTheDocument();
  });

  it('renders the colored dot for the stage', () => {
    const { container } = renderWithDnd(
      <StageColumn {...baseProps} enrollments={[]} />,
    );
    // The dot is rendered as an aria-hidden span with the stage's dotColor class
    const dot = container.querySelector(`span.${session1Stage.dotColor.replace(/\//g, '\\/')}`);
    expect(dot).not.toBeNull();
  });

  it('renders the count badge reflecting the number of enrollments', () => {
    const rows = [makeEnrollment({ id: 'a' }), makeEnrollment({ id: 'b' })];
    renderWithDnd(<StageColumn {...baseProps} enrollments={rows} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows the empty-state message when there are no enrollments', () => {
    renderWithDnd(<StageColumn {...baseProps} enrollments={[]} />);
    expect(
      screen.getByText(/No enrollments in this stage/i),
    ).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders one card per enrollment with the member name', () => {
    const rows = [
      makeEnrollment({ id: 'a', memberFirstName: 'Ada', memberLastName: 'Lovelace' }),
      makeEnrollment({ id: 'b', memberFirstName: 'Grace', memberLastName: 'Hopper' }),
      makeEnrollment({ id: 'c', memberFirstName: 'Edsger', memberLastName: 'Dijkstra' }),
    ];
    renderWithDnd(<StageColumn {...baseProps} enrollments={rows} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Edsger Dijkstra')).toBeInTheDocument();
    // Empty state should NOT appear when there are enrollments
    expect(
      screen.queryByText(/No enrollments in this stage/i),
    ).not.toBeInTheDocument();
  });

  it('clicking an enrollment card calls onOpenDrawer with that enrollment id', () => {
    const onOpenDrawer = vi.fn();
    const rows = [
      makeEnrollment({ id: 'enr-clicked', memberFirstName: 'Ada', memberLastName: 'Lovelace' }),
    ];
    renderWithDnd(
      <StageColumn {...baseProps} enrollments={rows} onOpenDrawer={onOpenDrawer} />,
    );
    fireEvent.click(screen.getByText('Ada Lovelace'));
    expect(onOpenDrawer).toHaveBeenCalledWith('enr-clicked');
  });

  it('does not render a topic line for stages without a topic', () => {
    renderWithDnd(
      <StageColumn {...baseProps} stage={completedStage} enrollments={[]} />,
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText(/Foundations of Faith/i)).not.toBeInTheDocument();
  });
});
