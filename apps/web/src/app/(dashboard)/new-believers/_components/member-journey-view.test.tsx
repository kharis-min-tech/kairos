import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemberJourneyView } from './member-journey-view';
import { STAGES } from './stage-config';
import type { EnrollmentCardData } from './types';

function makeEnrollment(overrides: Partial<EnrollmentCardData> = {}): EnrollmentCardData {
  return {
    id: 'enr-1',
    memberId: 'm-1',
    stage: 'session-2',
    memberFirstName: 'Ada',
    memberLastName: 'Lovelace',
    enrolledAt: new Date('2026-01-15').toISOString(),
    updatedAt: new Date('2026-05-13').toISOString(),
    ...overrides,
  };
}

describe('MemberJourneyView', () => {
  it('renders the journey heading and an entry for each of the 7 stages', () => {
    render(<MemberJourneyView enrollment={makeEnrollment()} />);
    expect(screen.getByText(/Your Journey/i)).toBeInTheDocument();
    // The journey checklist is an ordered list of 7 stage labels.
    const journeyList = screen.getByRole('list');
    const items = within(journeyList).getAllByRole('listitem');
    expect(items).toHaveLength(STAGES.length);
    expect(STAGES.length).toBe(7);

    for (const s of STAGES) {
      // Labels appear at least once (the active stage label appears twice — once in
      // the journey, once in the top stage indicator chip).
      expect(screen.getAllByText(s.label).length).toBeGreaterThan(0);
    }
  });

  it('marks all stages before the current one as done (line-through styling)', () => {
    // Current stage = session-2 → idx 2 → done indexes are 0 (enrolled) and 1 (session-1)
    render(<MemberJourneyView enrollment={makeEnrollment({ stage: 'session-2' })} />);

    const enrolledLabel = within(screen.getByRole('list')).getByText('Enrolled');
    const session1Label = within(screen.getByRole('list')).getByText('Session 1');
    expect(enrolledLabel.className).toMatch(/line-through/);
    expect(session1Label.className).toMatch(/line-through/);

    // The current stage (Session 2) inside the list should NOT be line-through
    const session2Label = within(screen.getByRole('list')).getByText('Session 2');
    expect(session2Label.className).not.toMatch(/line-through/);
  });

  it('highlights the current stage label with the brand purple color', () => {
    render(<MemberJourneyView enrollment={makeEnrollment({ stage: 'session-3' })} />);
    const session3InList = within(screen.getByRole('list')).getByText('Session 3');
    // Active item is styled with text-[#5D3FD3] + font-semibold
    expect(session3InList.className).toMatch(/text-\[#5D3FD3\]/);
    expect(session3InList.className).toMatch(/font-semibold/);
  });

  it('renders the gold achievement medal when the integrated stage is reached', () => {
    const { container } = render(
      <MemberJourneyView enrollment={makeEnrollment({ stage: 'integrated' })} />,
    );
    // The "Joined a Department" step at integrated stage gets the gold disc
    const goldDisc = container.querySelector('.bg-\\[\\#f8b537\\]');
    expect(goldDisc).not.toBeNull();
  });

  it('does NOT render the gold medal when not yet at the integrated stage', () => {
    const { container } = render(
      <MemberJourneyView enrollment={makeEnrollment({ stage: 'session-2' })} />,
    );
    const goldDisc = container.querySelector('.bg-\\[\\#f8b537\\]');
    expect(goldDisc).toBeNull();
  });

  it('renders the support-team section with teacher and mentor names when present', () => {
    render(
      <MemberJourneyView
        enrollment={makeEnrollment({
          teacherFirstName: 'Grace',
          teacherLastName: 'Hopper',
          mentorFirstName: 'Edsger',
          mentorLastName: 'Dijkstra',
        })}
      />,
    );
    expect(screen.getByText(/Your Support Team/i)).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Mentor')).toBeInTheDocument();
    expect(screen.getByText('Edsger Dijkstra')).toBeInTheDocument();
  });

  it('renders only the teacher row when only the teacher is assigned', () => {
    render(
      <MemberJourneyView
        enrollment={makeEnrollment({
          teacherFirstName: 'Grace',
          teacherLastName: 'Hopper',
        })}
      />,
    );
    expect(screen.getByText(/Your Support Team/i)).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Mentor')).not.toBeInTheDocument();
  });

  it('does NOT render the support-team section when neither teacher nor mentor is assigned', () => {
    render(<MemberJourneyView enrollment={makeEnrollment()} />);
    expect(screen.queryByText(/Your Support Team/i)).not.toBeInTheDocument();
  });

  it('edge case — enrolled stage: only "Enrolled" is current, nothing is line-through', () => {
    render(<MemberJourneyView enrollment={makeEnrollment({ stage: 'enrolled' })} />);
    const list = screen.getByRole('list');
    // Enrolled is the current step → styled purple, NOT line-through
    const enrolled = within(list).getByText('Enrolled');
    expect(enrolled.className).toMatch(/text-\[#5D3FD3\]/);
    expect(enrolled.className).not.toMatch(/line-through/);

    // No other step should be line-through (no done steps)
    for (const s of STAGES.filter((s) => s.value !== 'enrolled')) {
      const el = within(list).getByText(s.label);
      expect(el.className).not.toMatch(/line-through/);
    }
  });

  it('edge case — integrated stage: every prior stage is line-through (all done)', () => {
    render(<MemberJourneyView enrollment={makeEnrollment({ stage: 'integrated' })} />);
    const list = screen.getByRole('list');
    // currentIdx = 6 → idx 0..5 are done
    for (const s of STAGES.slice(0, -1)) {
      const el = within(list).getByText(s.label);
      expect(el.className).toMatch(/line-through/);
    }
    // The integrated step itself is current (purple, not line-through)
    const integratedInList = within(list).getByText('Joined a Department');
    expect(integratedInList.className).not.toMatch(/line-through/);
    expect(integratedInList.className).toMatch(/text-\[#5D3FD3\]/);
  });
});
