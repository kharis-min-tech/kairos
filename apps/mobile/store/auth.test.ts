import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './auth';
import * as apiClient from '@/lib/api-client';

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

  it('clearSession wipes memory + persistence + api-client cache', async () => {
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
});
