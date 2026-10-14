/**
 * The BCP-47 locale to format dates with, for a given app language.
 *
 * Krio and Twi have no CLDR date data, so Intl would quietly fall back to the
 * browser's default locale — a Krio page could end up with German month names.
 * Mapping them to en-GB keeps the fallback predictable and matches how the
 * rest of the product handles a language it cannot fully express.
 */
const DATE_LOCALE: Record<string, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
  kri: 'en-GB',
  tw: 'en-GB',
};

export function dateLocale(language: string): string {
  return DATE_LOCALE[language] ?? 'en-GB';
}
