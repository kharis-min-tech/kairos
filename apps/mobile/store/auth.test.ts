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

  it('setSession does not reseal biometric for an ordinary sign-in', async () => {
    // Automatic reseal on every login used to raise a keychain-write biometric
    // prompt on Android, so users got a second prompt right after logging in.
    // Arming therefore stays user-initiated: the enrolment modal or the
    // Security toggle.
    //
    // One narrow repair was added on 19 November 2026 and does not weaken this
    // test, because `r-new` carries no `mfa` claim and the repair fires only
    // when that claim goes from false to true. See the describe block below.
    const armed = {
      id: fakeUser.id,
      displayName: 'Alice Test',
      email: fakeUser.email,
      addedAt: '2026-09-30T00:00:00.000Z',
    };
    await biometric.enable('r-original', armed);

    await useAuthStore.getState().setSession({ accessToken: 'a2', refreshToken: 'r-new' }, fakeUser);

    // Sealed token is UNCHANGED — no prompt was raised, and the pre-existing
    // sealed value is what a biometric login would still unlock.
    expect(await biometric.unlockRefreshToken(fakeUser.id, 'Fingerprint')).toBe('r-original');
  });
});

/**
 * Repairing a seal that predates the member's second factor.
 *
 * Mandatory MFA broke biometric for anyone who armed it first. Their sealed
 * token carries `mfa: false`; once they confirm a factor the API refuses it on
 * every refresh, and nothing replaced it, so biometric failed permanently
 * while the login screen advised a password sign-in that did not repair it
 * either. The recovery was toggling biometric off and on in Security, which
 * nothing told them.
 *
 * The repair is gated on the claim CHANGING from false to true. That gate is
 * what keeps it from becoming the thing it replaced: a keychain prompt after
 * every single sign-in.
 */
describe('useAuthStore — the biometric seal and the second factor', () => {
  /** A refresh token shaped like the real one, carrying just the claim. */
  const tokenWith = (claims: Record<string, unknown>) => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig`;
  };
  const MFA_REFRESH = tokenWith({ memberId: 'm1', mfa: true, tv: 0 });
  const PLAIN_REFRESH = tokenWith({ memberId: 'm1', mfa: false, tv: 0 });

  const armAlice = async (refreshToken: string) =>
    biometric.enable(refreshToken, {
      id: fakeUser.id,
      displayName: 'Alice Test',
      email: fakeUser.email,
      addedAt: '2026-09-30T00:00:00.000Z',
    });

  it('reseals when the claim goes from false to true', async () => {
    await armAlice(PLAIN_REFRESH);
    expect(await biometric.sealedTokenHasMfa(fakeUser.id)).toBe(false);

    await useAuthStore
      .getState()
      .setSession({ accessToken: 'a2', refreshToken: MFA_REFRESH }, fakeUser);

    expect(await biometric.sealedTokenHasMfa(fakeUser.id)).toBe(true);
    expect(await biometric.unlockRefreshToken(fakeUser.id, 'Fingerprint')).toBe(MFA_REFRESH);
  });

  it('only does it once, because the flag moves with the seal', async () => {
    await armAlice(PLAIN_REFRESH);
    await useAuthStore
      .getState()
      .setSession({ accessToken: 'a2', refreshToken: MFA_REFRESH }, fakeUser);

    const later = tokenWith({ memberId: 'm1', mfa: true, tv: 1 });
    (SecureStore.setItemAsync as jest.Mock).mockClear();
    await useAuthStore.getState().setSession({ accessToken: 'a3', refreshToken: later }, fakeUser);

    const resealWrites = (SecureStore.setItemAsync as jest.Mock).mock.calls.filter(
      ([key]) => key === `kairos.biometric_refresh_${fakeUser.id}`,
    );
    expect(resealWrites).toHaveLength(0);
  });

  /**
   * The anti-nag property, and the reason the gate is a transition rather than
   * "is the seal missing the claim". A member with no second factor gets
   * `mfa: false` on every token they will ever hold, so a weaker gate would
   * raise a keychain prompt at every sign-in forever, which is exactly the
   * behaviour this design replaced.
   */
  it('does not reseal for a member with no second factor', async () => {
    await armAlice(PLAIN_REFRESH);
    (SecureStore.setItemAsync as jest.Mock).mockClear();

    await useAuthStore
      .getState()
      .setSession({ accessToken: 'a2', refreshToken: PLAIN_REFRESH }, fakeUser);

    const resealWrites = (SecureStore.setItemAsync as jest.Mock).mock.calls.filter(
      ([key]) => key === `kairos.biometric_refresh_${fakeUser.id}`,
    );
    expect(resealWrites).toHaveLength(0);
    expect(await biometric.sealedTokenHasMfa(fakeUser.id)).toBe(false);
  });

  it('never arms biometric for a member who has not opted in', async () => {
    await useAuthStore
      .getState()
      .setSession({ accessToken: 'a2', refreshToken: MFA_REFRESH }, fakeUser);

    expect(await biometric.isArmedFor(fakeUser.id)).toBe(false);
    expect(await biometric.sealedTokenHasMfa(fakeUser.id)).toBe(false);
  });

  /**
   * The session being persisted has already succeeded. A refused keychain
   * prompt is the user declining a repair they never asked for, and it must
   * not make a good sign-in look broken or cost them the biometric they had.
   */
  it('still establishes the session when the repair is refused, and keeps the user armed', async () => {
    await armAlice(PLAIN_REFRESH);
    const secure = SecureStore as unknown as { __denyAuth: (v: boolean) => void };
    secure.__denyAuth(true);

    await expect(
      useAuthStore.getState().setSession({ accessToken: 'a2', refreshToken: MFA_REFRESH }, fakeUser),
    ).resolves.toBeUndefined();

    expect(useAuthStore.getState().accessToken).toBe('a2');

    secure.__denyAuth(false);
    expect(await biometric.isArmedFor(fakeUser.id)).toBe(true);
    // Flag untouched, so the repair is offered again next sign-in.
    expect(await biometric.sealedTokenHasMfa(fakeUser.id)).toBe(false);
  });
});
