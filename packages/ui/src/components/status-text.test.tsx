import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusText } from './status-text';

describe('StatusText', () => {
  it('renders a settled status as plain text with no marker', () => {
    const { container } = render(<StatusText label="Reviewed" />);
    expect(screen.getByText('Reviewed')).toBeDefined();
    expect(container.querySelector('.rounded-full')).toBeNull();
  });

  it('marks a status that is waiting on a person', () => {
    const { container } = render(<StatusText label="New" awaiting />);
    expect(screen.getByText('New')).toBeDefined();
    expect(container.querySelector('.rounded-full')).not.toBeNull();
  });

  it('keeps the meaning in the label, not the dot', () => {
    // The dot is aria-hidden on purpose. A screen reader, a monochrome
    // display and a colour-blind reader all get the same information as
    // everyone else, because the word is doing the work.
    const { container } = render(<StatusText label="Probation failed" awaiting />);
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
    expect(container.textContent).toBe('Probation failed');
  });

  it('offers no per-status colour slot', () => {
    // Four tinted pills competing at equal weight is what this replaces.
    // There is exactly one colour and one reason to use it.
    const props = Object.keys(StatusText as unknown as Record<string, unknown>);
    expect(props).not.toContain('variant');
    expect(props).not.toContain('tone');
  });
});
