import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from '../locales/en.json';
import fr from '../locales/fr.json';
import kri from '../locales/kri.json';
import tw from '../locales/tw.json';

/**
 * The languages Kairos ships. `code` is what we persist and what i18next sees;
 * `label` is the endonym, deliberately shown in its own language so a speaker
 * can find it without reading English.
 *
 * `status: 'draft'` means the catalogue is complete but has not been read by a
 * native speaker. The picker says so, rather than presenting it as finished.
 * Move a language to 'complete' once someone who speaks it has been through it.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', english: 'English', status: 'complete' },
  { code: 'fr', label: 'Français', english: 'French', status: 'complete' },
  { code: 'kri', label: 'Krio', english: 'Krio', status: 'draft' },
  { code: 'tw', label: 'Twi', english: 'Twi', status: 'draft' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
/** `'system'` means "follow the device", which is the default. */
export type LanguagePreference = LanguageCode | 'system';

const SUPPORTED = LANGUAGES.map((l) => l.code) as readonly string[];

/**
 * First device locale Kairos can actually speak, else English.
 *
 * `getLocales()` returns most-preferred first and gives both the full tag
 * (`fr-CA`) and the bare language (`fr`), so a Canadian French phone still
 * lands on French.
 */
export function deviceLanguage(): LanguageCode {
  try {
    for (const locale of getLocales()) {
      const tag = locale.languageTag?.toLowerCase() ?? '';
      const base = locale.languageCode?.toLowerCase() ?? '';
      const hit = SUPPORTED.find((c) => tag === c || tag.startsWith(`${c}-`) || base === c);
      if (hit) return hit as LanguageCode;
    }
  } catch {
    // expo-localization can throw very early in boot; English is a fine answer.
  }
  return 'en';
}

/** Turn a stored preference into the language i18next should actually run. */
export function resolveLanguage(pref: LanguagePreference): LanguageCode {
  return pref === 'system' ? deviceLanguage() : pref;
}

void i18n.use(initReactI18next).init({
  resources: { en, fr, kri, tw },
  lng: 'en', // replaced on boot once the stored preference has hydrated
  fallbackLng: 'en',
  defaultNS: 'common',
  // Untranslated keys fall back to English rather than rendering the key path
  // or an empty row, which is what Krio and Twi rely on today.
  returnEmptyString: false,
  interpolation: { escapeValue: false }, // React Native escapes on render
  react: { useSuspense: false }, // no Suspense boundary around the router
});

export default i18n;
