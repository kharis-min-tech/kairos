import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Token storage that also works in the browser.
 *
 * `expo-secure-store` is native-only: on web its module is a stub, and the
 * first call fails with "ExpoSecureStore.default.setValueWithKeyAsync is not a
 * function". That makes the web build impossible to sign into, which is where
 * the app is easiest to demo and review.
 *
 * On iOS and Android nothing changes — every call goes straight to the
 * Keychain / Keystore as before.
 *
 * On web the fallback is `sessionStorage`, chosen over `localStorage` so the
 * tokens die with the tab rather than sitting on disk. It is NOT equivalent
 * security: anything running in the page can read them. The web target is a
 * development and review surface, not a shipping one. If Kairos is ever
 * actually released on the web, replace this with httpOnly cookies and delete
 * the fallback — do not simply promote it.
 */
const isWeb = Platform.OS === 'web';

function webStore(): Storage | null {
  try {
    // Absent in SSR, and throws outright when cookies are blocked.
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export async function getItemAsync(
  key: string,
  options?: SecureStore.SecureStoreOptions,
): Promise<string | null> {
  if (!isWeb) return SecureStore.getItemAsync(key, options);
  try {
    return webStore()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function setItemAsync(
  key: string,
  value: string,
  options?: SecureStore.SecureStoreOptions,
): Promise<void> {
  if (!isWeb) return SecureStore.setItemAsync(key, value, options);
  try {
    webStore()?.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the session stays in memory only.
  }
}

export async function deleteItemAsync(
  key: string,
  options?: SecureStore.SecureStoreOptions,
): Promise<void> {
  if (!isWeb) return SecureStore.deleteItemAsync(key, options);
  try {
    webStore()?.removeItem(key);
  } catch {
    // Nothing to clean up if the store was never reachable.
  }
}

/** Re-exported so call sites keep passing the same accessibility constant. */
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY =
  SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY;
