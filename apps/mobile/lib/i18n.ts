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
 * Krio and Twi are wired up but not yet translated: their files are empty, so
 * every key falls through to English until a translator fills them in. That is
 * the intended rollout — the languages are pluggable, and shipping English in
 * the gaps beats shipping a guess.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', english: 'English', translated: true },
  { code: 'fr', label: 'Français', english: 'French', translated: true },
  { code: 'kri', label: 'Krio', english: 'Krio', translated: false },
  { code: 'tw', label: 'Twi', english: 'Twi', translated: false },
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
