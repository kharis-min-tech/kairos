'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../locales/en.json';
import fr from '../../locales/fr.json';
import kri from '../../locales/kri.json';
import tw from '../../locales/tw.json';

/**
 * Dashboard translations.
 *
 * Deliberately the same library and the same key style as `apps/mobile`, so
 * there is one translation system across the product rather than two. The
 * catalogues are separate because the two surfaces show different things, but
 * the vocabulary is kept in step: a fellowship is a "cellule" in both.
 *
 * `status: 'draft'` marks a language whose catalogue has not been read by a
 * native speaker. The picker says so rather than presenting it as finished.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', english: 'English', status: 'complete' },
  { code: 'fr', label: 'Français', english: 'French', status: 'complete' },
  { code: 'kri', label: 'Krio', english: 'Krio', status: 'draft' },
  { code: 'tw', label: 'Twi', english: 'Twi', status: 'draft' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export type LanguagePreference = LanguageCode | 'system';

export const LANGUAGE_KEY = 'kairos.language';

const SUPPORTED = LANGUAGES.map((l) => l.code) as readonly string[];

/** First browser language Kairos can speak, else English. */
export function browserLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  for (const tag of navigator.languages ?? [navigator.language]) {
    const lower = (tag ?? '').toLowerCase();
    const hit = SUPPORTED.find((c) => lower === c || lower.startsWith(`${c}-`));
    if (hit) return hit as LanguageCode;
  }
  return 'en';
}

export function resolveLanguage(pref: LanguagePreference): LanguageCode {
  return pref === 'system' ? browserLanguage() : pref;
}

/** What the user last chose, or 'system' if they never have. */
export function storedPreference(): LanguagePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(LANGUAGE_KEY);
    return raw && [...SUPPORTED, 'system'].includes(raw) ? (raw as LanguagePreference) : 'system';
  } catch {
    return 'system';
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en, fr, kri, tw },
    // Server render and first client paint must agree, so both start at the
    // base language; the stored preference is applied in an effect.
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
