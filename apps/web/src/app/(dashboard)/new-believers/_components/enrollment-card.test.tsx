import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { EnrollmentCard, EnrollmentCardDragPreview } from './enrollment-card';
import type { EnrollmentCardData } from './types';

function renderWithDnd(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

const baseEnrollment: EnrollmentCardData = {
  id: 'enr-1',
  memberId: 'm-1',
  stage: 'session-1',
  memberFirstName: 'Ada',
  memberLastName: 'Lovelace',
  enrolledAt: new Date('2026-01-15').toISOString(),
  updatedAt: new Date('2026-05-13').toISOString(), // 2 days ago — not stale
};

describe('EnrollmentCard', () => {
  it('renders member name and enrolment date', () => {
    renderWithDnd(
      <EnrollmentCard
        enrollment={baseEnrollment}
        isDraggable
        onOpenDrawer={() => {}}
      />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Enrolled/)).toBeInTheDocument();
    expect(screen.getByText(/No support team assigned/)).toBeInTheDocument();
  });

  it('renders teacher / mentor when present', () => {
    renderWithDnd(
      <EnrollmentCard
        enrollment={{
          ...baseEnrollment,
          teacherFirstName: 'Grace',
          teacherLastName: 'Hopper',
          mentorFirstName: 'Edsger',
          mentorLastName: 'Dijkstra',
        }}
        isDraggable
        onOpenDrawer={() => {}}
      />,
    );
    expect(screen.getByText(/Teacher: Grace Hopper/)).toBeInTheDocument();
    expect(screen.getByText(/Mentor: Edsger Dijkstra/)).toBeInTheDocument();
  });

  it('opens the drawer when clicked', () => {
    const onOpenDrawer = vi.fn();
    renderWithDnd(
      <EnrollmentCard
        enrollment={baseEnrollment}
        isDraggable
        onOpenDrawer={onOpenDrawer}
      />,
    );
    fireEvent.click(screen.getByText('Ada Lovelace'));
    expect(onOpenDrawer).toHaveBeenCalledWith('enr-1');
  });

  it('shows a stale flag when updatedAt is older than 7 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    renderWithDnd(
      <EnrollmentCard
        enrollment={{ ...baseEnrollment, updatedAt: tenDaysAgo }}
        isDraggable
        onOpenDrawer={() => {}}
      />,
    );
    expect(screen.getByText(/Stale: 10 days/)).toBeInTheDocument();
  });

  it('does NOT show a stale flag when stage is completed', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    renderWithDnd(
      <EnrollmentCard
        enrollment={{ ...baseEnrollment, stage: 'completed', updatedAt: tenDaysAgo }}
        isDraggable
        onOpenDrawer={() => {}}
      />,
    );
    expect(screen.queryByText(/Stale:/)).not.toBeInTheDocument();
  });

  it('renders the selection checkbox when canSelect=true', () => {
    renderWithDnd(
      <EnrollmentCard
        enrollment={baseEnrollment}
        isDraggable
        canSelect
        onToggleSelect={() => {}}
        onOpenDrawer={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Select enrollment/i })).toBeInTheDocument();
  });

  it('clicking the checkbox toggles selection and stops propagation to the card click', () => {
    const onToggle = vi.fn();
    const onOpenDrawer = vi.fn();
    renderWithDnd(
      <EnrollmentCard
        enrollment={baseEnrollment}
        isDraggable
        canSelect
        onToggleSelect={onToggle}
        onOpenDrawer={onOpenDrawer}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Select enrollment/i }));
    expect(onToggle).toHaveBeenCalledWith('enr-1');
    expect(onOpenDrawer).not.toHaveBeenCalled();
  });

  it('disables checkbox when selectionDisabled and not already selected', () => {
    const onToggle = vi.fn();
    renderWithDnd(
      <EnrollmentCard
        enrollment={baseEnrollment}
        isDraggable
        canSelect
        selectionDisabled
        isSelected={false}
        onToggleSelect={onToggle}
        onOpenDrawer={() => {}}
      />,
    );
    const cb = screen.getByRole('button', { name: /Select enrollment/i });
    expect(cb).toBeDisabled();
    fireEvent.click(cb);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows selected state and exposes aria-pressed', () => {
    renderWithDnd(
      <EnrollmentCard
        enrollment={baseEnrollment}
        isDraggable
        canSelect
        isSelected
        onToggleSelect={() => {}}
        onOpenDrawer={() => {}}
      />,
    );
    const cb = screen.getByRole('button', { name: /Deselect enrollment/i });
    expect(cb).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a drag preview without needing draggable context', () => {
    render(<EnrollmentCardDragPreview enrollment={baseEnrollment} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/No support team assigned/)).toBeInTheDocument();
  });
});
