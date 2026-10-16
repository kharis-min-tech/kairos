/**
 * Build a link into the handbook in the reader's own language.
 *
 * The handbook is published in the same four languages as Kairos, English at
 * the root and the rest under a prefix. Linking to the bare path sent a
 * French reader to the English pages and left them to find the language
 * picker, which rather defeats the point of having translated it.
 *
 * English keeps the unprefixed URLs, so links already shared or bookmarked
 * still resolve.
 */
/**
 * Where the handbook is served from.
 *
 * Published, that is the docs domain. Running locally it is the VitePress dev
 * server, and without this the Help link in a local build opened the live
 * site — so a change to the handbook could not be seen from the app that
 * links to it.
 *
 * Next inlines `NEXT_PUBLIC_*` and Expo inlines `EXPO_PUBLIC_*` at build
 * time, so both are read literally rather than through a computed key.
 */
const PUBLISHED = 'https://docs.kairos.kharis.org';

function origin(): string {
  // Written out literally on purpose. Next and Expo substitute the exact text
  // `process.env.NEXT_PUBLIC_…` at build time; reading the same name off a
  // variable is not substituted, so the override silently did nothing and the
  // Help link in a local build still opened the published site.
  const fromNext =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_DOCS_ORIGIN : undefined;
  const fromExpo =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_DOCS_ORIGIN : undefined;
  return fromNext || fromExpo || PUBLISHED;
}

export const DOCS_ORIGIN = PUBLISHED;

/** Languages the handbook is published in. Anything else falls back to English. */
const TRANSLATED = new Set(['fr', 'kri', 'tw']);

export function docsUrl(path = '', lang = 'en'): string {
  const clean = path.replace(/^\/+/, '');
  // `i18n.language` can arrive as a full tag ('fr-FR'); the handbook is keyed
  // on the base language.
  const code = (lang ?? 'en').toLowerCase().split('-')[0] ?? 'en';
  const prefix = TRANSLATED.has(code) ? `/${code}` : '';
  const base = origin();
  return clean ? `${base}${prefix}/${clean}` : `${base}${prefix}/`;
}
