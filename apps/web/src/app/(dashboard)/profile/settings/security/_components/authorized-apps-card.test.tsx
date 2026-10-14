import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const revoke = vi.fn();
let apps: unknown[] | undefined = [];
let isLoading = false;

vi.mock('@/hooks/use-oauth-server', () => ({
  useMyAuthorizedApps: () => ({ data: apps, isLoading, isError: false, error: null }),
  useRevokeAuthorizedApp: () => ({ mutateAsync: revoke, isPending: false }),
}));

import { AuthorizedAppsCard } from './authorized-apps-card';

const app = {
  grantId: 'g-1',
  clientName: 'Kharis Analytics',
  clientLogoUrl: null,
  clientHomepageUrl: null,
  scopes: [
    { scope: 'openid', description: 'Sign you in' },
    { scope: 'kairos:grants', description: 'Your roles' },
  ],
  connectedAt: new Date().toISOString(),
  lastUsedAt: null,
};

beforeEach(() => {
  revoke.mockReset().mockResolvedValue(undefined);
  isLoading = false;
});

describe('AuthorizedAppsCard', () => {
  it('renders nothing for a member who has authorised no apps', () => {
    apps = [];
    const { container } = render(<AuthorizedAppsCard />);
    expect(container.firstChild).toBeNull();
  });

  it('lists each app with what it can see', () => {
    apps = [app];
    render(<AuthorizedAppsCard />);
    expect(screen.getByText('Kharis Analytics')).toBeDefined();
    expect(screen.getByText(/sign you in · your roles/i)).toBeDefined();
  });

  it('asks first, then revokes the grant', async () => {
    apps = [app];
    render(<AuthorizedAppsCard />);
    await userEvent.click(screen.getByRole('button', { name: /^Remove$/i }));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByText(/Remove Kharis Analytics\?/i)).toBeDefined();
    const confirmButtons = screen.getAllByRole('button', { name: /^Remove$/i });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]!);
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('g-1'));
  });
});
