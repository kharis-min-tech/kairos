'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, {
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
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

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
    // Blocked storage: applies for this session only.
  }
  void i18n.changeLanguage(resolveLanguage(pref));
}
