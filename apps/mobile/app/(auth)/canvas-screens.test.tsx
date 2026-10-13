import { AccessibilityInfo } from 'react-native';
import { act, render } from '@testing-library/react-native';
import ForgotPasswordScreen from './forgot-password';
import PendingApprovalScreen from './pending-approval';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const make = (name: string) => {
    const C = ({ children, ...p }: { children?: React.ReactNode }) =>
      React.createElement(View, p, children);
    C.displayName = name;
    return C;
  };
  const S = make('Svg');
  return {
    __esModule: true,
    default: S,
    Svg: S,
    Path: make('Path'),
    Rect: make('Rect'),
    Circle: make('Circle'),
    G: make('G'),
    Defs: make('Defs'),
    Stop: make('Stop'),
    RadialGradient: make('RadialGradient'),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
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
  return { ArrowRight: icon, ChevronLeft: icon, MailCheck: icon, BellRing: icon };
});

jest.mock('@/lib/api-client', () => ({ api: { auth: { forgotPassword: jest.fn() } } }));
jest.mock('@/components/kharis-dove', () => ({ KharisDove: () => null }));
jest.mock('@/store/auth', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ clearSession: jest.fn() }),
}));
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

// The Canvas treatment cascades to every auth screen; each must still render
// its copy with motion allowed and with Reduce Motion on.
describe.each([false, true])('auth screens — Reduce Motion = %s', (reduce) => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduce);
  });

  it('forgot-password renders its copy and form', async () => {
    const { getByText, getByPlaceholderText, unmount } = render(<ForgotPasswordScreen />);
    await act(async () => {});
    expect(getByText('Reset your password')).toBeTruthy();
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByText('Send reset link')).toBeTruthy();
    unmount();
  });

  it('pending-approval renders its copy and sign-out', async () => {
    const { getByText, unmount } = render(<PendingApprovalScreen />);
    await act(async () => {});
    expect(getByText('Account pending approval')).toBeTruthy();
    expect(getByText('Sign out')).toBeTruthy();
    unmount();
  });
});
