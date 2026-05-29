import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders a checkbox input', () => {
    render(<Checkbox aria-label="Accept" />);
    expect(screen.getByRole('checkbox', { name: 'Accept' })).toBeInTheDocument();
  });

  it('toggles when clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Accept' });
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('merges additional className on the input', () => {
    render(<Checkbox aria-label="Accept" className="extra-class" />);
    expect(screen.getByRole('checkbox', { name: 'Accept' }).className).toContain(
      'extra-class',
    );
  });

  it('uses the documented Kairos purple for its checked state', () => {
    render(<Checkbox aria-label="Accept" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Accept' });

    expect(checkbox.className).toContain('checked:bg-[#6D28D9]');
    expect(checkbox.className).toContain('checked:border-[#6D28D9]');
  });
});
