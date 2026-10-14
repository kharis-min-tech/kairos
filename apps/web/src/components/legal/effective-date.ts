/**
 * Format a legal document's effective date in the reader's language.
 *
 * The dates used to be written out as English strings ("23 July 2026"), so a
 * French reader saw "En vigueur le 23 July 2026". They are ISO dates now and
 * get formatted per language instead.
 *
 * Krio and Twi have no CLDR date data, so Intl would silently fall back to
 * whatever the browser's default locale happens to be — which could render a
 * Krio page with, say, German month names. Mapping them to en-GB keeps the
 * fallback predictable and matches how the rest of the product handles a
 * language it cannot fully express.
 */
const DATE_LOCALE: Record<string, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
  kri: 'en-GB',
  tw: 'en-GB',
};

export function formatEffectiveDate(iso: string, language: string): string {
  const locale = DATE_LOCALE[language] ?? 'en-GB';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
