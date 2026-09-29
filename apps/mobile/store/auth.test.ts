import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './auth';
import * as apiClient from '@/lib/api-client';
import * as biometric from '@/lib/biometric';

jest.mock('@/lib/api-client', () => ({
  setSessionTokens: jest.fn(),
  registerAuthCallbacks: jest.fn(),
}));

const setTokens = apiClient.setSessionTokens as jest.Mock;

const resetStore = () => {
  useAuthStore.setState({
    hydrated: false,
    accessToken: null,
    refreshToken: null,
    user: null,
  });
};

const resetPersistence = async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  await AsyncStorage.clear();
};

const fakeUser = { id: 'm1', email: 'a@b.co' } as unknown as Parameters<
  ReturnType<typeof useAuthStore.getState>['setSession']
>[1];

const fakeTokens = { accessToken: 'a', refreshToken: 'r' };

beforeEach(async () => {
  setTokens.mockClear();
  resetStore();
  await resetPersistence();
});

describe('useAuthStore', () => {
  it('hydrates to signed-out state when storage is empty', async () => {
    await useAuthStore.getState().hydrate();
    const s = useAuthStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.accessToken).toBeNull();
    expect(s.refreshToken).toBeNull();
    expect(s.user).toBeNull();
    expect(setTokens).toHaveBeenCalledWith(null);
  });

  it('hydrates persisted tokens + user back into memory', async () => {
    await SecureStore.setItemAsync('kairos.access_token', 'stored-a');
    await SecureStore.setItemAsync('kairos.refresh_token', 'stored-r');
    await AsyncStorage.setItem('kairos.user', JSON.stringify({ id: 'm9' }));

    await useAuthStore.getState().hydrate();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('stored-a');
    expect(s.refreshToken).toBe('stored-r');
    expect(s.user).toEqual({ id: 'm9' });
    expect(setTokens).toHaveBeenCalledWith({
      accessToken: 'stored-a',
      refreshToken: 'stored-r',
    });
  });

  it('setSession persists to SecureStore + AsyncStorage and pushes tokens to api-client', async () => {
    await useAuthStore.getState().setSession(fakeTokens, fakeUser);
    expect(await SecureStore.getItemAsync('kairos.access_token')).toBe('a');
    expect(await SecureStore.getItemAsync('kairos.refresh_token')).toBe('r');
    expect(await AsyncStorage.getItem('kairos.user')).toBe(JSON.stringify(fakeUser));
    expect(setTokens).toHaveBeenCalledWith(fakeTokens);
  });

  it('updateTokens rotates tokens without touching user', async () => {
    await useAuthStore.getState().setSession(fakeTokens, fakeUser);
    setTokens.mockClear();
    await useAuthStore.getState().updateTokens({ accessToken: 'a2', refreshToken: 'r2' });
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('a2');
    expect(s.refreshToken).toBe('r2');
    expect(s.user).toEqual(fakeUser);
    expect(setTokens).toHaveBeenCalledWith({ accessToken: 'a2', refreshToken: 'r2' });
  });

  it('clearSession wipes memory + persistence + api-client cache when biometric is off', async () => {
    await useAuthStore.getState().setSession(fakeTokens, fakeUser);
    setTokens.mockClear();
    await useAuthStore.getState().clearSession();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.refreshToken).toBeNull();
    expect(s.user).toBeNull();
    expect(await SecureStore.getItemAsync('kairos.access_token')).toBeNull();
    expect(await AsyncStorage.getItem('kairos.user')).toBeNull();
    expect(setTokens).toHaveBeenCalledWith(null);
  });

  it('clearSession preserves the sealed token, biometric flag and cached profile when biometric is armed', async () => {
    // Otherwise "sign out, sign back in" breaks the biometric loop: the flag
    // gets cleared on sign-out, so handlePostLogin no-ops and the login screen
    // never shows the button again.
    await useAuthStore.getState().setSession(fakeTokens, fakeUser);
    await biometric.enable(fakeTokens.refreshToken, fakeUser.id);
    expect(await biometric.isEnabled()).toBe(true);

    await useAuthStore.getState().clearSession();

    // Live tokens gone
    expect(await SecureStore.getItemAsync('kairos.access_token')).toBeNull();
    expect(await SecureStore.getItemAsync('kairos.refresh_token')).toBeNull();
    // Biometric arming preserved
    expect(await biometric.isEnabled()).toBe(true);
    expect(await biometric.unlockRefreshToken('Fingerprint')).toBe(fakeTokens.refreshToken);
    // Cached profile preserved so signInWithBiometric can restore it
    expect(await AsyncStorage.getItem('kairos.user')).not.toBeNull();
  });

  it('setSession disarms biometric when a DIFFERENT account signs in', async () => {
    // First account opts in.
    await useAuthStore.getState().setSession(fakeTokens, fakeUser);
    await biometric.enable(fakeTokens.refreshToken, fakeUser.id);
    expect(await biometric.getSealedMemberId()).toBe(fakeUser.id);

    // Soft sign-out preserves biometric.
    await useAuthStore.getState().clearSession();
    expect(await biometric.isEnabled()).toBe(true);

    // Second account signs in. Biometric must NOT carry over — if it did, the
    // login screen would offer a "Sign in with Biometrics" button that logs
    // in as the FIRST account.
    const otherUser = { ...fakeUser, id: 'm2', email: 'c@d.co' };
    const otherTokens = { accessToken: 'a3', refreshToken: 'r3' };
    await useAuthStore.getState().setSession(otherTokens, otherUser);

    expect(await biometric.isEnabled()).toBe(false);
    expect(await biometric.getSealedMemberId()).toBeNull();
  });
});
