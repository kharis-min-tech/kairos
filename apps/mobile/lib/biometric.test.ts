/**
 * Guards multi-account biometric sign-in.
 *
 * The thing under test is NOT "does a prompt appear". It is that each opted-in
 * user's refresh token is sealed with `requireAuthentication` under a distinct
 * per-user key, that signing in / out one account never touches another's
 * arming, and that every failure degrades to "sign in with your password"
 * rather than trapping someone out of the app or leaving a token readable.
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

const REFRESH_KEY = (id: string) => `kairos.biometric_refresh_${id}`;

function mockTypes(...types: number[]) {
  (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue(
    types,
  );
}

const alice = {
  id: 'user-alice',
  displayName: 'Alice Test',
  email: 'alice@example.com',
  addedAt: '2026-09-30T00:00:00.000Z',
};

const bob = {
  id: 'user-bob',
  displayName: 'Bob Test',
  email: 'bob@example.com',
  addedAt: '2026-09-30T01:00:00.000Z',
};

beforeEach(async () => {
  jest.clearAllMocks();
  secure.__reset();
  await AsyncStorage.clear();
  biometric.__resetMigrationForTests();
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

  it('says "Biometrics" when a device reports several methods', async () => {
    mockTypes(
      LocalAuthentication.AuthenticationType.FINGERPRINT,
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );
    expect((await biometric.getCapability()).label).toBe('Biometrics');
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
  it('seals THIS user\'s token with requireAuthentication and adds them to the armed list', async () => {
    const result = await biometric.enable('refresh-a', alice);
    expect(result).toEqual({ ok: true });

    const opts = secure.setItemAsync.mock.calls.find((c) => c[0] === REFRESH_KEY(alice.id))?.[2];
    expect(opts).toMatchObject({ requireAuthentication: true });
    expect(await biometric.isArmedFor(alice.id)).toBe(true);
    expect(await biometric.listArmedUsers()).toEqual([
      expect.objectContaining({ id: alice.id, displayName: alice.displayName }),
    ]);
  });

  it('reports the reason when hardware is absent', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
    expect(await biometric.enable('refresh-a', alice)).toEqual({
      ok: false,
      reason: 'no_hardware',
    });
  });

  it('refuses on a device with no enrolment, rather than half-arming', async () => {
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    const result = await biometric.enable('refresh-a', alice);
    expect(result).toMatchObject({ ok: false, reason: 'not_enrolled' });
    expect(await biometric.isArmedFor(alice.id)).toBe(false);
    expect(secure.__has(REFRESH_KEY(alice.id))).toBe(false);
  });

  it('leaves nothing half-configured when the keychain write is refused', async () => {
    secure.__denyAuth(true);
    const result = await biometric.enable('refresh-a', alice);
    expect(result).toMatchObject({ ok: false, reason: 'keychain_denied' });
    expect(await biometric.isArmedFor(alice.id)).toBe(false);
  });

  it('two users on the same device stay independent', async () => {
    await biometric.enable('refresh-a', alice);
    await biometric.enable('refresh-b', bob);
    expect(await biometric.isArmedFor(alice.id)).toBe(true);
    expect(await biometric.isArmedFor(bob.id)).toBe(true);
    expect(secure.__has(REFRESH_KEY(alice.id))).toBe(true);
    expect(secure.__has(REFRESH_KEY(bob.id))).toBe(true);
  });
});

describe('unlockRefreshToken', () => {
  it('returns the token when the keychain unseals it', async () => {
    await biometric.enable('refresh-a', alice);
    expect(await biometric.unlockRefreshToken(alice.id, 'Fingerprint')).toBe('refresh-a');
  });

  it('reads it back under requireAuthentication, not as a plain read', async () => {
    await biometric.enable('refresh-a', alice);
    secure.getItemAsync.mockClear();
    await biometric.unlockRefreshToken(alice.id, 'Fingerprint');
    const opts = secure.getItemAsync.mock.calls.find((c) => c[0] === REFRESH_KEY(alice.id))?.[1];
    expect(opts).toMatchObject({ requireAuthentication: true });
  });

  it('returns null when the prompt is cancelled or the finger does not match', async () => {
    await biometric.enable('refresh-a', alice);
    secure.__denyAuth(true);
    expect(await biometric.unlockRefreshToken(alice.id, 'Fingerprint')).toBeNull();
  });

  it('returns null when nothing was ever sealed for this user', async () => {
    expect(await biometric.unlockRefreshToken(alice.id, 'Fingerprint')).toBeNull();
  });

  it('does NOT unlock user B\'s token when asked for user A', async () => {
    await biometric.enable('refresh-a', alice);
    await biometric.enable('refresh-b', bob);
    expect(await biometric.unlockRefreshToken(alice.id, 'Fingerprint')).toBe('refresh-a');
    expect(await biometric.unlockRefreshToken(bob.id, 'Fingerprint')).toBe('refresh-b');
  });
});

describe('disable', () => {
  it('drops only the target user\'s sealed token and list entry', async () => {
    await biometric.enable('refresh-a', alice);
    await biometric.enable('refresh-b', bob);
    await biometric.disable(alice.id);
    expect(await biometric.isArmedFor(alice.id)).toBe(false);
    expect(await biometric.isArmedFor(bob.id)).toBe(true);
    expect(secure.__has(REFRESH_KEY(alice.id))).toBe(false);
    expect(secure.__has(REFRESH_KEY(bob.id))).toBe(true);
  });

  it('still removes the list entry when the OS refuses to delete the sealed item', async () => {
    await biometric.enable('refresh-a', alice);
    secure.__denyAuth(true);
    await biometric.disable(alice.id);
    expect(await biometric.isArmedFor(alice.id)).toBe(false);
  });

  it('is safe to call for a user who was never armed', async () => {
    await expect(biometric.disable(alice.id)).resolves.toBeUndefined();
  });
});

describe('hasDeclined / markDeclined', () => {
  it('remembers who has said "Not now"', async () => {
    expect(await biometric.hasDeclined(alice.id)).toBe(false);
    await biometric.markDeclined(alice.id);
    expect(await biometric.hasDeclined(alice.id)).toBe(true);
    expect(await biometric.hasDeclined(bob.id)).toBe(false);
  });
});

describe('legacy cleanup', () => {
  it('removes the pre-2026-09-30 single-user keys on first read', async () => {
    await AsyncStorage.setItem('kairos.biometric_enabled', 'true');
    await AsyncStorage.setItem('kairos.biometric_member_id', 'legacy-user');
    await SecureStore.setItemAsync('kairos.biometric_refresh_token', 'legacy-refresh');

    // First call migrates.
    await biometric.listArmedUsers();

    expect(await AsyncStorage.getItem('kairos.biometric_enabled')).toBeNull();
    expect(await AsyncStorage.getItem('kairos.biometric_member_id')).toBeNull();
    expect(secure.__has('kairos.biometric_refresh_token')).toBe(false);
    // No armed users carried forward — the user re-opts in via the enrolment
    // prompt on their next login.
    expect(await biometric.listArmedUsers()).toEqual([]);
  });
});

// ── The sealed token's MFA claim ─────────────────────────────────────────
//
// These guard the fix for a bug that made biometric fail permanently, not
// intermittently. A member who armed biometric before enrolling a second
// factor had a token sealed with `mfa: false`; once they confirmed a factor
// the API refused it on every refresh, nothing resealed, and the login screen
// advised a password sign-in that did not repair it either. So the properties
// that matter are: the flag always describes what is actually sealed, and a
// refused reseal costs the user nothing.

/** A refresh token shaped like the real one, with just the claim under test. */
function tokenWith(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig`;
}

const MFA_TOKEN = tokenWith({ memberId: 'user-alice', mfa: true, tv: 0 });
const PLAIN_TOKEN = tokenWith({ memberId: 'user-alice', mfa: false, tv: 0 });

describe('tokenHasMfa', () => {
  it('reads the claim', () => {
    expect(biometric.tokenHasMfa(MFA_TOKEN)).toBe(true);
    expect(biometric.tokenHasMfa(PLAIN_TOKEN)).toBe(false);
  });

  /**
   * Every unreadable shape resolves to false, because false means "assume the
   * seal is stale", which costs at most one unnecessary reseal offer. True
   * would mean trusting a seal we cannot vouch for and leaving biometric
   * broken with no way out, which is the bug being fixed.
   */
  it.each([
    ['null', null],
    ['empty', ''],
    ['not a JWT', 'nonsense'],
    ['two segments', 'a.b'],
    ['payload is not JSON', 'aaa.bbb.ccc'],
    ['claim absent', tokenWith({ memberId: 'user-alice' })],
    ['claim is the string true', tokenWith({ mfa: 'true' })],
  ])('treats %s as not satisfied', (_label, token) => {
    expect(biometric.tokenHasMfa(token as string | null)).toBe(false);
  });
});

describe('the seal MFA flag', () => {
  it('is false for a user who was never armed', async () => {
    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(false);
  });

  it('records what enable actually sealed', async () => {
    await biometric.enable(PLAIN_TOKEN, alice);
    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(false);

    await biometric.enable(MFA_TOKEN, alice);
    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(true);
  });

  it('goes with the seal when biometric is turned off', async () => {
    await biometric.enable(MFA_TOKEN, alice);
    await biometric.disable(alice.id);
    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(false);
  });

  it('is per user', async () => {
    await biometric.enable(MFA_TOKEN, alice);
    await biometric.enable(PLAIN_TOKEN, bob);
    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(true);
    expect(await biometric.sealedTokenHasMfa(bob.id)).toBe(false);
  });
});

describe('reseal', () => {
  it('replaces the sealed token and updates the flag', async () => {
    await biometric.enable(PLAIN_TOKEN, alice);
    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(false);

    expect(await biometric.reseal(alice.id, MFA_TOKEN)).toBe(true);

    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(true);
    expect(await biometric.unlockRefreshToken(alice.id, 'Fingerprint')).toBe(MFA_TOKEN);
  });

  it('seals under requireAuthentication, like enable does', async () => {
    await biometric.enable(PLAIN_TOKEN, alice);
    secure.setItemAsync.mockClear();
    await biometric.reseal(alice.id, MFA_TOKEN);

    expect(secure.setItemAsync).toHaveBeenCalledWith(
      REFRESH_KEY(alice.id),
      MFA_TOKEN,
      expect.objectContaining({ requireAuthentication: true }),
    );
  });

  /**
   * The property that separates reseal from enable. A refused prompt during
   * first-time opt-in leaves a button that cannot work, so enable cleans up by
   * disarming. A refused prompt during a repair must cost nothing: the user
   * did not ask for it, and disarming them would turn a cancelled dialog into
   * a lost feature.
   */
  it('leaves the user armed when the keychain refuses', async () => {
    await biometric.enable(PLAIN_TOKEN, alice);
    secure.__denyAuth(true);

    expect(await biometric.reseal(alice.id, MFA_TOKEN)).toBe(false);

    secure.__denyAuth(false);
    expect(await biometric.isArmedFor(alice.id)).toBe(true);
    // Still the old token, and still flagged stale, so the offer comes back.
    expect(await biometric.sealedTokenHasMfa(alice.id)).toBe(false);
    expect(await biometric.unlockRefreshToken(alice.id, 'Fingerprint')).toBe(PLAIN_TOKEN);
  });

  it('does nothing when the device cannot do biometrics', async () => {
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    expect(await biometric.reseal(alice.id, MFA_TOKEN)).toBe(false);
    expect(secure.__has(REFRESH_KEY(alice.id))).toBe(false);
  });
});
