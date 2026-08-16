import type { Technique, Key } from './types';
import { A, lettersOnly, mod, keyedAlphabet, grouped, step, ks, kn } from './utils';

/** Show the first few columns of the key/plain/cipher alignment. */
function alignment(pt: string, keystream: string, ct: string, n = 8): string {
  const k = Math.min(n, pt.length);
  return (
    `plain  ${pt.slice(0, k).split('').join(' ')}\n` +
    `key    ${keystream.slice(0, k).split('').join(' ')}\n` +
    `cipher ${ct.slice(0, k).split('').join(' ')}`
  );
}

/** Repeat a keyword to cover the message. */
function stretch(keyword: string, len: number): string {
  if (!keyword) return 'A'.repeat(len);
  let s = '';
  while (s.length < len) s += keyword;
  return s.slice(0, len);
}

/**
 * The four classical shift-family ciphers differ only in the arithmetic that
 * combines a plaintext index with a key index, so they share one implementation.
 */
type Combine = (p: number, k: number) => number;

function shiftFamily(opts: {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  era: string;
  summary: string;
  theory: string;
  formulaEnc: string;
  formulaDec: string;
  enc: Combine;
  dec: Combine;
  keyLabel?: string;
  digitKey?: boolean;
}): Technique {
  const keySpec = opts.digitKey
    ? [{ name: 'keyword', kind: 'int' as const, min: 10000, max: 99999, label: opts.keyLabel ?? 'Numeric key' }]
    : [{ name: 'keyword', kind: 'word' as const, minLen: 4, maxLen: 9, label: opts.keyLabel ?? 'Keyword' }];

  const keyIndices = (key: Key, len: number): { stream: string; idx: number[] } => {
    if (opts.digitKey) {
      const digits = String(kn(key, 'keyword', 31415)).replace(/[^0-9]/g, '') || '0';
      const stream = stretch(digits, len);
      return { stream, idx: stream.split('').map(Number) };
    }
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER')) || 'A';
    const stream = stretch(kw, len);
    return { stream, idx: stream.split('').map((c) => A.indexOf(c)) };
  };

  return {
    id: opts.id,
    name: opts.name,
    family: 'polyalphabetic',
    difficulty: opts.difficulty,
    era: opts.era,
    summary: opts.summary,
    theory: opts.theory,
    keySpec,
    normalise: lettersOnly,
    encode(pt, key) {
      const t = lettersOnly(pt);
      const { stream, idx } = keyIndices(key, t.length);
      const out = t.split('').map((c, i) => A[mod(opts.enc(A.indexOf(c), idx[i]), 26)]).join('');
      return {
        output: grouped(out),
        steps: [
          step('Prepare the text', 'Letters only, uppercased.', t),
          step('Lay the key against it', 'The key repeats until it covers the whole message.', stream.slice(0, 40)),
          step('Combine each pair', opts.formulaEnc, alignment(t, stream, out)),
          step('Result', 'Grouped in fives for transmission.', grouped(out)),
        ],
      };
    },
    decode(ct, key) {
      const t = lettersOnly(ct);
      const { stream, idx } = keyIndices(key, t.length);
      const out = t.split('').map((c, i) => A[mod(opts.dec(A.indexOf(c), idx[i]), 26)]).join('');
      return {
        output: out,
        steps: [
          step('Prepare the text', 'Strip the transmission spacing.', t),
          step('Regenerate the keystream', 'Same key, same repetition.', stream.slice(0, 40)),
          step('Reverse the combination', opts.formulaDec, alignment(out, stream, t)),
          step('Read the plaintext', 'The message.', out),
        ],
      };
    },
  };
}

const vigenere = shiftFamily({
  id: 'vigenere',
  name: 'Vigenère cipher',
  difficulty: 3,
  era: '1553 (Bellaso), misattributed 1586',
  summary: 'A repeating keyword supplies a different Caesar shift for every position.',
  theory:
    'Each key letter selects one of twenty-six shifted alphabets, so a plaintext letter enciphers ' +
    'differently depending on where it falls. That flattens the frequency distribution and defeated ' +
    'casual analysis for three centuries, earning it the name "le chiffre indéchiffrable". Its downfall ' +
    'is the repetition: Kasiski examination measures the gaps between repeated ciphertext fragments to ' +
    'recover the key length, after which the message splits into that many plain Caesar ciphers.',
  formulaEnc: 'C = (P + K) mod 26.',
  formulaDec: 'P = (C - K) mod 26.',
  enc: (p, k) => p + k,
  dec: (p, k) => p - k,
});

const beaufort = shiftFamily({
  id: 'beaufort',
  name: 'Beaufort cipher',
  difficulty: 3,
  era: 'c. 1710, popularised 19th century',
  summary: 'The plaintext is subtracted from the key rather than added to it.',
  theory:
    'C = (K - P) mod 26. Subtracting in that order makes the cipher reciprocal: running the same ' +
    'procedure on the ciphertext returns the plaintext, so one machine setting serves both directions. ' +
    'Francis Beaufort — the same officer as the wind scale — is credited with it, and the property was ' +
    'valuable enough that Hagelin rotor machines used the same arrangement well into the twentieth century.',
  formulaEnc: 'C = (K - P) mod 26.',
  formulaDec: 'P = (K - C) mod 26 — the identical operation.',
  enc: (p, k) => k - p,
  dec: (p, k) => k - p,
});

const variantBeaufort = shiftFamily({
  id: 'variant-beaufort',
  name: 'Variant Beaufort',
  difficulty: 3,
  era: '19th century',
  summary: 'The key is subtracted from the plaintext — Vigenère decryption used as encryption.',
  theory:
    'C = (P - K) mod 26. It is the exact inverse of Vigenère, which means a Vigenère machine can ' +
    'produce it by simply running the decrypt setting. Not reciprocal, and no stronger than Vigenère.',
  formulaEnc: 'C = (P - K) mod 26.',
  formulaDec: 'P = (C + K) mod 26.',
  enc: (p, k) => p - k,
  dec: (p, k) => p + k,
});

const gronsfeld = shiftFamily({
  id: 'gronsfeld',
  name: 'Gronsfeld cipher',
  difficulty: 2,
  era: '17th century',
  summary: 'Vigenère with a numeric key, so shifts only run from 0 to 9.',
  theory:
    'Count Gronsfeld replaced the keyword with digits, which made the key easy to remember and to ' +
    'transmit verbally. The cost is severe: only ten of the twenty-six alphabets are ever used, so the ' +
    'frequency distribution stays lumpy and the cipher falls much faster than true Vigenère.',
  formulaEnc: 'C = (P + digit) mod 26.',
  formulaDec: 'P = (C - digit) mod 26.',
  enc: (p, k) => p + k,
  dec: (p, k) => p - k,
  digitKey: true,
  keyLabel: 'Numeric key (digits)',
});

const trithemius: Technique = {
  id: 'trithemius',
  name: 'Trithemius cipher',
  family: 'polyalphabetic',
  difficulty: 2,
  era: '1508',
  summary: 'The shift advances by one at every position — no key at all.',
  theory:
    'Johannes Trithemius published the tabula recta, the 26×26 grid of shifted alphabets that Vigenère ' +
    'later keyed. In his original scheme the first letter shifts by 0, the second by 1, and so on down ' +
    'the table. It is the ancestor of every polyalphabetic cipher, and completely keyless — knowing the ' +
    'method is knowing the message.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c, i) => A[mod(A.indexOf(c) + i, 26)]).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Walk down the tabula recta', 'Position i uses row i of the table.',
          t.slice(0, 6).split('').map((c, i) => `${c} + ${i} → ${out[i]}`).join('\n')),
        step('Result', 'C = (P + i) mod 26.', grouped(out)),
      ],
    };
  },
  decode(ct) {
    const t = lettersOnly(ct);
    const out = t.split('').map((c, i) => A[mod(A.indexOf(c) - i, 26)]).join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Climb back up the table', 'P = (C - i) mod 26.', out),
      ],
    };
  },
};

const autokey: Technique = {
  id: 'autokey',
  name: 'Autokey cipher',
  family: 'polyalphabetic',
  difficulty: 4,
  era: '1586 (Vigenère)',
  summary: 'A short priming key starts the keystream, then the plaintext itself continues it.',
  theory:
    'The keystream is the keyword followed by the message. Because nothing repeats, Kasiski examination ' +
    'has no periodicity to find — the flaw that kills ordinary Vigenère is simply absent. Vigenère ' +
    'considered this his real contribution, and it is genuinely stronger. It still yields to a probable-word ' +
    'attack: guess a common fragment, slide it along the ciphertext, and correct guesses produce readable ' +
    'plaintext that then extends the key forward on its own.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 4, maxLen: 8, label: 'Priming key' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER')) || 'A';
    const t = lettersOnly(pt);
    const stream = (kw + t).slice(0, t.length);
    const out = t.split('').map((c, i) => A[mod(A.indexOf(c) + A.indexOf(stream[i]), 26)]).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Build the keystream', `Priming key "${kw}", then the plaintext itself.`, stream.slice(0, 40)),
        step('Encipher', 'C = (P + K) mod 26, exactly as Vigenère.', alignment(t, stream, out)),
        step('Result', 'The keystream never repeats, so there is no period to detect.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER')) || 'A';
    const t = lettersOnly(ct);
    let stream = kw;
    let out = '';
    for (let i = 0; i < t.length; i++) {
      const p = A[mod(A.indexOf(t[i]) - A.indexOf(stream[i]), 26)];
      out += p;
      stream += p;
    }
    return {
      output: out,
      steps: [
        step('Start with the priming key', `"${kw}" decrypts the first ${kw.length} letters.`, kw),
        step('Extend as you go', 'Each recovered plaintext letter becomes the next key letter, so decryption unrolls the keystream one character at a time.',
          alignment(out, stream, t)),
        step('Read the plaintext', 'The message.', out),
      ],
    };
  },
};

const RUNNING_KEYS = [
  'ITWASTHEBESTOFTIMESITWASTHEWORSTOFTIMESITWASTHEAGEOFWISDOMITWASTHEAGEOFFOOLISHNESS',
  'CALLMEISHMAELSOMEYEARSAGONEVERMINDHOWLONGPRECISELYHAVINGLITTLEORNOMONEYINMYPURSE',
  'INAHOLEINTHEGROUNDTHERELIVEDAHOBBITNOTANASTYDIRTYWETHOLEFILLEDWITHTHEENDSOFWORMS',
  'ALLHAPPYFAMILIESAREALIKEEACHUNHAPPYFAMILYISUNHAPPYINITSOWNWAYEVERYTHINGWASINCONFUSION',
];

const runningKey: Technique = {
  id: 'running-key',
  name: 'Running key cipher',
  family: 'polyalphabetic',
  difficulty: 4,
  era: '19th century',
  summary: 'The key is a long passage of ordinary text instead of a repeated word.',
  theory:
    'Both parties agree on a book, a page and a starting line; that text becomes the key. There is no ' +
    'repetition, so periodicity attacks fail. The weakness is that the key is English rather than random — ' +
    'both the message and the key carry the statistics of the language, and a cryptanalyst can pull the ' +
    'two apart by testing plausible word fragments against each other until both sides read sensibly.',
  keySpec: [{ name: 'passage', kind: 'choice', options: RUNNING_KEYS, label: 'Key passage' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const passage = lettersOnly(ks(key, 'passage', RUNNING_KEYS[0]));
    const t = lettersOnly(pt);
    const stream = stretch(passage, t.length);
    const out = t.split('').map((c, i) => A[mod(A.indexOf(c) + A.indexOf(stream[i]), 26)]).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Take the key passage', 'Agreed in advance — a book, a page, a line.', stream.slice(0, 48)),
        step('Encipher', 'C = (P + K) mod 26 against the passage.', alignment(t, stream, out)),
        step('Result', 'No repeating period exists in the key.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const passage = lettersOnly(ks(key, 'passage', RUNNING_KEYS[0]));
    const t = lettersOnly(ct);
    const stream = stretch(passage, t.length);
    const out = t.split('').map((c, i) => A[mod(A.indexOf(c) - A.indexOf(stream[i]), 26)]).join('');
    return {
      output: out,
      steps: [
        step('Recover the passage', 'The receiver holds the same book and page.', stream.slice(0, 48)),
        step('Subtract it out', 'P = (C - K) mod 26.', out),
      ],
    };
  },
};

const oneTimePad: Technique = {
  id: 'one-time-pad',
  name: 'One-time pad',
  family: 'polyalphabetic',
  difficulty: 3,
  era: '1882 / 1917 (Vernam)',
  summary: 'A truly random key, as long as the message, used once and destroyed.',
  theory:
    'Shannon proved in 1949 that this is the only cipher with perfect secrecy: when the key is random, ' +
    'as long as the plaintext and never reused, every possible message of that length is equally ' +
    'consistent with the ciphertext, so intercepting it conveys nothing. The theory is airtight and the ' +
    'logistics are brutal — you must distribute as much key material as you will ever send. Reusing a pad ' +
    'destroys the guarantee completely, which is precisely how the Venona project read Soviet traffic for years.',
  keySpec: [{ name: 'pad', kind: 'pad', label: 'Pad (as long as the message)' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const t = lettersOnly(pt);
    const pad = stretch(lettersOnly(ks(key, 'pad', 'A')) || 'A', t.length);
    const out = t.split('').map((c, i) => A[mod(A.indexOf(c) + A.indexOf(pad[i]), 26)]).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Take pad material', `${t.length} random letters, used for this message and no other.`, pad),
        step('Add modulo 26', 'C = (P + K) mod 26.', alignment(t, pad, out)),
        step('Destroy the pad', 'Reuse is what broke Venona. One message, one pad.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const t = lettersOnly(ct);
    const pad = stretch(lettersOnly(ks(key, 'pad', 'A')) || 'A', t.length);
    const out = t.split('').map((c, i) => A[mod(A.indexOf(c) - A.indexOf(pad[i]), 26)]).join('');
    return {
      output: out,
      steps: [
        step('Retrieve the matching pad', 'The receiver holds the only other copy.', pad),
        step('Subtract modulo 26', 'P = (C - K) mod 26.', out),
      ],
    };
  },
};

/** Porta is reciprocal, so one routine serves both directions. */
function portaApply(text: string, keyword: string): string {
  const t = lettersOnly(text);
  const stream = stretch(keyword || 'A', t.length);
  return t
    .split('')
    .map((c, i) => {
      const n = Math.floor(A.indexOf(stream[i]) / 2);
      const p = A.indexOf(c);
      return p < 13 ? A[13 + mod(p + n, 13)] : A[mod(p - 13 - n, 13)];
    })
    .join('');
}

const porta: Technique = {
  id: 'porta',
  name: 'Porta cipher',
  family: 'polyalphabetic',
  difficulty: 4,
  era: '1563',
  summary: 'Thirteen reciprocal alphabets, each shared by a pair of key letters.',
  theory:
    'Giovanni Battista della Porta split the alphabet in half. The first thirteen letters occupy the top ' +
    'row; the second thirteen occupy the bottom row, rotated according to the key letter. Enciphering ' +
    'swaps a letter between the halves, which makes every alphabet reciprocal — the same table decrypts. ' +
    'Key letters pair up (A and B select the same row, C and D the next), so the effective key space is ' +
    'half that of Vigenère.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 4, maxLen: 8, label: 'Keyword' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER')) || 'A';
    const t = lettersOnly(pt);
    const stream = stretch(kw, t.length);
    const out = portaApply(t, kw);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Pair the key letters', 'A/B select row 0, C/D row 1, up to Y/Z at row 12.',
          stream.slice(0, 10).split('').map((k) => `${k} → row ${Math.floor(A.indexOf(k) / 2)}`).join('\n')),
        step('Swap across the halves', 'A letter from A–M becomes one from N–Z and the reverse, using the rotated bottom row.',
          alignment(t, stream, out)),
        step('Result', 'Every row is reciprocal, so this table also decrypts.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER')) || 'A';
    const t = lettersOnly(ct);
    const stream = stretch(kw, t.length);
    const out = portaApply(t, kw);
    return {
      output: out,
      steps: [
        step('Apply the identical table', 'Porta rows are reciprocal, so decryption is the same operation as encryption.', ''),
        step('Pair the key letters', 'Same pairing as the sender used.',
          stream.slice(0, 10).split('').map((k) => `${k} → row ${Math.floor(A.indexOf(k) / 2)}`).join('\n')),
        step('Swap back across the halves', 'The swap undoes itself.', alignment(t, stream, out)),
        step('Read the plaintext', 'The message.', out),
      ],
    };
  },
};

/**
 * A generalised Quagmire. The four ACA variants differ only in which of the two
 * alphabets carries a keyword.
 *
 * Alignment convention used throughout: the ciphertext alphabet is rotated so
 * that its key letter sits beneath the first letter of the plaintext alphabet.
 * Sources vary on this detail, so it is stated explicitly rather than assumed.
 */
function quagmire(
  id: string,
  name: string,
  variant: 1 | 2 | 3 | 4,
): Technique {
  const needsPa = variant === 1 || variant === 3 || variant === 4;
  const needsCa = variant === 2 || variant === 3 || variant === 4;
  const spec: import('./types').KeyField[] = [];
  if (needsPa) spec.push({ name: 'pa', kind: 'word', minLen: 5, maxLen: 8, label: 'Plaintext alphabet keyword' });
  if (needsCa && variant !== 3) spec.push({ name: 'ca', kind: 'word', minLen: 5, maxLen: 8, label: 'Ciphertext alphabet keyword' });
  spec.push({ name: 'ind', kind: 'word', minLen: 4, maxLen: 7, label: 'Indicator key' });

  const alphabets = (key: Key) => {
    const paKw = lettersOnly(ks(key, 'pa', 'CIPHER'));
    const caKw = lettersOnly(ks(key, 'ca', 'HARBOUR'));
    let PA = A, CA = A;
    if (variant === 1) { PA = keyedAlphabet(paKw); CA = A; }
    if (variant === 2) { PA = A; CA = keyedAlphabet(caKw); }
    if (variant === 3) { PA = keyedAlphabet(paKw); CA = keyedAlphabet(paKw); }
    if (variant === 4) { PA = keyedAlphabet(paKw); CA = keyedAlphabet(caKw); }
    return { PA, CA };
  };

  const descriptions: Record<number, string> = {
    1: 'a keyed plaintext alphabet against a straight ciphertext alphabet',
    2: 'a straight plaintext alphabet against a keyed ciphertext alphabet',
    3: 'the same keyed alphabet on both sides',
    4: 'two different keyed alphabets, one on each side',
  };

  return {
    id,
    name,
    family: 'polyalphabetic',
    difficulty: variant >= 3 ? 5 : 4,
    era: 'American Cryptogram Association, 20th century',
    summary: `A periodic cipher built from ${descriptions[variant]}.`,
    theory:
      'The Quagmire family generalises Vigenère by allowing the plaintext and ciphertext alphabets to be ' +
      `mixed independently. This variant uses ${descriptions[variant]}, driven by a separate indicator key ` +
      'that selects which row applies at each position. Solving one requires recovering the period first, ' +
      'then the alphabets — substantially more work than Vigenère, which is why the ACA treats these as ' +
      'advanced constructions. Alignment convention here: the ciphertext alphabet is rotated so its key ' +
      'letter sits beneath the first letter of the plaintext alphabet.',
    keySpec: spec,
    normalise: lettersOnly,
    encode(pt, key) {
      const { PA, CA } = alphabets(key);
      const ind = lettersOnly(ks(key, 'ind', 'KEY')) || 'A';
      const t = lettersOnly(pt);
      const stream = stretch(ind, t.length);
      const out = t.split('').map((c, i) => {
        const shift = CA.indexOf(stream[i]);
        return CA[mod(shift + PA.indexOf(c), 26)];
      }).join('');
      return {
        output: grouped(out),
        steps: [
          step('Prepare the text', 'Letters only.', t),
          step('Build both alphabets', `This variant uses ${descriptions[variant]}.`,
            `plain  ${PA}\ncipher ${CA}`),
          step('Apply the indicator key', 'Each key letter selects how far the ciphertext alphabet is rotated.',
            stream.slice(0, 30)),
          step('Encipher', 'Index the plain letter in the plaintext alphabet, add the rotation, read from the ciphertext alphabet.',
            alignment(t, stream, out)),
          step('Result', 'Grouped in fives.', grouped(out)),
        ],
      };
    },
    decode(ct, key) {
      const { PA, CA } = alphabets(key);
      const ind = lettersOnly(ks(key, 'ind', 'KEY')) || 'A';
      const t = lettersOnly(ct);
      const stream = stretch(ind, t.length);
      const out = t.split('').map((c, i) => {
        const shift = CA.indexOf(stream[i]);
        return PA[mod(CA.indexOf(c) - shift, 26)];
      }).join('');
      return {
        output: out,
        steps: [
          step('Rebuild both alphabets', 'Same keywords as the sender.', `plain  ${PA}\ncipher ${CA}`),
          step('Regenerate the indicator', 'Same repetition.', stream.slice(0, 30)),
          step('Reverse the lookup', 'Index the cipher letter, subtract the rotation, read from the plaintext alphabet.', out),
        ],
      };
    },
  };
}

const alberti: Technique = {
  id: 'alberti',
  name: 'Alberti disk',
  family: 'polyalphabetic',
  difficulty: 3,
  era: '1467',
  summary: 'Two concentric disks, with the inner one turned a notch at fixed intervals.',
  theory:
    'Leon Battista Alberti built the first mechanical polyalphabetic cipher: an outer fixed ring and an ' +
    'inner movable ring carrying a mixed alphabet. After an agreed number of letters the inner disk turns, ' +
    'switching to a fresh alphabet mid-message. This was the decisive break from monoalphabetic ciphers ' +
    'and predates Vigenère by nearly a century, which is why Alberti is usually called the father of ' +
    'Western cryptography.',
  keySpec: [
    { name: 'keyword', kind: 'word', minLen: 5, maxLen: 8, label: 'Inner disk keyword' },
    { name: 'period', kind: 'int', min: 3, max: 8, label: 'Letters between turns' },
    { name: 'start', kind: 'int', min: 0, max: 25, label: 'Initial disk position' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const inner = keyedAlphabet(lettersOnly(ks(key, 'keyword', 'CIPHER')));
    const period = Math.max(1, kn(key, 'period', 4));
    const start = mod(kn(key, 'start'), 26);
    const t = lettersOnly(pt);
    const turns: string[] = [];
    const out = t.split('').map((c, i) => {
      const turn = Math.floor(i / period);
      const pos = mod(start + turn, 26);
      if (i % period === 0 && turns.length < 4) turns.push(`letters ${i + 1}-${i + period}: disk at ${pos}`);
      return inner[mod(A.indexOf(c) + pos, 26)];
    }).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Set the inner disk', 'A mixed alphabet built from the keyword.', `outer ${A}\ninner ${inner}`),
        step('Turn every few letters', `The disk advances one notch after each block of ${period}.`, turns.join('\n')),
        step('Encipher', 'Read the outer letter, take the inner letter at the offset position.', alignment(t, '', out)),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const inner = keyedAlphabet(lettersOnly(ks(key, 'keyword', 'CIPHER')));
    const period = Math.max(1, kn(key, 'period', 4));
    const start = mod(kn(key, 'start'), 26);
    const t = lettersOnly(ct);
    const out = t.split('').map((c, i) => {
      const pos = mod(start + Math.floor(i / period), 26);
      return A[mod(inner.indexOf(c) - pos, 26)];
    }).join('');
    return {
      output: out,
      steps: [
        step('Rebuild the disks', 'Same keyword, same starting position.', `outer ${A}\ninner ${inner}`),
        step('Track the turns', `Advance one notch every ${period} letters, exactly as the sender did.`, ''),
        step('Read the plaintext', 'Find the letter on the inner disk, read the outer letter at that offset.', out),
      ],
    };
  },
};

/* ------------------------------------------------------------------ *
 * Enigma — three rotors and a reflector, historical wirings.
 * The plugboard is omitted; that is stated plainly in the theory text
 * rather than glossed over, since it was the single biggest contributor
 * to the machine's real key space.
 * ------------------------------------------------------------------ */

const ROTORS: Record<string, { wiring: string; notch: string }> = {
  I:   { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  II:  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  IV:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  V:   { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
};
const REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';

function enigmaRun(text: string, key: Key): { out: string; trace: string[]; startPos: number[] } {
  const order = [ks(key, 'r1', 'I'), ks(key, 'r2', 'II'), ks(key, 'r3', 'III')];
  const pos = [mod(kn(key, 'p1'), 26), mod(kn(key, 'p2'), 26), mod(kn(key, 'p3'), 26)];
  const startPos = pos.slice();
  const rotors = order.map((n) => ROTORS[n] ?? ROTORS.I);
  const notches = rotors.map((r) => A.indexOf(r.notch));
  const trace: string[] = [];
  let out = '';

  for (const ch of text) {
    // Stepping, including the double-step that the pawl mechanism produces.
    if (pos[1] === notches[1]) {
      pos[1] = mod(pos[1] + 1, 26);
      pos[0] = mod(pos[0] + 1, 26);
    } else if (pos[2] === notches[2]) {
      pos[1] = mod(pos[1] + 1, 26);
    }
    pos[2] = mod(pos[2] + 1, 26);

    let c = A.indexOf(ch);
    // Right to left through the rotors.
    for (let r = 2; r >= 0; r--) {
      c = mod(A.indexOf(rotors[r].wiring[mod(c + pos[r], 26)]) - pos[r], 26);
    }
    c = A.indexOf(REFLECTOR_B[c]);
    // Left to right on the return path.
    for (let r = 0; r <= 2; r++) {
      c = mod(rotors[r].wiring.indexOf(A[mod(c + pos[r], 26)]) - pos[r], 26);
    }
    out += A[c];
    if (trace.length < 4) {
      trace.push(`${ch} → ${A[c]}   rotor positions ${pos.map((p) => A[p]).join(' ')}`);
    }
  }
  return { out, trace, startPos };
}

const enigma: Technique = {
  id: 'enigma',
  name: 'Enigma (three rotors)',
  family: 'polyalphabetic',
  difficulty: 5,
  era: '1918-1945',
  summary: 'Rotating wired disks and a reflector produce a new alphabet for every keystroke.',
  theory:
    'Current passes through three rotors, hits a reflector, and returns through all three on a different ' +
    'path. The rightmost rotor steps on every keystroke and the others advance on notches, so the ' +
    'substitution alphabet changes with every letter and does not repeat for 16,900 keystrokes. The ' +
    'reflector makes the machine reciprocal — the same setting encrypts and decrypts — but it also ' +
    'guarantees no letter ever maps to itself, and that single structural leak was the wedge Rejewski ' +
    'and later Bletchley Park drove the attack through. This model implements historical rotors I–V and ' +
    'reflector B with ring settings fixed at A. The plugboard is not implemented: it contributed most of ' +
    'the machine\'s real key space, so what you see here is markedly weaker than the wartime original.',
  keySpec: [
    { name: 'r1', kind: 'choice', options: ['I', 'II', 'III', 'IV', 'V'], label: 'Left rotor' },
    { name: 'r2', kind: 'choice', options: ['I', 'II', 'III', 'IV', 'V'], label: 'Middle rotor' },
    { name: 'r3', kind: 'choice', options: ['I', 'II', 'III', 'IV', 'V'], label: 'Right rotor' },
    { name: 'p1', kind: 'int', min: 0, max: 25, label: 'Left start position' },
    { name: 'p2', kind: 'int', min: 0, max: 25, label: 'Middle start position' },
    { name: 'p3', kind: 'int', min: 0, max: 25, label: 'Right start position' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const t = lettersOnly(pt);
    const { out, trace, startPos } = enigmaRun(t, key);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Set the machine', 'Rotor order and starting positions are the day key.',
          `rotors ${ks(key, 'r1', 'I')} ${ks(key, 'r2', 'II')} ${ks(key, 'r3', 'III')}\n` +
          `start  ${startPos.map((p) => A[p]).join(' ')}\nreflector B`),
        step('Step, then encipher', 'Rotors advance before the current flows, so the first letter already uses a moved position.', trace.join('\n')),
        step('Trace the circuit', 'Right rotor, middle, left, reflector, then back out through all three.',
          'No letter can ever encipher to itself — the reflector forbids it, and that is the flaw that broke the machine.'),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const t = lettersOnly(ct);
    const { out, trace } = enigmaRun(t, key);
    return {
      output: out,
      steps: [
        step('Set the machine identically', 'Same rotors, same starting positions.', ''),
        step('Type the ciphertext in', 'The reflector makes the machine reciprocal, so this is the same operation as encryption.', trace.join('\n')),
        step('Read the plaintext', 'The message.', out),
      ],
    };
  },
};

export const POLYALPHABETIC: Technique[] = [
  vigenere, beaufort, variantBeaufort, gronsfeld, trithemius, autokey,
  runningKey, oneTimePad, porta, alberti,
  quagmire('quagmire-1', 'Quagmire I', 1),
  quagmire('quagmire-2', 'Quagmire II', 2),
  quagmire('quagmire-3', 'Quagmire III', 3),
  quagmire('quagmire-4', 'Quagmire IV', 4),
  enigma,
];
