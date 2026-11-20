import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AcceptPolicies from '../app/accept-policies';

/**
 * The mobile consent gate.
 *
 * What these tests are really defending is the thing that broke: the API's
 * consentGateMiddleware 403s every `/api/*` route outside a short allowlist
 * while a required consent is pending, and mobile had no screen that could
 * clear that condition. So the assertions below are mostly about the gate
 * being *escapable by accepting* — every one of them is a way the screen
 * could silently become a dead end again.
 */

const mockReplace = jest.fn();
const mockList = jest.fn();
const mockRecord = jest.fn();
const mockClearSession = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
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
  return { Check: icon, ExternalLink: icon, ShieldAlert: icon };
});

jest.mock('@/lib/api-client', () => ({
  api: {
    me: {
      consent: {
        list: (...a: unknown[]) => mockList(...a),
        record: (...a: unknown[]) => mockRecord(...a),
      },
    },
  },
}));

jest.mock('@/lib/config', () => ({ apiBaseUrl: 'https://staging.example.org' }));

jest.mock('@/store/auth', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ clearSession: mockClearSession }),
}));


function pendingStatus(consentType: string, currentVersion = '2026-11-v2') {
  return {
    consentType,
    currentVersion,
    acceptedVersion: '2026-07-v1',
    granted: true,
    grantedAt: '2026-07-23T00:00:00.000Z',
    required: true,
    needsAccept: true,
  };
}

function renderScreen() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AcceptPolicies />
    </QueryClientProvider>,
  );
}

let openSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockRecord.mockResolvedValue({ data: {} });
});

describe('mobile consent gate', () => {
  it('lists every pending required policy', async () => {
    mockList.mockResolvedValue({
      data: { statuses: [pendingStatus('terms'), pendingStatus('privacy')] },
    });
    const { getAllByText } = renderScreen();
    await waitFor(() =>
      expect(getAllByText('I have read and accept this policy')).toHaveLength(2),
    );
  });

  /**
   * The condition that made the old screens useless. A policy the caller
   * already accepted at an older version still needs re-accepting, and the
   * surfaces that existed showed that state without offering any way to act
   * on it.
   */
  it('shows a policy whose stored acceptance is for an older version', async () => {
    mockList.mockResolvedValue({ data: { statuses: [pendingStatus('terms')] } });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Version 2026-11-v2')).toBeTruthy());
  });

  it('leaves consents that do not need accepting off the gate', async () => {
    mockList.mockResolvedValue({
      data: {
        statuses: [
          pendingStatus('terms'),
          { ...pendingStatus('privacy'), needsAccept: false },
          { ...pendingStatus('marketing'), required: false },
        ],
      },
    });
    const { getAllByText } = renderScreen();
    await waitFor(() =>
      expect(getAllByText('I have read and accept this policy')).toHaveLength(1),
    );
  });

  it('records every pending policy and leaves the gate once all are ticked', async () => {
    mockList.mockResolvedValue({
      data: { statuses: [pendingStatus('terms'), pendingStatus('privacy')] },
    });
    const { getAllByText, getByText } = renderScreen();
    await waitFor(() =>
      expect(getAllByText('I have read and accept this policy')).toHaveLength(2),
    );

    getAllByText('I have read and accept this policy').forEach((node) =>
      fireEvent.press(node),
    );
    fireEvent.press(getByText('Accept and continue'));

    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(2));
    expect(mockRecord).toHaveBeenCalledWith({ consentType: 'terms', granted: true });
    expect(mockRecord).toHaveBeenCalledWith({ consentType: 'privacy', granted: true });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  /**
   * Accepting on the caller's behalf because they pressed one button would
   * make the acceptance record worthless as evidence of agreement.
   *
   * This asserts on the button's disabled state rather than pressing it and
   * expecting nothing to happen. `fireEvent.press` resolves `onPress` from the
   * closest element carrying that prop, which is the <Button> composite — the
   * handler this screen passed in — so it fires regardless of whether Button
   * forwarded it to the host Pressable. The real press path only ever reaches
   * the host, where Button sets `onPress` to undefined while inert. So
   * `accessibilityState.disabled` is both what a real tap obeys and what a
   * screen reader announces, and pressing in a test proves neither.
   */
  it('keeps the continue button disabled while a policy is still unticked', async () => {
    mockList.mockResolvedValue({
      data: { statuses: [pendingStatus('terms'), pendingStatus('privacy')] },
    });
    const { getAllByText, getByRole } = renderScreen();
    await waitFor(() =>
      expect(getAllByText('I have read and accept this policy')).toHaveLength(2),
    );

    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getAllByText('I have read and accept this policy')[0]!);
    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getAllByText('I have read and accept this policy')[1]!);
    expect(getByRole('button').props.accessibilityState.disabled).toBe(false);
  });

  it('surfaces a failed write instead of moving on', async () => {
    mockList.mockResolvedValue({ data: { statuses: [pendingStatus('terms')] } });
    mockRecord.mockRejectedValue(new Error('Database unavailable'));
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('I have read and accept this policy')).toBeTruthy());

    fireEvent.press(getByText('I have read and accept this policy'));
    fireEvent.press(getByText('Accept and continue'));

    await waitFor(() => expect(getByText('Database unavailable')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Refusing a policy has to remain possible. The API keeps
   * /api/me/consent, /api/me/export and /api/me/delete-account allowlisted for
   * the same reason, so the gate must not be the one place that traps someone.
   */
  it('lets the caller sign out rather than accept', async () => {
    mockList.mockResolvedValue({ data: { statuses: [pendingStatus('terms')] } });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Sign out instead')).toBeTruthy());

    fireEvent.press(getByText('Sign out instead'));

    await waitFor(() => expect(mockClearSession).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
  });

  it('points the read link at the API origin the build is wired to', async () => {
    mockList.mockResolvedValue({ data: { statuses: [pendingStatus('terms')] } });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Read the current version')).toBeTruthy());

    fireEvent.press(getByText('Read the current version'));

    expect(openSpy).toHaveBeenCalledWith('https://staging.example.org/legal/terms');
  });
});
