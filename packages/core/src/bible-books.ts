/**
 * Bible book names, per language.
 *
 * The verse *text* is not translated here — see `auth-verses.ts` for why. A
 * book name is a different thing: it is the reference label, not the
 * quotation, and every Bible in every language already has its own settled
 * name for each book. Leaving them in English meant a French reader saw
 * "Proverbs 31:27" above a verse that was otherwise in French, and a Krio
 * reader saw it above the English-fallback notice.
 *
 * Only the books actually quoted in `auth-verses.ts` and `daily-verses.ts`
 * are listed. `bookName` returns the English unchanged for anything else, so
 * adding a verse never breaks the reference.
 */
const BOOKS: Record<string, Record<string, string>> = {
  'Proverbs': { fr: 'Proverbes', kri: 'Prɔvabs', tw: 'Mmɛbusɛm' },
  'Psalm': { fr: 'Psaume', kri: 'Sam', tw: 'Dwom' },
  'Matthew': { fr: 'Matthieu', kri: 'Matyu', tw: 'Mateo' },
  'John': { fr: 'Jean', kri: 'Jɔn', tw: 'Yohane' },
  'Acts': { fr: 'Actes', kri: 'Akt', tw: 'Asomafoɔ Nnwuma' },
  'Galatians': { fr: 'Galates', kri: 'Galeshans', tw: 'Galatifoɔ' },
  'Philippians': { fr: 'Philippiens', kri: 'Filipians', tw: 'Filipifoɔ' },
  'Hebrews': { fr: 'Hébreux', kri: 'Ibruz', tw: 'Hebrifoɔ' },
  'Jeremiah': { fr: 'Jérémie', kri: 'Jɛremaya', tw: 'Yeremia' },
  '1 Corinthians': { fr: '1 Corinthiens', kri: '1 Kɔrintians', tw: '1 Korintofoɔ' },
  '1 Peter': { fr: '1 Pierre', kri: '1 Pita', tw: '1 Petro' },
};

/** 'Proverbs 31:27' in `lang`, with the chapter and verse left as they are. */
export function localiseReference(reference: string, lang: string): string {
  if (lang === 'en') return reference;
  // Split on the last space: everything before it is the book, which may
  // itself contain a space and a leading number ('1 Corinthians').
  const cut = reference.lastIndexOf(' ');
  if (cut < 0) return reference;
  const book = reference.slice(0, cut);
  const locus = reference.slice(cut + 1);
  return `${BOOKS[book]?.[lang] ?? book} ${locus}`;
}
