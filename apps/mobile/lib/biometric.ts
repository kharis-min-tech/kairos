import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Biometric sign-in — per-account.
 *
 * THE POINT OF THIS FILE, in one paragraph. A biometric prompt on its own is
 * theatre: `authenticateAsync()` returns a boolean, and anything that reads
 * the token store directly walks straight past it. So the gate here is not the
 * prompt — it is `requireAuthentication: true` on the SecureStore item itself,
 * which makes the OS keychain refuse to hand the refresh token over without a
 * successful biometric check. The prompt the user sees is raised BY that read,
 * not by us in front of it.
 *
 * MULTI-ACCOUNT MODEL. Each user who opts in has their own sealed entry in
 * the keychain and their own record in an armed-users list. Signing out or
 * signing in as a different account does NOT touch other users' entries —
 * matches how 1Password, Bitwarden, and native passkeys handle multi-account.
 *
 * Consequences worth knowing before changing any of this:
 *
 *   - The access token is NOT persisted while biometric is on. It is
 *     short-lived but still a bearer credential, and a copy on disk that the
 *     keychain will hand over freely would undo the whole arrangement.
 *   - Changing or removing the device's enrolled biometrics can permanently
 *     invalidate the stored items. That is the OS protecting the user, not a
 *     bug. Every read here therefore treats failure as "fall back to password
 *     sign-in", never as an error state that traps someone out of the app.
 *   - `requireAuthentication: true` throws at WRITE time on a device with no
 *     biometric enrolled, so `enable` checks enrolment first and reports
 *     honestly rather than half-enabling.
 */

/** JSON array of `ArmedUser` — who has opted in on this device. */
const KEY_ARMED_USERS = 'kairos.biometric_armed_users';
/** SecureStore key prefix for sealed refresh tokens, one per opted-in user. */
const KEY_REFRESH_PREFIX = 'kairos.biometric_refresh_';
/** AsyncStorage key prefix for "user said Not now on the enrolment prompt". */
const KEY_DECLINED_PREFIX = 'kairos.biometric_declined_';

// Legacy single-user keys, kept only long enough to migrate.
const LEGACY_KEY_REFRESH = 'kairos.biometric_refresh_token';
const LEGACY_KEY_ENABLED = 'kairos.biometric_enabled';
const LEGACY_KEY_MEMBER_ID = 'kairos.biometric_member_id';

export interface ArmedUser {
  id: string;
  displayName: string;
  email?: string;
  /** ISO timestamp — sorted most-recent-first when picking a default. */
  addedAt: string;
}

export interface BiometricCapability {
  /** The device has the hardware at all. */
  hasHardware: boolean;
  /** The user has actually enrolled a face/finger. Hardware alone is not enough. */
  isEnrolled: boolean;
  /**
   * What to call it in the UI. The old placeholder said "Face ID" next to a
   * fingerprint icon on Android, which was wrong on most devices in use.
   */
  label: string;
  /** True only when biometric sign-in can be offered right now. */
  available: boolean;
}

/**
 * What this device can actually do, and what to call it.
 *
 * Never hardcode "Face ID": ask the OS. A device commonly reports several
 * types — face + fingerprint on Android — and naming only one is misleading.
 */
export async function getCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFinger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS);
    const distinctCount = (hasFace ? 1 : 0) + (hasFinger ? 1 : 0) + (hasIris ? 1 : 0);

    let label = 'Biometrics';
    if (distinctCount === 1) {
      if (hasFace) label = 'Face ID';
      else if (hasIris) label = 'Iris';
      else if (hasFinger) label = 'Fingerprint';
    }

    return {
      hasHardware,
      isEnrolled,
      label,
      available: hasHardware && isEnrolled,
    };
  } catch {
    return { hasHardware: false, isEnrolled: false, label: 'Biometrics', available: false };
  }
}

// ── Armed users list ──────────────────────────────────────────────────────

function refreshKeyFor(memberId: string): string {
  return `${KEY_REFRESH_PREFIX}${memberId}`;
}

function declinedKeyFor(memberId: string): string {
  return `${KEY_DECLINED_PREFIX}${memberId}`;
}

/**
 * Everyone who has opted in on this device. Most recent first. Cheap read —
 * safe to call on every login-screen render.
 */
export async function listArmedUsers(): Promise<ArmedUser[]> {
  await migrateLegacyIfNeeded();
  try {
    const raw = await AsyncStorage.getItem(KEY_ARMED_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((u): u is ArmedUser => !!u && typeof u.id === 'string' && typeof u.displayName === 'string')
      .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''));
  } catch {
    return [];
  }
}

/** Convenience — is this specific member opted in? */
export async function isArmedFor(memberId: string): Promise<boolean> {
  const users = await listArmedUsers();
  return users.some((u) => u.id === memberId);
}

async function writeArmedUsers(users: ArmedUser[]): Promise<void> {
  await AsyncStorage.setItem(KEY_ARMED_USERS, JSON.stringify(users));
}

// ── Enrolment-prompt "not now" flag ───────────────────────────────────────

/**
 * True when the user tapped "Not now" on the one-time enrolment prompt for
 * this account. Persistent — we never ask that user again. They can still
 * opt in via Security.
 */
export async function hasDeclined(memberId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(declinedKeyFor(memberId))) === 'true';
  } catch {
    return false;
  }
}

export async function markDeclined(memberId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(declinedKeyFor(memberId), 'true');
  } catch {
    // Best effort — worst case we ask again on next login, which is not fatal.
  }
}

// ── Enable / disable ──────────────────────────────────────────────────────

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'no_hardware' | 'not_enrolled' | 'keychain_denied'; message?: string };

/**
 * Turn biometric sign-in on FOR THIS SPECIFIC USER by sealing their refresh
 * token behind the keychain's own authentication requirement, and adding them
 * to the armed-users list.
 *
 * Never throws — every failure resolves to a reason string the UI can render.
 * On Android the SecureStore write raises a biometric prompt itself; a
 * cancelled prompt therefore reaches this catch as `keychain_denied`.
 */
export async function enable(refreshToken: string, user: ArmedUser): Promise<EnableResult> {
  const cap = await getCapability();
  if (!cap.hasHardware) return { ok: false, reason: 'no_hardware' };
  if (!cap.isEnrolled) return { ok: false, reason: 'not_enrolled' };

  try {
    await SecureStore.setItemAsync(refreshKeyFor(user.id), refreshToken, {
      requireAuthentication: true,
      // iOS only, and deliberately the strictest sensible option: unreadable
      // while the device is locked and never leaves this device in a backup.
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      authenticationPrompt: 'Confirm to enable biometric sign-in',
    });
    const current = await listArmedUsers();
    const next = [
      { ...user, addedAt: user.addedAt || new Date(0).toISOString() },
      ...current.filter((u) => u.id !== user.id),
    ];
    await writeArmedUsers(next);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn('[biometric.enable] refused:', message);
    // Leave nothing half-configured for this user.
    await disable(user.id);
    return { ok: false, reason: 'keychain_denied', message };
  }
}

/**
 * Turn biometric off for ONE user. Safe to call when already off. Does not
 * touch other users' entries.
 */
export async function disable(memberId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(refreshKeyFor(memberId));
  } catch {
    // Even when the OS refuses to surface the item, the list entry must still
    // go so the login screen doesn't offer a button that cannot work.
  }
  try {
    const current = await listArmedUsers();
    const next = current.filter((u) => u.id !== memberId);
    if (next.length === current.length) return;
    await writeArmedUsers(next);
  } catch {
    // Nothing useful to do; the next read defaults to no armed users.
  }
}

// ── Unlock ────────────────────────────────────────────────────────────────

/**
 * Read the sealed refresh token for a specific user. THIS is what raises the
 * biometric prompt, and the OS decides, not us.
 *
 * Returns null on any failure: cancelled, no match, enrolment changed since it
 * was sealed, item missing. Every one of those means the same thing to the
 * caller — sign in with a password instead — so they are deliberately not
 * distinguished.
 */
export async function unlockRefreshToken(
  memberId: string,
  promptLabel: string,
): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(refreshKeyFor(memberId), {
      requireAuthentication: true,
      authenticationPrompt: `Sign in with ${promptLabel}`,
    });
    return token ?? null;
  } catch {
    return null;
  }
}

// ── Design note: no automatic reseal ─────────────────────────────────────
//
// Earlier iterations resealed the sealed token after every login so the
// window auto-extended. On iOS this was silent; on Android a SecureStore
// write under `requireAuthentication` raises a biometric prompt, so every
// sign-in was greeted with a "Confirm to enable biometric sign-in" prompt
// right after the user had just proved their identity. Password sign-ins
// got one such prompt, biometric sign-ins got TWO (the unlock and the
// reseal), and it read as broken.
//
// The seal is now touched only when the user explicitly asks for it: the
// enrolment modal on the login screen for first-time opt-in, and the toggle
// on the Security screen for on/off. That means the sealed refresh token
// keeps its original TTL from arming — currently 1 year, matching
// consumer-app norms (see apps/api DEFAULT_REFRESH_EXPIRY). When it
// eventually expires biometric fails once, the user password-signs-in, and
// can re-arm from Security if they want another window.
//
// The proper long-term fix is a WebAuthn-style device keypair that
// decouples biometric arming from the session token, so biometric never
// expires on the device — filed as a backlog.

// ── Clean up the legacy single-user keys on first read ───────────────────
//
// The pre-2026-09-30 build stored ONE flag + ONE sealed token + ONE member id.
// We deliberately do NOT carry that arming forward into the multi-account
// schema: the sealed value cannot be moved out of SecureStore without raising
// a biometric prompt, and the enrolment prompt now fires on the very next
// login for anyone not opted in, so re-opt-in is one tap. The alternative
// (keeping a legacy-fallback branch inside unlockRefreshToken) is a
// permanent maintenance tax for a one-time drop-in cost.

let cleanupDone = false;

async function migrateLegacyIfNeeded(): Promise<void> {
  if (cleanupDone) return;
  cleanupDone = true;
  try {
    await Promise.all([
      AsyncStorage.removeItem(LEGACY_KEY_ENABLED),
      AsyncStorage.removeItem(LEGACY_KEY_MEMBER_ID),
      SecureStore.deleteItemAsync(LEGACY_KEY_REFRESH),
    ]);
  } catch {
    // Failure here means we may try to clean up again on the next read — no
    // harm done, the delete is idempotent.
  }
}

// Test-only reset for the cleanup guard.
export function __resetMigrationForTests(): void {
  cleanupDone = false;
}
