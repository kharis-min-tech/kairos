/**
 * The verse shown on the dashboard and on the mobile home screen.
 *
 * Shared by web and mobile so the two never drift apart. Before this existed,
 * the web dashboard held its own list and mobile hardcoded a single verse, so
 * the two apps could show different scripture on the same day.
 *
 * ## Why the text is not run through i18n
 *
 * Scripture is not interface copy. Translating "Be still, and know that I am
 * God" with the same machinery that translates "Save" would produce a
 * paraphrase invented by a translation tool, not a verse any congregation
 * recognises. Churches read a named version, and that version is a licensing
 * matter as much as a linguistic one.
 *
 * So a verse carries its text per language, each entry naming the Bible
 * version it came from. A language with no entry falls back to English and
 * says which version is being shown, rather than quietly presenting English as
 * though it were the reader's language. `resolveVerse` returns that state so
 * the UI can be honest about it.
 *
 * Adding a language means adding a real, licensed translation of each verse
 * from a named version. Do not fill these in from a machine translator.
 */

export interface VerseText {
  /** The verse as it reads in that Bible version. */
  text: string;
  /** Short name of the version the text was taken from, e.g. 'WEB', 'LSG'. */
  version: string;
}

export interface DailyVerse {
  /** Canonical reference, in English book names. */
  ref: string;
  /** Keyed by language code. `en` is required; the rest are optional. */
  text: { en: VerseText } & Partial<Record<string, VerseText>>;
}

/**
 * English text is the World English Bible, which is public domain and needs no
 * licence or attribution beyond naming it.
 */
export const DAILY_VERSES: DailyVerse[] = [
  {
    // Was previously credited to Psalm 46:10 in the web dashboard, which is a
    // different verse entirely, and already in this list below.
    ref: '1 Corinthians 16:14',
    text: { en: { text: 'Let all that you do be done in love.', version: 'WEB' } },
  },
  {
    ref: 'Proverbs 3:5',
    text: { en: { text: 'Trust in the Lord with all your heart.', version: 'WEB' } },
  },
  {
    ref: 'Philippians 4:13',
    text: { en: { text: 'I can do all things through Christ who strengthens me.', version: 'WEB' } },
  },
  {
    ref: 'Psalm 46:10',
    text: { en: { text: 'Be still, and know that I am God.', version: 'WEB' } },
  },
  {
    ref: 'Psalm 23:1',
    text: { en: { text: 'The Lord is my shepherd; I shall not want.', version: 'WEB' } },
  },
  {
    ref: 'Jeremiah 29:11',
    text: { en: { text: 'For I know the plans I have for you.', version: 'WEB' } },
  },
  {
    ref: 'John 15:12',
    text: { en: { text: 'Love one another as I have loved you.', version: 'WEB' } },
  },
];

export interface ResolvedVerse {
  ref: string;
  text: string;
  version: string;
  /** The language the text is actually in, which may not be the one asked for. */
  shownIn: string;
  /**
   * True when the reader asked for a language Kairos has no Bible version in,
   * so they are reading English. Surface this rather than hiding it.
   */
  fellBackToEnglish: boolean;
}

/** The verse for a given day, in the best language available. */
export function resolveVerse(language: string, date: Date = new Date()): ResolvedVerse {
  const verse = DAILY_VERSES[date.getDay() % DAILY_VERSES.length]!;
  const wanted = verse.text[language];
  const chosen = wanted ?? verse.text.en;
  return {
    ref: verse.ref,
    text: chosen.text,
    version: chosen.version,
    shownIn: wanted ? language : 'en',
    fellBackToEnglish: !wanted && language !== 'en',
  };
}

/** Languages this verse has a real Bible version for. */
export function versionsFor(verse: DailyVerse): string[] {
  return Object.keys(verse.text);
}
