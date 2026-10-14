'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, {
  LANGUAGE_COOKIE,
  LANGUAGE_KEY,
  resolveLanguage,
  storedPreference,
  type LanguagePreference,
} from '@/lib/i18n';

/**
 * Applies the saved language on the client.
 *
 * i18next starts on English so the server render and the first client paint
 * agree; switching during hydration would trip React's mismatch check. The
 * stored preference is applied immediately afterwards, in an effect.
 *
 * The listener keeps other tabs in step: change the language in one, and the
 * rest follow rather than drifting apart.
 */
export function I18nProvider({
  children,
  initialLanguage = 'en',
}: {
  children: React.ReactNode;
  /** Resolved on the server from the cookie, so SSR and hydration agree. */
  initialLanguage?: string;
}) {
  const [ready, setReady] = useState(false);

  // Once per mount, not on every render: changeLanguage notifies every
  // subscriber, and doing that mid-render re-entered React and left the login
  // form unhydrated, so it posted natively with the password in the URL.
  //
  // It has to happen before the first paint rather than in an effect, though.
  // A Suspense boundary hydrates after effects from above it have run, so
  // switching there lands underneath a boundary still matching the server's
  // HTML -- which is the mismatch this exists to avoid. Resources are bundled,
  // so the change applies synchronously.
  useState(() => {
    if (i18n.language !== initialLanguage) void i18n.changeLanguage(initialLanguage);
    return null;
  });

  useEffect(() => {
    void i18n.changeLanguage(resolveLanguage(storedPreference())).finally(() => setReady(true));

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LANGUAGE_KEY) return;
      const next = (e.newValue ?? 'system') as LanguagePreference;
      void i18n.changeLanguage(resolveLanguage(next));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // `ready` is not used to gate rendering: holding the tree back would blank
  // the dashboard for a frame. English simply becomes the chosen language a
  // tick later, which is what fallbackLng would have shown anyway.
  void ready;

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

/** Persist a choice and apply it to this tab. */
export function setLanguagePreference(pref: LanguagePreference) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, pref);
  } catch {
    // Blocked storage: the cookie below still carries the choice.
  }
  try {
    // Mirrored so the server can render the right language on the next
    // document request. Lax is enough: this is a display preference, not a
    // credential, and it never travels cross-site.
    document.cookie = `${LANGUAGE_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Blocked cookies: this tab still switches below.
  }
  void i18n.changeLanguage(resolveLanguage(pref));
}
