import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let status: Record<string, unknown> | undefined;
let isLoading = false;
let user: Record<string, unknown> | null = { id: 'm-1' };

vi.mock('@/hooks/use-mfa', () => ({
  useMfaStatus: () => ({ data: status, isLoading }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({ user }),
}));

import { MfaSetupBanner } from './mfa-setup-banner';

beforeEach(() => {
  isLoading = false;
  user = { id: 'm-1' };
  window.sessionStorage.clear();
});

describe('MfaSetupBanner', () => {
  it('nags a privileged member with no factor', () => {
    status = { required: true, enrolled: false, pendingEnrolment: false, backupCodesRemaining: 0 };
    render(<MfaSetupBanner />);
    expect(screen.getByText(/set up two-step sign-in/i)).toBeDefined();
    expect(screen.getByRole('link', { name: /set it up/i }).getAttribute('href')).toBe(
      '/profile/settings/security',
    );
  });

  it('says nothing to a member it is not required of', () => {
    status = { required: false, enrolled: false, pendingEnrolment: false, backupCodesRemaining: 0 };
    const { container } = render(<MfaSetupBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('disappears once the factor exists', () => {
    status = { required: true, enrolled: true, pendingEnrolment: false, backupCodesRemaining: 9 };
    const { container } = render(<MfaSetupBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while signed out', () => {
    user = null;
    status = { required: true, enrolled: false, pendingEnrolment: false, backupCodesRemaining: 0 };
    const { container } = render(<MfaSetupBanner />);
    expect(container.firstChild).toBeNull();
  });

  /**
   * Dismissal is session-scoped on purpose. There is a date after which these
   * members cannot sign in without a factor, so a banner they could silence
   * permanently would be a trap: it has to come back at the next sign-in.
   */
  it('goes away when dismissed, and only for this session', async () => {
    status = { required: true, enrolled: false, pendingEnrolment: false, backupCodesRemaining: 0 };
    const { container } = render(<MfaSetupBanner />);

    await userEvent.click(screen.getByRole('button', { name: /dismiss until next sign-in/i }));
    expect(container.firstChild).toBeNull();
    expect(window.sessionStorage.getItem('kairos.mfa_nag_dismissed')).toBe('1');
  });

  it('stays dismissed within the same session', () => {
    status = { required: true, enrolled: false, pendingEnrolment: false, backupCodesRemaining: 0 };
    window.sessionStorage.setItem('kairos.mfa_nag_dismissed', '1');
    const { container } = render(<MfaSetupBanner />);
    expect(container.firstChild).toBeNull();
  });
});
