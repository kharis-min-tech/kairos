import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let activeRole: string | null = 'admin';
const replace = vi.fn();
const push = vi.fn();
const rotate = vi.fn();
const update = vi.fn();
const confirm = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useParams: () => ({ id: 'c-1' }),
}));
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: { activeRole: string | null }) => T) =>
    selector ? selector({ activeRole }) : ({ activeRole } as unknown as T),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/confirm-dialog', () => ({ useConfirm: () => ({ confirm, dialog: null }) }));

const client = {
  id: 'c-1',
  clientId: 'kc_abc',
  name: 'Kharis Analytics',
  description: null,
  logoUrl: null,
  homepageUrl: null,
  privacyUrl: null,
  termsUrl: null,
  clientType: 'confidential',
  redirectUris: ['https://analytics.example.org/cb'],
  allowedScopes: ['openid', 'email'],
  isTrusted: false,
  isActive: true,
  lastUsedAt: null,
  createdAt: new Date().toISOString(),
  grantCount: 1,
  hasPreviousSecret: false,
};
const mutation = (fn: unknown) => ({ mutateAsync: fn, isPending: false, error: null });

vi.mock('@/hooks/use-oauth-server', () => ({
  useOAuthClient: () => ({ data: client, isLoading: false, isError: false }),
  useOAuthClientGrants: () => ({
    data: [{ grantId: 'g1', memberId: 'm1', memberName: 'Grace Okafor', email: 'grace@kharis.org', scopes: ['openid'], connectedAt: new Date().toISOString(), lastUsedAt: null }],
    isLoading: false,
  }),
  useOAuthClientActivity: () => ({
    data: [{ id: 'a1', action: 'oauth_token_reuse', outcome: 'failure', actorName: null, metadata: { note: 'reuse' }, createdAt: new Date().toISOString() }],
    isLoading: false,
  }),
  useOAuthDiscovery: () => ({
    data: {
      issuer: 'https://kairos.kharis.org/api/oauth',
      authorization_endpoint: 'https://kairos.kharis.org/oauth/authorize',
      token_endpoint: 'https://kairos.kharis.org/api/oauth/token',
      userinfo_endpoint: 'https://kairos.kharis.org/api/oauth/userinfo',
      jwks_uri: 'https://kairos.kharis.org/api/oauth/jwks',
      revocation_endpoint: 'https://kairos.kharis.org/api/oauth/revoke',
    },
    isError: false,
  }),
  useUpdateOAuthClient: () => mutation(update),
  useRotateOAuthClientSecret: () => mutation(rotate),
  useExpirePreviousOAuthSecret: () => mutation(vi.fn()),
  useRevokeAllOAuthGrants: () => mutation(vi.fn()),
  useDeleteOAuthClient: () => mutation(vi.fn()),
}));

import OAuthClientDetailPage from './page';

beforeEach(() => {
  activeRole = 'admin';
  replace.mockReset();
  rotate.mockReset();
  update.mockReset().mockResolvedValue(client);
  confirm.mockReset();
});

describe('OAuthClientDetailPage', () => {
  it('redirects a non-admin away', () => {
    activeRole = 'member';
    render(<OAuthClientDetailPage />);
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('shows everything the app’s team needs to configure sign-in', () => {
    render(<OAuthClientDetailPage />);
    expect(screen.getByRole('heading', { name: 'Kharis Analytics' })).toBeDefined();
    expect(screen.getByText('kc_abc')).toBeDefined();
    expect(screen.getByText('https://kairos.kharis.org/api/oauth/token')).toBeDefined();
    expect(screen.getByText('https://kairos.kharis.org/api/oauth/.well-known/openid-configuration')).toBeDefined();
  });

  it('does not rotate when the admin backs out of the confirmation', async () => {
    confirm.mockResolvedValue(false);
    render(<OAuthClientDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /Rotate secret/i }));
    expect(rotate).not.toHaveBeenCalled();
  });

  it('shows the new secret exactly once after rotating', async () => {
    confirm.mockResolvedValue(true);
    rotate.mockResolvedValue({ client, clientSecret: 'ks_fresh' });
    render(<OAuthClientDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /Rotate secret/i }));
    expect(await screen.findByText('ks_fresh')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: /I've saved it/i }));
    expect(screen.queryByText('ks_fresh')).toBeNull();
  });

  it('asks before disabling the app', async () => {
    confirm.mockResolvedValue(true);
    render(<OAuthClientDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^Disable$/i }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ isActive: false }));
    expect(confirm).toHaveBeenCalled();
  });

  it('lists who has access and the activity trail', async () => {
    render(<OAuthClientDetailPage />);
    await userEvent.click(screen.getByRole('tab', { name: /Access/i }));
    expect(screen.getByText('Grace Okafor')).toBeDefined();
    await userEvent.click(screen.getByRole('tab', { name: /Activity/i }));
    expect(screen.getByText(/App token reuse detected/i)).toBeDefined();
  });
});
