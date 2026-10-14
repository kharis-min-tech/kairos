import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let activeRole: string | null = 'admin';
const replace = vi.fn();
const push = vi.fn();
const createClient = vi.fn();
let clients: unknown[] = [];

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: { activeRole: string | null }) => T) =>
    selector ? selector({ activeRole }) : ({ activeRole } as unknown as T),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/use-oauth-server', () => ({
  useOAuthClients: () => ({ data: clients, isLoading: false, isError: false, error: null }),
  useCreateOAuthClient: () => ({ mutateAsync: createClient, isPending: false, error: null, reset: vi.fn() }),
}));

import OAuthClientsPage from './page';

const summary = {
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
  allowedScopes: ['openid'],
  isTrusted: true,
  isActive: true,
  lastUsedAt: null,
  createdAt: new Date().toISOString(),
  grantCount: 3,
  hasPreviousSecret: false,
};

beforeEach(() => {
  activeRole = 'admin';
  clients = [];
  replace.mockReset();
  push.mockReset();
  createClient.mockReset();
});

describe('OAuthClientsPage', () => {
  it('redirects a non-admin away', () => {
    activeRole = 'member';
    render(<OAuthClientsPage />);
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('explains the empty state', () => {
    render(<OAuthClientsPage />);
    expect(screen.getByText(/No apps registered yet/i)).toBeDefined();
  });

  it('lists registered apps with their status and member count', () => {
    clients = [summary];
    render(<OAuthClientsPage />);
    expect(screen.getByText('Kharis Analytics')).toBeDefined();
    expect(screen.getByText('Trusted')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText(/3 members signed in/i)).toBeDefined();
    expect(screen.getByRole('link', { name: /Kharis Analytics/i }).getAttribute('href')).toBe('/admin/oauth-clients/c-1');
  });

  it('registers an app, shows the secret once, and only then moves on', async () => {
    createClient.mockResolvedValue({ client: summary, clientSecret: 'ks_supersecret' });
    render(<OAuthClientsPage />);
    await userEvent.click(screen.getByRole('button', { name: /Register app/i }));

    const register = screen.getByRole('button', { name: /^Register app$/i });
    expect((register as HTMLButtonElement).disabled).toBe(true); // nothing filled in yet

    await userEvent.type(screen.getByLabelText(/Name \*/i), 'Kharis Analytics');
    await userEvent.type(screen.getByLabelText(/Redirect URIs/i), 'https://analytics.example.org/cb');
    await userEvent.click(screen.getByRole('button', { name: /^Register app$/i }));

    await waitFor(() => expect(createClient).toHaveBeenCalled());
    expect(createClient.mock.calls[0]![0]).toMatchObject({
      name: 'Kharis Analytics',
      clientType: 'confidential',
      redirectUris: ['https://analytics.example.org/cb'],
      allowedScopes: ['openid', 'profile', 'email'],
    });

    expect(await screen.findByText('ks_supersecret')).toBeDefined();
    expect(screen.getByText(/only time it will be shown/i)).toBeDefined();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /I've saved it/i }));
    expect(push).toHaveBeenCalledWith('/admin/oauth-clients/c-1');
  });
});
