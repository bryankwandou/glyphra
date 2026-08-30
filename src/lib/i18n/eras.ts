/**
 * When a method was used, in the reader's language.
 *
 * The catalogue, the workbench and every problem card print this line under
 * the technique name. Most values are bare years and read the same in both
 * languages, but roughly fifty carry English words — "Antiquity", "Used from
 * 1965", "c. 7th century BC" — and those sat untranslated on every one of
 * those surfaces. The blocklist gate never saw them because nobody had thought
 * to list a date.
 *
 * Table first, then patterns for the ones that wrap a year in an English word,
 * so a new technique's "1974 (RFC 675)" is translated without a new entry.
 */
const ID: Readonly<Record<string, string>> = Object.freeze({
  'American Civil War': 'Perang Saudara Amerika',
  'American Civil War era': 'Zaman Perang Saudara Amerika',
  'American Cryptogram Association': 'American Cryptogram Association',
  'American Cryptogram Association, 20th century':
    'American Cryptogram Association, abad ke-20',
  Antiquity: 'Zaman kuno',
  Classical: 'Klasik',
  'Common in URL shorteners': 'Lazim pada pemendek URL',
  'Common in identifiers': 'Lazim pada penanda',
  'Early 20th century': 'Awal abad ke-20',
  'Early computing': 'Masa awal komputasi',
  'Long-standing': 'Sudah lama dipakai',
  Modern: 'Modern',
  'Modern puzzle convention': 'Kelaziman teka-teki modern',
  Ubiquitous: 'Ada di mana-mana',
  'Used from 1965': 'Dipakai sejak 1965',
  'WWI-WWII': 'PD I-PD II',
  WWII: 'PD II',
  '1553 (Bellaso), misattributed 1586': '1553 (Bellaso), salah dinisbahkan ke 1586',
  '1605, in modern form': '1605, dalam bentuk modernnya',
  '1880s, used 1916-1917': '1880-an, dipakai 1916-1917',
  '1903 (fictional)': '1903 (fiksi)',
  '1918, disclosed 2010': '1918, disingkap 2010',
  '1947 (patented 1953)': '1947 (dipatenkan 1953)',
  '1980 (Unix-to-Unix Copy)': '1980 (Unix-to-Unix Copy)',
  '1980s bulletin boards': 'Papan buletin era 1980-an',
  '1987, leaked 1994': '1987, bocor 1994',
  '1990 (btoa / PostScript)': '1990 (btoa / PostScript)',
  'c. 1710, popularised 19th century': 'k. 1710, memasyarakat pada abad ke-19',
});

/** Shapes that recur, so a new technique needs no new entry. */
const PATTERNS: readonly (readonly [RegExp, (m: RegExpMatchArray) => string])[] = [
  // "c. 58 BC", "c. 600 BC"
  [/^c\. (\d+) BC$/, (m) => `k. ${m[1]} SM`],
  // "c. 7th century BC"
  [/^c\. (\d+)(?:st|nd|rd|th) century BC$/, (m) => `k. abad ke-${m[1]} SM`],
  // "c. 1901"
  [/^c\. (\d+)$/, (m) => `k. ${m[1]}`],
  // "16th century", "19th century"
  [/^(\d+)(?:st|nd|rd|th) century$/, (m) => `Abad ke-${m[1]}`],
  // "1980s", "1990s"
  [/^(\d{4})s$/, (m) => `${m[1]}-an`],
  // "1980s (Usenet)"
  [/^(\d{4})s \((.+)\)$/, (m) => `${m[1]}-an (${m[2]})`],
  // "2001 (FIPS 197)", "1586 (Vigenère)" — the parenthetical is a proper name
  // or a standard number, and stays as it is in both languages.
  [/^(\d{4}) \((.+)\)$/, (m) => `${m[1]} (${m[2]})`],
];

export function eraText(era: string, locale: 'en' | 'id'): string {
  if (locale !== 'id' || !era) return era;
  const exact = ID[era];
  if (exact) return exact;
  for (const [re, out] of PATTERNS) {
    const m = era.match(re);
    if (m) return out(m);
  }
  return era;
}
