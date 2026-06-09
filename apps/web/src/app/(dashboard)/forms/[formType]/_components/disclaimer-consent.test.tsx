import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisclaimerConsent, CONSENT_POLICY_VERSION } from './disclaimer-consent';

describe('DisclaimerConsent', () => {
  it('renders the verbatim privacy notice', () => {
    render(<DisclaimerConsent checked={false} onChange={() => {}} />);
    expect(screen.getByText(/Kharis Church is committed to respecting/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy at/i)).toBeInTheDocument();
  });

  it('reflects the checked state on the tickbox', () => {
    const { rerender } = render(<DisclaimerConsent checked={false} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
    rerender(<DisclaimerConsent checked={true} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', true);
  });

  it('fires onChange when the tickbox is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DisclaimerConsent checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('exposes the policy version constant', () => {
    expect(CONSENT_POLICY_VERSION).toBe('2026-06-v1');
  });
});
