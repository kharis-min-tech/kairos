/**
 * The scripture on the auth pages, rotated per load.
 *
 * A single fixed verse reads as a poster; a small rotating set reads as a
 * church. Each verse names the two words to emphasise so the typography can
 * carry the meaning rather than just colouring something arbitrary.
 *
 * Shared by web and mobile so the two never drift apart.
 *
 * ## Version and language
 *
 * Scripture is not interface copy and does not go through the i18n catalogue.
 * Running a verse through the machinery that translates "Save" produces a
 * paraphrase no congregation recognises, and the version a church reads is a
 * licensing matter as much as a linguistic one.
 *
 * So each verse carries its text per language, naming the Bible version it
 * came from:
 *
 *   en — World English Bible (public domain). The wording here was previously
 *        close to the NIV and carried no attribution at all; the NIV is
 *        copyrighted, and scripture on a sign-in page is still a published
 *        quotation.
 *   fr — Louis Segond 1910 (public domain).
 *
 * Krio and Twi have no entry. There is no public-domain Bible in either that
 * can be quoted here, so a reader in those languages gets the English with the
 * version named, which `resolveAuthVerse` reports via `fellBackToEnglish` —
 * rather than quietly presenting English as though it were their language.
 *
 * Adding a language means adding a real, licensed translation from a named
 * version. Do not fill these in from a machine translator.
 */

/** One verse's text in one Bible version, split so two words can be emphasised. */
export interface AuthVerseText {
  before: string;
  /** Rendered in primary purple. */
  primaryWord: string;
  between: string;
  /** Rendered in gold. */
  accentWord: string;
  after: string;
  /** Short name of the Bible version the text was taken from. */
  version: string;
}

export interface AuthVerse {
  /** Canonical reference, in English book names. */
  reference: string;
  /** Keyed by language code. `en` is required; the rest are optional. */
  text: { en: AuthVerseText } & Partial<Record<string, AuthVerseText>>;
}

export const AUTH_VERSES: AuthVerse[] = [
  {
    reference: '1 Corinthians 14:40',
    text: {
      en: {
        before: 'Let all things be done ',
        primaryWord: 'decently',
        between: ' and in ',
        accentWord: 'order',
        after: '.',
        version: 'WEB',
      },
      fr: {
        before: 'Que tout se fasse avec ',
        primaryWord: 'bienséance',
        between: ' et avec ',
        accentWord: 'ordre',
        after: '.',
        version: 'LSG',
      },
    },
  },
  {
    reference: 'Matthew 18:20',
    text: {
      en: {
        before: 'Where two or three are ',
        primaryWord: 'gathered',
        between: ' together in my name, there I am ',
        accentWord: 'in the middle',
        after: ' of them.',
        version: 'WEB',
      },
      fr: {
        before: 'Là où deux ou trois sont ',
        primaryWord: 'assemblés',
        between: ' en mon nom, je suis ',
        accentWord: 'au milieu',
        after: ' d’eux.',
        version: 'LSG',
      },
    },
  },
  {
    reference: 'Acts 2:42',
    text: {
      en: {
        before: 'They continued steadfastly in the apostles’ ',
        primaryWord: 'teaching',
        between: ' and ',
        accentWord: 'fellowship',
        after: '.',
        version: 'WEB',
      },
      fr: {
        before: 'Ils persévéraient dans l’',
        primaryWord: 'enseignement',
        between: ' des apôtres, dans la ',
        accentWord: 'communion fraternelle',
        after: '.',
        version: 'LSG',
      },
    },
  },
  {
    reference: '1 Peter 4:10',
    text: {
      en: {
        before: 'As each has received a ',
        primaryWord: 'gift',
        between: ', be ministers to one another, as good managers of the ',
        accentWord: 'grace',
        after: ' of God.',
        version: 'WEB',
      },
      fr: {
        before: 'Que chacun mette au service des autres le ',
        primaryWord: 'don',
        between: ' qu’il a reçu, comme de bons dispensateurs des diverses ',
        accentWord: 'grâces',
        after: ' de Dieu.',
        version: 'LSG',
      },
    },
  },
  {
    reference: 'Hebrews 10:24',
    text: {
      en: {
        before: 'Let us consider how to ',
        primaryWord: 'provoke',
        between: ' one another to ',
        accentWord: 'love',
        after: ' and good works.',
        version: 'WEB',
      },
      fr: {
        before: 'Veillons les uns sur les autres, pour nous ',
        primaryWord: 'exciter',
        between: ' à la ',
        accentWord: 'charité',
        after: ' et aux bonnes œuvres.',
        version: 'LSG',
      },
    },
  },
  {
    reference: 'Galatians 6:2',
    text: {
      en: {
        before: 'Bear one another’s ',
        primaryWord: 'burdens',
        between: ', and so fulfill the ',
        accentWord: 'law of Christ',
        after: '.',
        version: 'WEB',
      },
      fr: {
        before: 'Portez les ',
        primaryWord: 'fardeaux',
        between: ' les uns des autres, et vous accomplirez ainsi la ',
        accentWord: 'loi de Christ',
        after: '.',
        version: 'LSG',
      },
    },
  },
  {
    reference: 'Proverbs 31:27',
    text: {
      en: {
        before: 'She looks well to the ',
        primaryWord: 'ways',
        between: ' of her household, and ',
        accentWord: 'doesn’t',
        after: ' eat the bread of idleness.',
        version: 'WEB',
      },
      fr: {
        before: 'Elle veille sur ',
        primaryWord: 'ce qui se passe',
        between: ' dans sa maison, et elle ',
        accentWord: 'ne mange pas',
        after: ' le pain de paresse.',
        version: 'LSG',
      },
    },
  },
];

export interface ResolvedAuthVerse extends AuthVerseText {
  reference: string;
  /** The language the text is actually in, which may not be the one asked for. */
  shownIn: string;
  /**
   * True when the reader asked for a language Kairos has no Bible version in,
   * so they are reading English. Surface this rather than hiding it.
   */
  fellBackToEnglish: boolean;
}

/** The verse in the best language available, saying so when it isn't theirs. */
export function resolveAuthVerse(verse: AuthVerse, language: string): ResolvedAuthVerse {
  const wanted = verse.text[language];
  const chosen = wanted ?? verse.text.en;
  return {
    ...chosen,
    reference: verse.reference,
    shownIn: wanted ? language : 'en',
    fellBackToEnglish: !wanted && language !== 'en',
  };
}

/**
 * Pick one. Called at render time, so it changes per load rather than per
 * session — the page feels alive without anything moving.
 */
export function pickAuthVerse(seed = Math.random()): AuthVerse {
  const index = Math.floor(seed * AUTH_VERSES.length) % AUTH_VERSES.length;
  return AUTH_VERSES[index]!;
}
