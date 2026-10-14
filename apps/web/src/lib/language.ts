/**
 * Language constants shared by the server and the client.
 *
 * Deliberately not in `lib/i18n.ts`: that module is marked 'use client', so a
 * server component importing from it gets a client reference rather than the
 * function, and the root layout silently fell back to English. Anything the
 * server needs to read has to live outside that boundary.
 */
export const LANGUAGE_COOKIE = 'kairos.language';

export const LANGUAGE_CODES = ['en', 'fr', 'kri', 'tw'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** Validate a value that came from a cookie, which is untrusted input. */
export function asLanguage(raw: string | undefined | null): LanguageCode {
  return raw && (LANGUAGE_CODES as readonly string[]).includes(raw)
    ? (raw as LanguageCode)
    : 'en';
}
