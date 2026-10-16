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
export const DOCS_ORIGIN = 'https://docs.kairos.kharis.org';

/** Languages the handbook is published in. Anything else falls back to English. */
const TRANSLATED = new Set(['fr', 'kri', 'tw']);

export function docsUrl(path = '', lang = 'en'): string {
  const clean = path.replace(/^\/+/, '');
  // `i18n.language` can arrive as a full tag ('fr-FR'); the handbook is keyed
  // on the base language.
  const base = (lang ?? 'en').toLowerCase().split('-')[0] ?? 'en';
  const prefix = TRANSLATED.has(base) ? `/${base}` : '';
  return clean ? `${DOCS_ORIGIN}${prefix}/${clean}` : `${DOCS_ORIGIN}${prefix}/`;
}
