import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrength } from './password-strength';

describe('PasswordStrength', () => {
  it('announces strength changes via aria-live', () => {
    const { container } = render(<PasswordStrength password="" />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('marks each requirement as a list item', () => {
    render(<PasswordStrength password="Abcdef1!" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('flags only met requirements as met', () => {
    render(<PasswordStrength password="abc" />);
    // password 'abc' meets none of: >=8 chars, uppercase, number, special
    expect(screen.getByText('At least 8 characters').className).toMatch(/text-muted/);
    expect(screen.getByText('One uppercase letter').className).toMatch(/text-muted/);
  });
});
