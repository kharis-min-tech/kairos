/**
 * SecureStore mock that models the ONE behaviour biometric sign-in depends on:
 * an item written with `requireAuthentication` can refuse to come back out.
 *
 * A plain Map would let every test pass while the real keychain denied the
 * read on device, which is exactly the failure this feature exists to prevent.
 * `__denyAuth(true)` simulates a cancelled prompt, a non-matching finger, or
 * enrolment having changed since the item was sealed.
 */
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  let denyAuth = false;
  return {
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'whenPasscodeSetThisDeviceOnly',
    getItemAsync: jest.fn(
      async (key: string, opts?: { requireAuthentication?: boolean }) => {
        if (opts?.requireAuthentication && denyAuth) {
          throw new Error('User canceled the authentication');
        }
        return store.get(key) ?? null;
      },
    ),
    setItemAsync: jest.fn(
      async (key: string, value: string, opts?: { requireAuthentication?: boolean }) => {
        if (opts?.requireAuthentication && denyAuth) {
          throw new Error('Could not encrypt the value');
        }
        store.set(key, value);
      },
    ),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __reset: () => {
      store.clear();
      denyAuth = false;
    },
    __denyAuth: (v: boolean) => {
      denyAuth = v;
    },
    __has: (key: string) => store.has(key),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

// Defaults to a fingerprint device with an enrolment. Tests override per case.
// `supportedAuthenticationTypesAsync` matters: the UI label comes from it, and
// omitting it used to make getCapability() throw straight into its catch.
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => [1]),
  authenticateAsync: jest.fn(async () => ({ success: true })),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
  Stack: Object.assign(
    ({ children }: { children?: React.ReactNode }) => children,
    { Screen: () => null },
  ),
  Tabs: Object.assign(
    ({ children }: { children?: React.ReactNode }) => children,
    { Screen: () => null },
  ),
  Link: ({ children }: { children?: React.ReactNode }) => children,
}));
