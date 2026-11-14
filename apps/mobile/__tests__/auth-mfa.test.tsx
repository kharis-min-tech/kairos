import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockReplace = jest.fn();
const mockSetSession = jest.fn(async () => {});
const mockVerify = jest.fn();
const mockEnrolWithChallenge = jest.fn();
const mockConfirmWithChallenge = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...p }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, p, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const icon = () => ReactLocal.createElement(View);
  return {
    ChevronLeft: icon,
    ShieldCheck: icon,
    ShieldAlert: icon,
    KeyRound: icon,
    Smartphone: icon,
  };
});

jest.mock('@/lib/api-client', () => ({
  api: {
    auth: {
      mfa: {
        verify: (...args: unknown[]) => mockVerify(...args),
        enrolWithChallenge: (...args: unknown[]) => mockEnrolWithChallenge(...args),
        confirmWithChallenge: (...args: unknown[]) => mockConfirmWithChallenge(...args),
      },
    },
  },
}));

jest.mock('@/lib/alert', () => ({ alert: { info: jest.fn(), confirm: jest.fn() } }));

jest.mock('@/store/auth', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ setSession: mockSetSession }),
}));

// expo-file-system / expo-sharing are only reached by the "save to a file"
// button on the backup-code step; stubbed so importing the screen does not
// pull native modules in.
jest.mock('expo-file-system', () => ({
  File: class {
    exists = false;
    uri = 'file:///codes.txt';
    create() {}
    write() {}
    delete() {}
  },
  Paths: { cache: 'file:///cache' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => false,
  shareAsync: jest.fn(),
}));

import MfaScreen from '../app/(auth)/mfa';
import { useMfaChallengeStore } from '../store/mfa-challenge';

/**
 * A real QueryClient, not a mocked `useMutation`, because every test here is
 * about what happens after a call resolves or rejects.
 *
 * It is torn down in `afterEach`. React Query keeps garbage-collection
 * timers on its caches, and without this the Jest process sits open for
 * minutes after the run reports green - which on CI reads as a hung job
 * rather than a passing one.
 */
let client: QueryClient | null = null;

function renderScreen() {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MfaScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  client?.clear();
  client?.unmount();
  client = null;
});

const member = {
  id: 'm-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  systemRole: 'member',
  mustChangePassword: false,
};

const session = {
  success: true,
  data: {
    tokens: { accessToken: 'at', refreshToken: 'rt' },
    member,
    mfaMethod: 'totp',
    backupCodesRemaining: 9,
  },
};

beforeEach(() => {
  mockReplace.mockClear();
  mockSetSession.mockClear();
  mockVerify.mockReset();
  mockConfirmWithChallenge.mockReset();
  mockEnrolWithChallenge.mockReset().mockResolvedValue({
    success: true,
    data: {
      secretBase32: 'JBSWY3DPEHPK3PXP',
      enrolmentUri: 'otpauth://totp/Kairos:ada@example.com?secret=JBSWY3DPEHPK3PXP',
    },
  });
  useMfaChallengeStore.getState().clear();
});

function challengeIsOutstanding(stage: 'challenge' | 'enrolment' = 'challenge') {
  useMfaChallengeStore.getState().start({ token: 'pre-mfa', stage });
}

describe('MfaScreen - nothing in memory', () => {
  /**
   * The token is deliberately not persisted, so killing the app loses it.
   * That is the design, and the screen has to explain it rather than show a
   * code field that cannot work.
   */
  it('explains the restart instead of showing a dead code field', async () => {
    const { queryByLabelText, getByText } = renderScreen();
    await act(async () => {});
    expect(queryByLabelText('6-digit code')).toBeNull();
    expect(getByText('Let us start again')).toBeTruthy();
  });

  it('sends the member back to the login screen', async () => {
    const { getByText } = renderScreen();
    await act(async () => {});
    fireEvent.press(getByText('Back to sign in'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});

describe('MfaScreen - challenge stage', () => {
  it('verifies the code, stores the session and leaves', async () => {
    challengeIsOutstanding();
    mockVerify.mockResolvedValue(session);

    const { getByLabelText, getByText } = renderScreen();
    await act(async () => {});
    fireEvent.changeText(getByLabelText('6-digit code'), '123456');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith({ code: '123456' }, 'pre-mfa'));
    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith({ accessToken: 'at', refreshToken: 'rt' }, member),
    );
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('clears the pre-MFA token once it has been spent', async () => {
    challengeIsOutstanding();
    mockVerify.mockResolvedValue(session);

    const { getByLabelText, getByText } = renderScreen();
    await act(async () => {});
    fireEvent.changeText(getByLabelText('6-digit code'), '123456');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(useMfaChallengeStore.getState().token).toBeNull());
  });

  /**
   * A wrong code is a 401. The member must stay here with the challenge
   * intact: bouncing them to the login screen would make a typo cost them
   * their password as well as their code.
   */
  it('keeps the challenge alive when the code is rejected', async () => {
    challengeIsOutstanding();
    mockVerify.mockResolvedValue({ success: false, message: 'That code is not right.' });

    const { getByLabelText, getByText, findByText } = renderScreen();
    await act(async () => {});
    fireEvent.changeText(getByLabelText('6-digit code'), '000000');
    fireEvent.press(getByText('Continue'));

    expect(await findByText('That code is not right.')).toBeTruthy();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useMfaChallengeStore.getState().token).toBe('pre-mfa');
  });

  it('does not call the API for an obviously short code', async () => {
    challengeIsOutstanding();

    const { getByLabelText, getByText, findByText } = renderScreen();
    await act(async () => {});
    fireEvent.changeText(getByLabelText('6-digit code'), '123');
    fireEvent.press(getByText('Continue'));

    await findByText('Enter the 6-digit code from your authenticator app.');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  /**
   * A backup code has letters in it, so the number pad that suits a TOTP code
   * would leave the member unable to type one at all.
   */
  it('switches to a backup code field that accepts letters', async () => {
    challengeIsOutstanding();

    const { getByText, getByLabelText } = renderScreen();
    await act(async () => {});
    fireEvent.press(getByText('I cannot reach my authenticator app'));

    const field = getByLabelText('Backup code');
    expect(field.props.keyboardType).toBe('default');
  });

  it('sends a backup code to the same endpoint, untouched', async () => {
    challengeIsOutstanding();
    mockVerify.mockResolvedValue({ ...session, data: { ...session.data, mfaMethod: 'backup-code' } });

    const { getByText, getByLabelText } = renderScreen();
    await act(async () => {});
    fireEvent.press(getByText('I cannot reach my authenticator app'));
    fireEvent.changeText(getByLabelText('Backup code'), 'ABCDE-FGHIJ');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith({ code: 'ABCDE-FGHIJ' }, 'pre-mfa'));
  });
});

describe('MfaScreen - enrolment stage', () => {
  it('shows a setup key that can be typed, since the QR would be unscannable here', async () => {
    challengeIsOutstanding('enrolment');

    const { findByTestId } = renderScreen();
    await waitFor(() => expect(mockEnrolWithChallenge).toHaveBeenCalledWith('pre-mfa'));
    expect((await findByTestId('mfa-setup-key')).props.children).toBe('JBSWY3DPEHPK3PXP');
  });

  /**
   * Confirming enrolment IS proving a factor, so the server signs them in
   * with the same call. The screen must use that session, or the member
   * finishes setup and lands back at sign-in.
   */
  it('signs the member in from the confirm response, after they save the codes', async () => {
    challengeIsOutstanding('enrolment');
    mockConfirmWithChallenge.mockResolvedValue({
      success: true,
      data: {
        backupCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'],
        tokens: { accessToken: 'at', refreshToken: 'rt' },
        member,
      },
    });

    const { findByTestId, getByLabelText, getByText, findByText } = renderScreen();
    await findByTestId('mfa-setup-key');
    fireEvent.changeText(getByLabelText('6-digit code'), '123456');
    fireEvent.press(getByText('Turn on two-step sign-in'));

    // The codes come first. Nothing is stored until they acknowledge them.
    expect(await findByText('AAAAA-BBBBB')).toBeTruthy();
    expect(mockSetSession).not.toHaveBeenCalled();

    fireEvent.press(getByText('I have saved them, continue'));
    await waitFor(() => expect(mockSetSession).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('surfaces a rejected code without losing the setup key', async () => {
    challengeIsOutstanding('enrolment');
    mockConfirmWithChallenge.mockResolvedValue({
      success: false,
      message: 'That code did not match.',
    });

    const { findByTestId, getByLabelText, getByText, findByText } = renderScreen();
    await findByTestId('mfa-setup-key');
    fireEvent.changeText(getByLabelText('6-digit code'), '000000');
    fireEvent.press(getByText('Turn on two-step sign-in'));

    expect(await findByText('That code did not match.')).toBeTruthy();
    expect(await findByTestId('mfa-setup-key')).toBeTruthy();
    expect(mockEnrolWithChallenge).toHaveBeenCalledTimes(1);
  });
});
