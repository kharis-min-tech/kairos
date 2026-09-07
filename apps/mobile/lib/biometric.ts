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

    let label = 'Biometrics';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      label = 'Iris';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = 'Fingerprint';
    }

    return {
      hasHardware,
      isEnrolled,
      label,
      available: hasHardware && isEnrolled,
    };
  } catch {
    // A device or simulator that cannot answer is a device that cannot do it.
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
 * Turn biometric sign-in on by sealing the refresh token behind the keychain's
 * own authentication requirement.
 *
 * Returns false rather than throwing when the device cannot do it, so callers
 * can tell the user plainly instead of showing a crash.
 */
export async function enable(refreshToken: string): Promise<boolean> {
  const cap = await getCapability();
  if (!cap.available) return false;

  try {
    await SecureStore.setItemAsync(KEY_BIOMETRIC_REFRESH, refreshToken, {
      requireAuthentication: true,
      // iOS only, and deliberately the strictest sensible option: the item is
      // unreadable while the device is locked and never leaves this device in
      // a backup.
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      authenticationPrompt: 'Confirm to enable biometric sign-in',
    });
    await AsyncStorage.setItem(KEY_BIOMETRIC_ENABLED, 'true');
    return true;
  } catch {
    // Enrolment can vanish between the capability check and the write. Leave
    // nothing half-configured.
    await disable();
    return false;
  }
}

/** Turn it off and remove the sealed token. Safe to call when already off. */
export async function disable(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY_BIOMETRIC_REFRESH, {
      requireAuthentication: true,
    });
  } catch {
    // Deleting an item the OS will not unseal still needs to leave the flag
    // off, so swallow and continue.
  }
  try {
    await AsyncStorage.removeItem(KEY_BIOMETRIC_ENABLED);
  } catch {
    // Nothing useful to do; the next read defaults to disabled.
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
 * Refresh the sealed token during an explicit password sign-in.
 *
 * WHY THERE IS NO RESEAL ON TOKEN REFRESH. `/api/auth/refresh` mints a new
 * refresh token, but the tokens are stateless JWTs with no server-side
 * rotation tracking, so the previously sealed one stays valid until its own
 * 7-day expiry. Resealing on every silent refresh would therefore buy nothing
 * and cost a biometric prompt each time — on Android a keychain WRITE under
 * `requireAuthentication` prompts, so it would fire mid-session, repeatedly,
 * for no reason. That is a far worse bug than the one it would prevent.
 *
 * The consequence, stated plainly: biometric sign-in lasts up to 7 days from
 * the moment it was armed, then falls back to the password screen, which
 * re-arms it via this function. A periodic full re-authentication is a
 * reasonable posture rather than a limitation to engineer around.
 */
export async function rearmAfterPasswordLogin(refreshToken: string): Promise<void> {
  if (!(await isEnabled())) return;
  await enable(refreshToken);
}
