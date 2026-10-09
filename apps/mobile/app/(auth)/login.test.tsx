import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import LoginScreen from './login';

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
  return { ArrowRight: icon, Fingerprint: icon };
});

jest.mock('@/lib/api-client', () => ({ api: { auth: { login: jest.fn() } } }));
jest.mock('@/lib/config', () => ({ apiBaseUrl: 'http://localhost' }));
jest.mock('@/lib/oauth', () => ({
  mapOAuthErrorSlug: () => 'x',
  startOAuthFlow: jest.fn(),
}));
jest.mock('@/components/oauth-provider-icon', () => ({
  OAuthProviderIcon: () => null,
  OAUTH_PROVIDER_LABEL: { google: 'Google', microsoft: 'Microsoft', apple: 'Apple' },
}));
jest.mock('@/components/kharis-dove', () => ({ KharisDove: () => null }));
jest.mock('@/store/auth', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ setSession: jest.fn(), signInWithBiometric: jest.fn() }),
}));
jest.mock('@/lib/biometric', () => ({
  getCapability: jest.fn(async () => ({ available: true, label: 'Fingerprint' })),
  listArmedUsers: jest.fn(async () => [
    { id: 'u1', displayName: 'Ada Lovelace', addedAt: '2026-01-01' },
  ]),
  isArmedFor: jest.fn(async () => false),
  hasDeclined: jest.fn(async () => false),
  markDeclined: jest.fn(),
  enable: jest.fn(),
}));
jest.mock('@/lib/alert', () => ({ alert: { confirm: jest.fn() } }));
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe('LoginScreen — Canvas motion', () => {
  it.each([false, true])('renders with Reduce Motion = %s', async (reduce) => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduce);
    const { getByTestId, getAllByText, findByText, unmount } = render(<LoginScreen />);
    await act(async () => {});
    // Copy and the e2e hooks are unchanged.
    expect(getAllByText('Sign in').length).toBeGreaterThan(0);
    expect(getByTestId('login-email')).toBeTruthy();
    expect(getByTestId('login-password')).toBeTruthy();
    expect(await findByText('Continue as Ada Lovelace')).toBeTruthy();
    fireEvent(getByTestId('login-email'), 'focus');
    fireEvent(getByTestId('login-email'), 'blur');
    // Stop the loops before the test ends so no timer outlives it.
    unmount();
  });
});
