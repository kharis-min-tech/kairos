/**
 * The scripture on the auth pages, rotated per load.
 *
 * A single fixed verse reads as a poster; a small rotating set reads as a
 * church. Each verse names the two words to emphasise so the typography can
 * carry the meaning rather than just colouring something arbitrary.
 *
 * Shared by web and mobile so the two never drift apart.
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
}

export const AUTH_VERSES: AuthVerse[] = [
  {
    before: 'Let all things be done ',
    primaryWord: 'decently',
    between: ' and in ',
    accentWord: 'order',
    after: '.',
    reference: '1 Corinthians 14:40',
  },
  {
    before: 'Where two or three ',
    primaryWord: 'gather',
    between: ' in my name, there am I ',
    accentWord: 'with them',
    after: '.',
    reference: 'Matthew 18:20',
  },
  {
    before: 'They devoted themselves to the ',
    primaryWord: 'teaching',
    between: ' and to the ',
    accentWord: 'fellowship',
    after: '.',
    reference: 'Acts 2:42',
  },
  {
    before: 'Each of you should use whatever ',
    primaryWord: 'gift',
    between: ' you have to ',
    accentWord: 'serve',
    after: ' others.',
    reference: '1 Peter 4:10',
  },
  {
    before: 'Let us consider how we may ',
    primaryWord: 'spur',
    between: ' one another on toward ',
    accentWord: 'love',
    after: ' and good deeds.',
    reference: 'Hebrews 10:24',
  },
  {
    before: 'Carry each other’s ',
    primaryWord: 'burdens',
    between: ', and in this way you will fulfil the ',
    accentWord: 'law of Christ',
    after: '.',
    reference: 'Galatians 6:2',
  },
  {
    before: 'She watches over the ',
    primaryWord: 'affairs',
    between: ' of her household and ',
    accentWord: 'does not',
    after: ' eat the bread of idleness.',
    reference: 'Proverbs 31:27',
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
