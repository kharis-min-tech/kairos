import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewBelieverSession } from '@kairos/types';
import { SessionListItem } from './session-list-item';

function makeSession(overrides: Partial<NewBelieverSession> = {}): NewBelieverSession {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: 'session-1',
    branchId: 'branch-1',
    sessionStage: 'session-1',
    sessionDate: future,
    topic: 'Foundations of Faith',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

describe('SessionListItem', () => {
  it('renders session stage label and topic', () => {
    render(
      <SessionListItem
        session={makeSession()}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText('Foundations of Faith')).toBeInTheDocument();
  });

  it('marks itself pressed when selected', () => {
    render(
      <SessionListItem
        session={makeSession()}
        isSelected
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionListItem
        session={makeSession()}
        isSelected={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows enrolled count for upcoming sessions', () => {
    render(
      <SessionListItem
        session={makeSession()}
        enrolledCount={12}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('12 enrolled')).toBeInTheDocument();
  });

  it('shows attended/enrolled ratio for past sessions', () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <SessionListItem
        session={makeSession({ sessionDate: pastDate })}
        enrolledCount={16}
        attendanceCount={14}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('14/16 attended')).toBeInTheDocument();
  });
});
