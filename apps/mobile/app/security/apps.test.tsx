import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AuthorizedAppsScreen from './apps';

const mockBack = jest.fn();
const mockList = jest.fn();
const mockRevoke = jest.fn();
const mockConfirm = jest.fn();
const mockInfo = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...p }: { children?: React.ReactNode }) =>
      React.createElement(View, p, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = () => React.createElement(View);
  return { AppWindow: icon, ChevronLeft: icon, Unplug: icon };
});

jest.mock('@/lib/api-client', () => ({
  api: {
    oauthServer: {
      listConnections: (...a: unknown[]) => mockList(...a),
      revokeConnection: (...a: unknown[]) => mockRevoke(...a),
    },
  },
}));

jest.mock('@/lib/alert', () => ({
  alert: {
    confirm: (...a: unknown[]) => mockConfirm(...a),
    info: (...a: unknown[]) => mockInfo(...a),
  },
}));

// A real QueryClient: the screen's query and mutation behaviour is the point.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthorizedAppsScreen />
    </QueryClientProvider>,
  );
}

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
  jest.clearAllMocks();
  mockRevoke.mockResolvedValue({ success: true, data: { revoked: true } });
});

describe('Apps with access (mobile)', () => {
  it('explains the empty state', async () => {
    mockList.mockResolvedValue({ success: true, data: [] });
    const { findByText } = renderScreen();
    expect(await findByText(/No apps yet/i)).toBeTruthy();
  });

  it('lists each app and what it can see', async () => {
    mockList.mockResolvedValue({ success: true, data: [app] });
    const { findByText } = renderScreen();
    expect(await findByText('Kharis Analytics')).toBeTruthy();
    expect(await findByText(/sign you in · your roles/i)).toBeTruthy();
  });

  it('asks first, then revokes the grant and reloads', async () => {
    mockList.mockResolvedValue({ success: true, data: [app] });
    mockConfirm.mockResolvedValue(true);
    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Remove'));
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('g-1'));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it('does nothing when the member backs out', async () => {
    mockList.mockResolvedValue({ success: true, data: [app] });
    mockConfirm.mockResolvedValue(false);
    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Remove'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('tells the member when removal fails', async () => {
    mockList.mockResolvedValue({ success: true, data: [app] });
    mockConfirm.mockResolvedValue(true);
    mockRevoke.mockRejectedValue(new Error('Connected app not found'));
    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Remove'));
    await waitFor(() =>
      expect(mockInfo).toHaveBeenCalledWith('Could not remove it', 'Connected app not found'),
    );
  });
});
