import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Biometric sign-in.
 *
 * THE POINT OF THIS FILE, in one paragraph. A biometric prompt on its own is
 * theatre: `authenticateAsync()` returns a boolean, and anything that reads
 * the token store directly walks straight past it. So the gate here is not the
 * prompt — it is `requireAuthentication: true` on the SecureStore item itself,
 * which makes the OS keychain refuse to hand the refresh token over without a
 * successful biometric check. The prompt the user sees is raised BY that read,
 * not by us in front of it.
 *
 * Consequences worth knowing before changing any of this:
 *
 *   - The access token is NOT persisted while biometric is on. It is
 *     short-lived but still a bearer credential, and a copy on disk that the
 *     keychain will hand over freely would undo the whole arrangement. On
 *     launch we read the refresh token (one prompt) and exchange it.
 *   - Changing or removing the device's enrolled biometrics can permanently
 *     invalidate the stored item. That is the OS protecting the user, not a
 *     bug. Every read here therefore treats failure as "fall back to password
 *     sign-in", never as an error state that traps someone out of the app.
 *   - `requireAuthentication: true` throws at WRITE time on a device with no
 *     biometric enrolled, so `setEnabled` checks enrolment first and reports
 *     honestly rather than half-enabling.
 */

const KEY_BIOMETRIC_REFRESH = 'kairos.biometric_refresh_token';
/**
 * The opt-in flag lives in AsyncStorage, NOT SecureStore. It has to be
 * readable without a prompt: the login screen needs to know whether to offer
 * the button before it can ask for a fingerprint.
 */
const KEY_BIOMETRIC_ENABLED = 'kairos.biometric_enabled';
/**
 * Which member the sealed refresh token belongs to. Written alongside the
 * seal, read on subsequent password/OAuth logins so that signing in as a
 * DIFFERENT account disarms biometric — otherwise a second account would
 * silently inherit the first account's opt-in.
 */
const KEY_BIOMETRIC_MEMBER_ID = 'kairos.biometric_member_id';

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
 * Never hardcode "Face ID": ask the OS. A device can report several types, so
 * prefer face over iris over fingerprint for the label, matching what a user
 * would call it.
 */
export async function getCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    // Devices commonly report BOTH face + fingerprint. Naming only one there
    // is misleading — a user with fingerprint set up would see "Face ID"
    // beside a fingerprint icon and wonder what happened. Fall back to a
    // neutral term when the device advertises more than one method.
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

/** Whether the user has turned biometric sign-in on. Never prompts. */
export async function isEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_BIOMETRIC_ENABLED)) === 'true';
  } catch {
    return false;
  }
}

/**
 * Discriminated result from {@link enable}. The `reason` on failure exists so
 * the caller can tell the user WHY the OS refused — an empty catch swallowed
 * that during earlier testing and made a real "device declined the write"
 * indistinguishable from a "user cancelled the prompt".
 */
export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'no_hardware' | 'not_enrolled' | 'keychain_denied'; message?: string };

/**
 * Turn biometric sign-in on by sealing the refresh token behind the keychain's
 * own authentication requirement.
 *
 * `memberId` binds the sealed token to a specific account so subsequent
 * password/OAuth logins for a DIFFERENT account correctly disarm biometric
 * rather than silently inheriting the opt-in.
 *
 * Never throws — every failure resolves to a reason string the UI can render.
 * On Android the SecureStore write raises a biometric prompt itself; a
 * cancelled prompt therefore reaches this catch as `keychain_denied`.
 */
export async function enable(refreshToken: string, memberId: string): Promise<EnableResult> {
  const cap = await getCapability();
  if (!cap.hasHardware) return { ok: false, reason: 'no_hardware' };
  if (!cap.isEnrolled) return { ok: false, reason: 'not_enrolled' };

  try {
    await SecureStore.setItemAsync(KEY_BIOMETRIC_REFRESH, refreshToken, {
      requireAuthentication: true,
      // iOS only, and deliberately the strictest sensible option: the item is
      // unreadable while the device is locked and never leaves this device in
      // a backup.
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      authenticationPrompt: 'Confirm to enable biometric sign-in',
    });
    await Promise.all([
      AsyncStorage.setItem(KEY_BIOMETRIC_ENABLED, 'true'),
      AsyncStorage.setItem(KEY_BIOMETRIC_MEMBER_ID, memberId),
    ]);
    return { ok: true };
  } catch (err) {
    // Common shapes reaching here on Android:
    //   - User cancelled the biometric prompt
    //   - Device biometric is Class 2 (Weak) and cannot back a Keystore key
    //   - No device lock screen configured
    //   - Enrolment vanished between the capability check and the write
    // The message is not always user-friendly, but it is diagnostic enough
    // to distinguish these when a user reports "it doesn't work".
    const message = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn('[biometric.enable] refused:', message);
    await disable();
    return { ok: false, reason: 'keychain_denied', message };
  }
}

/** Turn it off and remove the sealed token. Safe to call when already off. */
export async function disable(): Promise<void> {
  try {
    // No requireAuthentication on delete: expo-secure-store does not need it
    // to remove an item, and passing it here has been observed to raise a
    // second biometric prompt on some Android SDK versions.
    await SecureStore.deleteItemAsync(KEY_BIOMETRIC_REFRESH);
  } catch {
    // Deleting an item the OS will not surface still needs to leave the flag
    // off, so swallow and continue.
  }
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEY_BIOMETRIC_ENABLED),
      AsyncStorage.removeItem(KEY_BIOMETRIC_MEMBER_ID),
    ]);
  } catch {
    // Nothing useful to do; the next read defaults to disabled.
  }
}

/** Which member the sealed token belongs to. null if biometric is off. */
export async function getSealedMemberId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_BIOMETRIC_MEMBER_ID);
  } catch {
    return null;
  }
}

/**
 * Read the sealed refresh token. THIS is what raises the biometric prompt, and
 * the OS decides, not us.
 *
 * Returns null on any failure: cancelled, no match, enrolment changed since it
 * was sealed, item missing. Every one of those means the same thing to the
 * caller — sign in with a password instead — so they are deliberately not
 * distinguished.
 */
export async function unlockRefreshToken(promptLabel: string): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(KEY_BIOMETRIC_REFRESH, {
      requireAuthentication: true,
      authenticationPrompt: `Sign in with ${promptLabel}`,
    });
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Called after any successful sign-in — password OR OAuth — to keep the seal
 * consistent with who is actually signed in.
 *
 * Three cases:
 *  1. Biometric is off → nothing to do.
 *  2. Biometric is armed for THIS member → reseal with the new refresh token
 *     to refresh its window (currently 90d, see apps/api DEFAULT_REFRESH_EXPIRY).
 *  3. Biometric is armed for a DIFFERENT member → disarm entirely. Otherwise
 *     the second account would silently inherit the first account's opt-in,
 *     and on next launch the login screen would offer a "sign in with
 *     Biometrics" button that logs in as the FIRST account.
 *
 * WHY THERE IS NO RESEAL ON SILENT TOKEN REFRESH. `/api/auth/refresh` mints a
 * new refresh token, but tokens are stateless JWTs with no server-side
 * rotation tracking, so the previously sealed one stays valid until its own
 * expiry. Resealing on every silent refresh would buy nothing and cost a
 * biometric prompt each time — on Android a keychain WRITE under
 * `requireAuthentication` prompts, so it would fire mid-session, repeatedly.
 * Biometric sign-in therefore lasts the length of the refresh window from the
 * last password login, then falls back to the password screen which re-arms
 * it via this function. Any password login inside the window rearms too, so
 * regular users effectively never see the password screen.
 */
export async function handlePostLogin(
  refreshToken: string,
  memberId: string,
): Promise<void> {
  if (!(await isEnabled())) return;
  const sealedFor = await getSealedMemberId();
  if (sealedFor && sealedFor !== memberId) {
    // A different account is signing in. Wipe biometric so this account has
    // to opt in explicitly via Security.
    await disable();
    return;
  }
  await enable(refreshToken, memberId);
}
