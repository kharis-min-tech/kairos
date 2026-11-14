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

/**
 * Where the language lives in a URL.
 *
 * The handbook puts it in the path -- `/fr/platform/members`, with English
 * unprefixed at the root -- and the dashboard now matches, so a link to a
 * particular language is a link somebody can send. Before this the choice was
 * only ever a cookie, so every reader of every language shared one set of
 * URLs and "send me the French one" had no answer.
 *
 * English is deliberately not prefixed. `/fr` and `/en` would both be
 * reasonable, but two URLs for the same English page splits every existing
 * link and bookmark, and the handbook already made the opposite choice.
 */
export const PREFIXED_LANGUAGES = LANGUAGE_CODES.filter((c) => c !== 'en');

/**
 * The header the middleware uses to hand the path's language to the server.
 *
 * The request is rewritten to the unprefixed path before it reaches a route,
 * so by the time a server component runs the language is no longer visible in
 * the URL it can see. It travels in a header instead.
 */
export const LANGUAGE_HEADER = 'x-kairos-language';

/** Split `/fr/platform` into its language and the route underneath it. */
export function splitLocale(pathname: string): { locale: LanguageCode; rest: string } | null {
  const seg = pathname.split('/')[1];
  if (!seg || !(PREFIXED_LANGUAGES as readonly string[]).includes(seg)) return null;
  return { locale: seg as LanguageCode, rest: pathname.slice(seg.length + 1) || '/' };
}

/** The same route, addressed in `lang`. */
export function withLocale(pathname: string, lang: LanguageCode): string {
  const rest = splitLocale(pathname)?.rest ?? pathname;
  if (lang === 'en') return rest;
  return rest === '/' ? `/${lang}` : `/${lang}${rest}`;
}
