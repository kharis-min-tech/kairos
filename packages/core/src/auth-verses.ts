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
 * The text is the World English Bible, which is public domain and needs no
 * licence beyond being named. The wording here was previously close to the
 * NIV and carried no attribution at all — scripture on a sign-in page is
 * still a published quotation, and the NIV is copyrighted.
 *
 * There is no per-language text yet. Rather than machine-translate a verse,
 * which produces a paraphrase no congregation recognises, the English is
 * shown and the page says so, exactly as `daily-verses.ts` does. Adding a
 * language means adding a real, licensed translation from a named version.
 */
export interface AuthVerse {
  /** The line, split so two words can be emphasised in place. */
  before: string;
  /** Rendered in primary purple. */
  primaryWord: string;
  between: string;
  /** Rendered in gold. */
  accentWord: string;
  after: string;
  reference: string;
  /** Short name of the Bible version the text was taken from. */
  version: string;
}

export const AUTH_VERSES: AuthVerse[] = [
  {
    before: 'Let all things be done ',
    primaryWord: 'decently',
    between: ' and in ',
    accentWord: 'order',
    after: '.',
    reference: '1 Corinthians 14:40',
    version: 'WEB',
  },
  {
    before: 'Where two or three are ',
    primaryWord: 'gathered',
    between: ' together in my name, there I am ',
    accentWord: 'in the middle',
    after: ' of them.',
    reference: 'Matthew 18:20',
    version: 'WEB',
  },
  {
    before: 'They continued steadfastly in the apostles’ ',
    primaryWord: 'teaching',
    between: ' and ',
    accentWord: 'fellowship',
    after: '.',
    reference: 'Acts 2:42',
    version: 'WEB',
  },
  {
    before: 'As each has received a ',
    primaryWord: 'gift',
    between: ', be ministers to one another, as good managers of the ',
    accentWord: 'grace',
    after: ' of God.',
    reference: '1 Peter 4:10',
    version: 'WEB',
  },
  {
    before: 'Let us consider how to ',
    primaryWord: 'provoke',
    between: ' one another to ',
    accentWord: 'love',
    after: ' and good works.',
    reference: 'Hebrews 10:24',
    version: 'WEB',
  },
  {
    before: 'Bear one another’s ',
    primaryWord: 'burdens',
    between: ', and so fulfill the ',
    accentWord: 'law of Christ',
    after: '.',
    reference: 'Galatians 6:2',
    version: 'WEB',
  },
  {
    before: 'She looks well to the ',
    primaryWord: 'ways',
    between: ' of her household, and ',
    accentWord: 'doesn’t',
    after: ' eat the bread of idleness.',
    reference: 'Proverbs 31:27',
    version: 'WEB',
  },
];

/**
 * Pick one. Called at render time, so it changes per load rather than per
 * session — the page feels alive without anything moving.
 */
export function pickAuthVerse(seed = Math.random()): AuthVerse {
  const index = Math.floor(seed * AUTH_VERSES.length) % AUTH_VERSES.length;
  return AUTH_VERSES[index]!;
}
