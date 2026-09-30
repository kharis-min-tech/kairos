import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './auth';
import * as apiClient from '@/lib/api-client';
import * as biometric from '@/lib/biometric';

jest.mock('@/lib/api-client', () => ({
  setSessionTokens: jest.fn(),
  registerAuthCallbacks: jest.fn(),
  api: {
    auth: { refresh: jest.fn() },
    members: { me: jest.fn() },
  },
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

const fakeUser = {
  id: 'm1',
  email: 'a@b.co',
  firstName: 'Alice',
  lastName: 'Test',
} as unknown as Parameters<ReturnType<typeof useAuthStore.getState>['setSession']>[1];

const fakeTokens = { accessToken: 'a', refreshToken: 'r' };

beforeEach(async () => {
  setTokens.mockClear();
  resetStore();
  await resetPersistence();
  biometric.__resetMigrationForTests();
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

  it('clearSession drops live tokens + cached user, unconditionally', async () => {
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

  it('clearSession never touches any user\'s biometric arming', async () => {
    // Two users have opted in on this device.
    const armedAlice = {
      id: fakeUser.id,
      displayName: 'Alice Test',
      email: fakeUser.email,
      addedAt: '2026-09-30T00:00:00.000Z',
    };
    const armedBob = {
      id: 'm2',
      displayName: 'Bob',
      email: 'b@c.co',
      addedAt: '2026-09-30T01:00:00.000Z',
    };
    await biometric.enable('r-alice', armedAlice);
    await biometric.enable('r-bob', armedBob);
    expect(await biometric.isArmedFor(armedAlice.id)).toBe(true);
    expect(await biometric.isArmedFor(armedBob.id)).toBe(true);

    // Alice signs in then out. Bob's arming must not care.
    await useAuthStore.getState().setSession(fakeTokens, fakeUser);
    await useAuthStore.getState().clearSession();

    expect(await biometric.isArmedFor(armedAlice.id)).toBe(true);
    expect(await biometric.isArmedFor(armedBob.id)).toBe(true);
    // Cached "who was last signed in" DOES go — nothing about biometric depends on it.
    expect(await AsyncStorage.getItem('kairos.user')).toBeNull();
  });

  it('setSession as user B does not touch user A\'s biometric arming', async () => {
    const armedAlice = {
      id: fakeUser.id,
      displayName: 'Alice Test',
      email: fakeUser.email,
      addedAt: '2026-09-30T00:00:00.000Z',
    };
    await biometric.enable('r-alice', armedAlice);

    // User B signs in with password. Alice's arming is left alone entirely.
    const userB = {
      id: 'm2',
      email: 'c@d.co',
      firstName: 'Bob',
      lastName: 'Test',
    } as unknown as typeof fakeUser;
    await useAuthStore.getState().setSession({ accessToken: 'a3', refreshToken: 'r3' }, userB);

    expect(await biometric.isArmedFor(armedAlice.id)).toBe(true);
    expect(await biometric.unlockRefreshToken(armedAlice.id, 'Fingerprint')).toBe('r-alice');
    expect(await biometric.isArmedFor('m2')).toBe(false);
  });

  it('setSession reseals biometric for the same user', async () => {
    const armed = {
      id: fakeUser.id,
      displayName: 'Alice Test',
      email: fakeUser.email,
      addedAt: '2026-09-30T00:00:00.000Z',
    };
    await biometric.enable('r-original', armed);

    // Same user password-signs-in again with a freshly minted refresh token.
    await useAuthStore.getState().setSession({ accessToken: 'a2', refreshToken: 'r-new' }, fakeUser);

    // 90-day window refreshed against the new token.
    expect(await biometric.unlockRefreshToken(fakeUser.id, 'Fingerprint')).toBe('r-new');
  });
});
