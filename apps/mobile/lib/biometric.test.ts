/**
 * Guards biometric sign-in.
 *
 * The thing under test is NOT "does a prompt appear". It is that the refresh
 * token is sealed with `requireAuthentication`, so the OS keychain refuses to
 * return it without a successful check — and that every way that can fail
 * degrades to "sign in with your password" rather than trapping someone out of
 * the app or, worse, silently leaving the token readable.
 *
 * This module shipped for months as a placeholder whose only behaviour was an
 * alert, while `expo-local-authentication` sat installed and jest-mocked. The
 * mock made it look covered. These tests exist so that cannot recur.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as biometric from './biometric';

const secure = SecureStore as unknown as {
  __reset: () => void;
  __denyAuth: (v: boolean) => void;
  __has: (key: string) => boolean;
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
};

const SEALED_KEY = 'kairos.biometric_refresh_token';

function mockTypes(...types: number[]) {
  (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue(
    types,
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  secure.__reset();
  await AsyncStorage.clear();
  (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
  (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
  mockTypes(LocalAuthentication.AuthenticationType.FINGERPRINT);
});

describe('getCapability', () => {
  it('names the method from what the device reports, not a hardcoded guess', async () => {
    mockTypes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    expect((await biometric.getCapability()).label).toBe('Face ID');

    mockTypes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    expect((await biometric.getCapability()).label).toBe('Fingerprint');

    mockTypes(LocalAuthentication.AuthenticationType.IRIS);
    expect((await biometric.getCapability()).label).toBe('Iris');
  });

  it('prefers face when a device reports several', async () => {
    mockTypes(
      LocalAuthentication.AuthenticationType.FINGERPRINT,
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );
    expect((await biometric.getCapability()).label).toBe('Face ID');
  });

  it('is unavailable when hardware exists but nothing is enrolled', async () => {
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    const cap = await biometric.getCapability();
    expect(cap.hasHardware).toBe(true);
    expect(cap.isEnrolled).toBe(false);
    expect(cap.available).toBe(false);
  });

  it('is unavailable with no hardware at all', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
    expect((await biometric.getCapability()).available).toBe(false);
  });

  it('reports unavailable rather than throwing when the OS cannot answer', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(
      new Error('no module'),
    );
    await expect(biometric.getCapability()).resolves.toMatchObject({ available: false });
  });
});

describe('enable', () => {
  it('seals the token with requireAuthentication — the whole point', async () => {
    const ok = await biometric.enable('refresh-abc');
    expect(ok).toBe(true);

    const opts = secure.setItemAsync.mock.calls.find((c) => c[0] === SEALED_KEY)?.[2];
    // Without this flag the keychain hands the token over to anything that
    // asks, and the prompt becomes decoration.
    expect(opts).toMatchObject({ requireAuthentication: true });
    expect(await biometric.isEnabled()).toBe(true);
  });

  it('refuses on a device with no enrolment, rather than half-arming', async () => {
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    expect(await biometric.enable('refresh-abc')).toBe(false);
    expect(await biometric.isEnabled()).toBe(false);
    expect(secure.__has(SEALED_KEY)).toBe(false);
  });

  it('leaves nothing half-configured when the keychain write is refused', async () => {
    // Enrolment can disappear between the capability check and the write.
    secure.__denyAuth(true);
    expect(await biometric.enable('refresh-abc')).toBe(false);
    expect(await biometric.isEnabled()).toBe(false);
  });
});

describe('unlockRefreshToken', () => {
  it('returns the token when the keychain unseals it', async () => {
    await biometric.enable('refresh-abc');
    expect(await biometric.unlockRefreshToken('Fingerprint')).toBe('refresh-abc');
  });

  it('reads it back under requireAuthentication, not as a plain read', async () => {
    await biometric.enable('refresh-abc');
    secure.getItemAsync.mockClear();
    await biometric.unlockRefreshToken('Fingerprint');
    const opts = secure.getItemAsync.mock.calls.find((c) => c[0] === SEALED_KEY)?.[1];
    expect(opts).toMatchObject({ requireAuthentication: true });
  });

  it('returns null when the prompt is cancelled or the finger does not match', async () => {
    await biometric.enable('refresh-abc');
    secure.__denyAuth(true);
    expect(await biometric.unlockRefreshToken('Fingerprint')).toBeNull();
  });

  it('returns null when nothing was ever sealed', async () => {
    expect(await biometric.unlockRefreshToken('Fingerprint')).toBeNull();
  });
});

describe('disable', () => {
  it('drops the sealed token and the flag', async () => {
    await biometric.enable('refresh-abc');
    await biometric.disable();
    expect(await biometric.isEnabled()).toBe(false);
    expect(secure.__has(SEALED_KEY)).toBe(false);
  });

  it('still turns the flag off when the OS will not unseal for deletion', async () => {
    // Otherwise a device whose enrolment changed would be stuck reporting
    // biometrics as enabled while nothing could ever unlock.
    await biometric.enable('refresh-abc');
    secure.__denyAuth(true);
    await biometric.disable();
    expect(await biometric.isEnabled()).toBe(false);
  });

  it('is safe to call when it was never enabled', async () => {
    await expect(biometric.disable()).resolves.toBeUndefined();
  });
});

describe('rearmAfterPasswordLogin', () => {
  it('refreshes the seal when biometrics are already on', async () => {
    await biometric.enable('refresh-old');
    await biometric.rearmAfterPasswordLogin('refresh-new');
    expect(await biometric.unlockRefreshToken('Fingerprint')).toBe('refresh-new');
  });

  it('does NOT arm biometrics for someone who never opted in', async () => {
    // Enabling it silently on password login would be a security decision made
    // on the user's behalf.
    await biometric.rearmAfterPasswordLogin('refresh-new');
    expect(await biometric.isEnabled()).toBe(false);
    expect(secure.__has(SEALED_KEY)).toBe(false);
  });
});
