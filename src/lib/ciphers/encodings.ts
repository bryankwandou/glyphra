import type { Technique } from './types';
import { A, lettersOnly, alnumOnly, chunk, toBytes, fromBytes, step, ks } from './utils';

/** Printable ASCII. Encodings are byte-oriented, so this is the honest domain. */
const ascii = (s: string) => s.replace(/[^\x20-\x7e]/g, '');

/* ------------------------- bit-packed base families ----------------------- */

function packBits(bytes: Uint8Array, bits: number, alphabet: string, pad: string): string {
  let out = '';
  let buffer = 0;
  let held = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    held += 8;
    while (held >= bits) {
      out += alphabet[(buffer >> (held - bits)) & ((1 << bits) - 1)];
      held -= bits;
    }
  }
  if (held > 0) out += alphabet[(buffer << (bits - held)) & ((1 << bits) - 1)];
  if (pad) {
    const block = bits === 6 ? 4 : 8;
    while (out.length % block !== 0) out += pad;
  }
  return out;
}

function unpackBits(text: string, bits: number, alphabet: string): Uint8Array {
  const clean = text.split('').filter((c) => alphabet.includes(c));
  const bytes: number[] = [];
  let buffer = 0;
  let held = 0;
  for (const c of clean) {
    buffer = (buffer << bits) | alphabet.indexOf(c);
    held += bits;
    if (held >= 8) {
      bytes.push((buffer >> (held - 8)) & 0xff);
      held -= 8;
    }
  }
  return new Uint8Array(bytes);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bitBase(opts: {
  id: string; name: string; bits: number; alphabet: string; pad: string;
  era: string; summary: string; theory: string; difficulty: 1 | 2;
}): Technique {
  return {
    id: opts.id,
    name: opts.name,
    family: 'encoding',
    difficulty: opts.difficulty,
    era: opts.era,
    summary: opts.summary,
    theory: opts.theory,
    keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
    normalise: ascii,
    encode(pt) {
      const t = ascii(pt);
      const bytes = toBytes(t);
      const out = packBits(bytes, opts.bits, opts.alphabet, opts.pad);
      return {
        output: out,
        steps: [
          step('Take the bytes', 'Each character becomes its byte value.',
            Array.from(bytes.slice(0, 8)).map((b, i) => `${t[i]} = ${b} = ${b.toString(2).padStart(8, '0')}`).join('\n')),
          step('Regroup the bit stream', `Read the bits back in groups of ${opts.bits} instead of 8.`, ''),
          step('Index the alphabet', `${opts.alphabet.length} symbols cover every ${opts.bits}-bit value.`, opts.alphabet),
          step('Result', opts.pad ? 'Padded so the length lands on a block boundary.' : 'No padding needed.', out),
        ],
      };
    },
    decode(ct) {
      const bytes = unpackBits(ct.replace(/=+$/, ''), opts.bits, opts.alphabet);
      const out = fromBytes(bytes);
      return {
        output: out,
        steps: [
          step('Drop the padding', 'Padding characters carry no data.', ct.replace(/=+$/, '')),
          step('Look up each symbol', `Each gives ${opts.bits} bits.`, ''),
          step('Regroup into bytes', 'Read the bit stream back in groups of 8.', out),
        ],
      };
    },
  };
}

const base64 = bitBase({
  id: 'base64', name: 'Base64', bits: 6, alphabet: B64, pad: '=', difficulty: 1,
  era: '1987 (RFC 989 / PEM)',
  summary: 'Three bytes are repacked as four printable characters.',
  theory:
    'Twenty-four bits divide evenly into four six-bit groups, and 64 symbols cover every six-bit value. ' +
    'It exists because early mail systems mangled anything that was not printable text, so binary data had ' +
    'to be smuggled through as letters. It is an encoding, not a cipher — there is no key and no secrecy, ' +
    'though it is mistaken for one constantly. The trailing = signs are padding to a four-character boundary.',
});

const base32 = bitBase({
  id: 'base32', name: 'Base32', bits: 5, alphabet: B32, pad: '=', difficulty: 2,
  era: '2003 (RFC 3548)',
  summary: 'Five bytes are repacked as eight characters, using an alphabet with no ambiguous glyphs.',
  theory:
    'The alphabet deliberately omits 0, 1 and 8 so they cannot be confused with O, I and B when a human ' +
    'reads a code aloud or types it from paper. That makes it bulkier than Base64 but far more robust in ' +
    'the hands of people, which is why it turns up in recovery codes, onion addresses and TOTP secrets.',
});

const base16: Technique = {
  id: 'base16',
  name: 'Hexadecimal',
  family: 'encoding',
  difficulty: 1,
  era: 'Ubiquitous',
  summary: 'Each byte is written as two hexadecimal digits.',
  theory:
    'Base 16 lines up perfectly with binary — one hex digit is exactly four bits — so a byte is always ' +
    'two characters and the boundaries never shift. It doubles the size of the data, which is why it is ' +
    'used for display and debugging rather than transport.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const t = ascii(pt);
    const out = Array.from(toBytes(t)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
    return {
      output: out,
      steps: [
        step('Take the bytes', 'One byte per character.',
          t.slice(0, 8).split('').map((c) => `${c} = ${c.charCodeAt(0)}`).join('\n')),
        step('Write each in base 16', 'Two digits per byte, always.', out),
      ],
    };
  },
  decode(ct) {
    const clean = ct.replace(/[^0-9a-fA-F]/g, '');
    const bytes = new Uint8Array((clean.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));
    const out = fromBytes(bytes);
    return {
      output: out,
      steps: [
        step('Pair the digits', 'Every two hex digits are one byte.', (clean.match(/.{2}/g) ?? []).join(' ')),
        step('Convert to characters', 'Byte values back to text.', out),
      ],
    };
  },
};

/* ---------------------- big-integer base families ------------------------ */

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function bigBase(opts: {
  id: string; name: string; alphabet: string; era: string;
  summary: string; theory: string; difficulty: 2 | 3;
}): Technique {
  const base = BigInt(opts.alphabet.length);
  return {
    id: opts.id,
    name: opts.name,
    family: 'encoding',
    difficulty: opts.difficulty,
    era: opts.era,
    summary: opts.summary,
    theory: opts.theory,
    keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
    normalise: ascii,
    encode(pt) {
      const bytes = toBytes(ascii(pt));
      let zeros = 0;
      while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
      let n = 0n;
      for (const b of bytes) n = n * 256n + BigInt(b);
      let body = '';
      while (n > 0n) {
        body = opts.alphabet[Number(n % base)] + body;
        n /= base;
      }
      const out = opts.alphabet[0].repeat(zeros) + (body || (bytes.length ? opts.alphabet[0] : ''));
      return {
        output: out,
        steps: [
          step('Read the whole input as one number', 'Every byte is a base-256 digit of a single integer.',
            Array.from(bytes.slice(0, 8)).join(' ') + (bytes.length > 8 ? ' …' : '')),
          step(`Convert to base ${opts.alphabet.length}`, 'Repeatedly divide, collecting remainders from the bottom up.', ''),
          step('Map the digits to symbols', `${opts.alphabet.length} symbols.`, opts.alphabet),
          step('Result', 'Unlike bit-packed encodings, this has no fixed block boundary.', out),
        ],
      };
    },
    decode(ct) {
      const clean = ct.split('').filter((c) => opts.alphabet.includes(c)).join('');
      let zeros = 0;
      while (zeros < clean.length && clean[zeros] === opts.alphabet[0]) zeros++;
      let n = 0n;
      for (const c of clean) n = n * base + BigInt(opts.alphabet.indexOf(c));
      const rev: number[] = [];
      while (n > 0n) { rev.unshift(Number(n % 256n)); n /= 256n; }
      const bytes = new Uint8Array([...new Array(zeros).fill(0), ...rev]);
      // A single leading symbol standing in for an empty body encodes one zero byte.
      const out = fromBytes(bytes.length && zeros === clean.length ? new Uint8Array(zeros) : bytes);
      return {
        output: out,
        steps: [
          step('Map symbols back to digits', `Base ${opts.alphabet.length}.`, clean.slice(0, 40)),
          step('Rebuild the integer', 'Multiply and accumulate.', ''),
          step('Convert back to base 256', 'Each remainder is one byte.', out),
        ],
      };
    },
  };
}

const base58 = bigBase({
  id: 'base58', name: 'Base58', alphabet: B58, difficulty: 3,
  era: '2009 (Bitcoin)',
  summary: 'Base 62 with the visually ambiguous characters removed.',
  theory:
    'Satoshi Nakamoto dropped 0, O, I and l from the alphabet so an address could be read aloud, written ' +
    'by hand, or retyped without a costly mistake, and dropped + and / so a double-click selects the whole ' +
    'string. Because 58 is not a power of two it cannot be done with simple bit shifting — the entire input ' +
    'is treated as one large integer and converted by repeated division. Leading zero bytes are preserved ' +
    'separately, since arithmetic would otherwise swallow them.',
});

const base36 = bigBase({
  id: 'base36', name: 'Base36', alphabet: B36, difficulty: 2,
  era: 'Common in identifiers',
  summary: 'Digits and lowercase letters, treating the input as one integer.',
  theory:
    'Thirty-six symbols is the largest alphabet that survives being case-folded, which matters anywhere ' +
    'the value might pass through a system that uppercases things. Short identifiers and URL slugs use it ' +
    'for exactly that reason.',
});

const base62 = bigBase({
  id: 'base62', name: 'Base62', alphabet: B62, difficulty: 2,
  era: 'Common in URL shorteners',
  summary: 'Digits plus both letter cases — the densest purely alphanumeric encoding.',
  theory:
    'Sixty-two symbols is everything alphanumeric and nothing else, so the output survives URLs, filenames ' +
    'and shell arguments untouched. Link shorteners use it to squeeze the largest counter into the fewest ' +
    'characters without needing to escape anything.',
});

/* ------------------------------- Ascii85 --------------------------------- */

const ascii85: Technique = {
  id: 'ascii85',
  name: 'Ascii85',
  family: 'encoding',
  difficulty: 3,
  era: '1990 (btoa / PostScript)',
  summary: 'Four bytes become five characters, using 85 printable symbols.',
  theory:
    'Eighty-five is the smallest base where five characters can carry four bytes, since 85⁵ just exceeds ' +
    '2³². That makes it about 25% overhead against Base64\'s 33%, which mattered when PostScript and PDF ' +
    'needed to embed images as text. The denser alphabet includes punctuation, so the output is compact ' +
    'but awkward to handle in contexts that treat those characters specially.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const bytes = toBytes(ascii(pt));
    let out = '';
    for (let i = 0; i < bytes.length; i += 4) {
      const group = bytes.slice(i, i + 4);
      const n = group.length;
      let acc = 0;
      for (let j = 0; j < 4; j++) acc = acc * 256 + (group[j] ?? 0);
      const chars: string[] = [];
      let v = acc;
      for (let j = 0; j < 5; j++) { chars.unshift(String.fromCharCode(33 + (v % 85))); v = Math.floor(v / 85); }
      out += chars.slice(0, n + 1).join('');
    }
    return {
      output: out,
      steps: [
        step('Group into four bytes', 'The final group may be short.', Array.from(bytes.slice(0, 8)).join(' ')),
        step('Read each group as a 32-bit number', 'Big-endian.', ''),
        step('Convert to base 85', 'Five digits, offset to printable ASCII starting at "!".', ''),
        step('Trim the final group', 'A group of n bytes emits n+1 characters, so nothing is padded.', out),
      ],
    };
  },
  decode(ct) {
    const clean = ct.split('').filter((c) => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 117).join('');
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 5) {
      const group = clean.slice(i, i + 5);
      const n = group.length;
      const padded = group + 'u'.repeat(5 - n);
      let acc = 0;
      for (const c of padded) acc = acc * 85 + (c.charCodeAt(0) - 33);
      const four = [(acc >>> 24) & 0xff, (acc >>> 16) & 0xff, (acc >>> 8) & 0xff, acc & 0xff];
      bytes.push(...four.slice(0, n - 1));
    }
    const out = fromBytes(new Uint8Array(bytes));
    return {
      output: out,
      steps: [
        step('Group into five characters', 'The final group may be short.', clean.slice(0, 40)),
        step('Pad the last group', 'Missing positions are filled with "u", the highest digit, then discarded after conversion.', ''),
        step('Convert back to bytes', 'Each group yields four bytes; a short group yields fewer.', out),
      ],
    };
  },
};

/* --------------------------- numeric radices ----------------------------- */

function radix(opts: {
  id: string; name: string; base: number; width: number; era: string;
  summary: string; theory: string;
}): Technique {
  return {
    id: opts.id,
    name: opts.name,
    family: 'encoding',
    difficulty: 1,
    era: opts.era,
    summary: opts.summary,
    theory: opts.theory,
    keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
    normalise: ascii,
    encode(pt) {
      const t = ascii(pt);
      const out = t.split('').map((c) => c.charCodeAt(0).toString(opts.base).padStart(opts.width, '0')).join(' ');
      return {
        output: out,
        steps: [
          step('Take the character codes', 'Standard ASCII values.',
            t.slice(0, 8).split('').map((c) => `${c} = ${c.charCodeAt(0)}`).join('\n')),
          step(`Write each in base ${opts.base}`, `Padded to ${opts.width} places so the groups stay aligned.`, out),
        ],
      };
    },
    decode(ct) {
      const groups = ct.trim().split(/\s+/).filter(Boolean);
      const out = groups.map((g) => String.fromCharCode(parseInt(g, opts.base))).join('');
      return {
        output: out,
        steps: [
          step('Split on whitespace', 'Each group is one character.', groups.slice(0, 10).join(' ')),
          step(`Read each as base ${opts.base}`, 'Then map the code point back to a character.', out),
        ],
      };
    },
  };
}

const binary = radix({
  id: 'binary', name: 'Binary (ASCII)', base: 2, width: 8,
  era: '1963 (ASCII)',
  summary: 'Each character is written as eight bits.',
  theory:
    'The most direct view of what a character actually is in memory. Eight bits per character means the ' +
    'output is eight times longer than the input, which makes it useless for storage and perfect for ' +
    'teaching. Recognising the pattern 010xxxxx as uppercase letters and 011xxxxx as lowercase is a ' +
    'genuinely useful reflex.',
});

const octal = radix({
  id: 'octal', name: 'Octal (ASCII)', base: 8, width: 3,
  era: 'Early computing',
  summary: 'Each character is written as three octal digits.',
  theory:
    'Base 8 groups bits in threes, which suited machines with 12, 24 or 36-bit words. Hexadecimal ' +
    'displaced it once 8-bit bytes won, but it survives in Unix file permissions and in escape sequences.',
});

const decimalAscii = radix({
  id: 'decimal-ascii', name: 'Decimal (ASCII)', base: 10, width: 3,
  era: '1963 (ASCII)',
  summary: 'Each character is written as its decimal code point.',
  theory:
    'The plainest possible numeric representation. Its value in puzzles is that the numbers 65-90 and ' +
    '97-122 are recognisable at a glance as uppercase and lowercase letters, so partial decoding is possible ' +
    'by eye.',
});

/* ------------------------------ text escapes ----------------------------- */

const urlEncoding: Technique = {
  id: 'url-encoding',
  name: 'Percent encoding',
  family: 'encoding',
  difficulty: 1,
  era: '1994 (RFC 1738)',
  summary: 'Reserved characters are replaced by a percent sign and two hex digits.',
  theory:
    'URLs give special meaning to characters like /, ? and &, so any of those appearing as data must be ' +
    'escaped. The rule is simple, but layering it — encoding an already-encoded string — is a recurring ' +
    'source of both bugs and deliberate filter evasion, which is why it shows up so often in security work.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const t = ascii(pt);
    const out = t.split('').map((c) =>
      /[A-Za-z0-9\-_.~]/.test(c) ? c : '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join('');
    return {
      output: out,
      steps: [
        step('Identify unreserved characters', 'Letters, digits, hyphen, underscore, period and tilde pass through untouched.', ''),
        step('Escape everything else', 'Percent sign followed by the two-digit hex code.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.replace(/%([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return {
      output: out,
      steps: [
        step('Find every percent sequence', 'Each is a percent sign and exactly two hex digits.', ''),
        step('Substitute the characters back', 'Everything else is already literal.', out),
      ],
    };
  },
};

const htmlEntities: Technique = {
  id: 'html-entities',
  name: 'HTML numeric entities',
  family: 'encoding',
  difficulty: 1,
  era: '1990s',
  summary: 'Each character is written as &#nnn; using its code point.',
  theory:
    'HTML lets any character be written as a numeric reference. It exists so that <, > and & can appear as ' +
    'text rather than markup, but because every character can be written this way it is also a standard ' +
    'trick for slipping past naive filters that only look for the literal characters.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const t = ascii(pt);
    const out = t.split('').map((c) => `&#${c.charCodeAt(0)};`).join('');
    return {
      output: out,
      steps: [
        step('Take each code point', 'Decimal ASCII values.', t.slice(0, 8).split('').map((c) => `${c} = ${c.charCodeAt(0)}`).join('\n')),
        step('Wrap in the entity syntax', 'Ampersand, hash, digits, semicolon.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
    return {
      output: out,
      steps: [
        step('Match every entity', 'The pattern &#digits; delimits each one unambiguously.', ''),
        step('Substitute the characters', 'Code point back to character.', out),
      ],
    };
  },
};

const quotedPrintable: Technique = {
  id: 'quoted-printable',
  name: 'Quoted-printable',
  family: 'encoding',
  difficulty: 2,
  era: '1992 (RFC 1521)',
  summary: 'Mostly readable text, with awkward bytes escaped as =XX.',
  theory:
    'Designed for email carrying text that is nearly all ASCII with occasional accented characters. ' +
    'Unlike Base64 it leaves the readable parts readable, so a message stays legible even to software that ' +
    'does not decode it. The escape character is =, which itself has to be escaped as =3D.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const t = ascii(pt);
    const out = t.split('').map((c) => {
      const code = c.charCodeAt(0);
      const safe = code >= 33 && code <= 126 && c !== '=';
      return safe || c === ' ' ? c : '=' + code.toString(16).toUpperCase().padStart(2, '0');
    }).join('');
    return {
      output: out,
      steps: [
        step('Leave printable characters alone', 'Codes 33-126, except the equals sign itself.', ''),
        step('Escape the rest', 'Equals sign followed by two uppercase hex digits.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return {
      output: out,
      steps: [
        step('Find the escape sequences', 'Equals sign plus two hex digits.', ''),
        step('Substitute back', 'Everything else was already literal.', out),
      ],
    };
  },
};

/* ------------------------------- symbolic -------------------------------- */

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};
const MORSE_REV: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

const morse: Technique = {
  id: 'morse',
  name: 'Morse code',
  family: 'encoding',
  difficulty: 1,
  era: '1844',
  summary: 'Letters become sequences of short and long marks.',
  theory:
    'Samuel Morse and Alfred Vail assigned the shortest sequences to the most frequent English letters — ' +
    'E is a single dot, T a single dash — which makes it one of the earliest deliberate uses of frequency ' +
    'to compress a message. It is a code for transmission, not concealment; anyone who knows it reads it ' +
    'directly. It survives because a human ear can decode it through noise that would defeat almost ' +
    'anything else.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: alnumOnly,
  encode(pt) {
    const t = alnumOnly(pt);
    const out = t.split('').map((c) => MORSE[c] ?? '').join(' ');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters and digits.', t),
        step('Look up each character', 'Frequent letters have the shortest codes.',
          t.slice(0, 8).split('').map((c) => `${c} = ${MORSE[c]}`).join('\n')),
        step('Separate with spaces', 'Without a separator the stream is ambiguous.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.trim().split(/\s+/).filter(Boolean).map((m) => MORSE_REV[m] ?? '').join('');
    return {
      output: out,
      steps: [
        step('Split on the gaps', 'Each group is one character.', ct.trim().split(/\s+/).slice(0, 10).join(' ')),
        step('Look each group up', 'The code is a prefix-free tree, so no group is ambiguous.', out),
      ],
    };
  },
};

const TAP_SQUARE = 'ABCDEFGHIJLMNOPQRSTUVWXYZ'; // K folded into C

const tapCode: Technique = {
  id: 'tap-code',
  name: 'Tap code',
  family: 'encoding',
  difficulty: 2,
  era: 'Used from 1965',
  summary: 'Each letter becomes two groups of taps: row, pause, column.',
  theory:
    'American prisoners in Vietnam used this to talk through cell walls — Captain Carlyle Harris taught it ' +
    'after learning of it from an instructor, and it spread through the camps. A 5×5 grid with K folded ' +
    'into C means every letter is two small numbers, and taps carry through concrete when speech will not. ' +
    'It needs no equipment, no light and no shared secret beyond the grid itself.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: (s) => lettersOnly(s).replace(/K/g, 'C'),
  encode(pt) {
    const t = lettersOnly(pt).replace(/K/g, 'C');
    const out = t.split('').map((c) => {
      const i = TAP_SQUARE.indexOf(c);
      return '.'.repeat(Math.floor(i / 5) + 1) + ' ' + '.'.repeat((i % 5) + 1);
    }).join('  /  ');
    return {
      output: out,
      steps: [
        step('Fold K into C', 'A 5×5 grid holds only 25 letters.', t),
        step('Find each letter in the grid', 'Row and column, both counted from one.',
          t.slice(0, 5).split('').map((c) => {
            const i = TAP_SQUARE.indexOf(c);
            return `${c} → row ${Math.floor(i / 5) + 1}, column ${(i % 5) + 1}`;
          }).join('\n')),
        step('Tap it out', 'Row taps, a pause, then column taps.', out),
      ],
    };
  },
  decode(ct) {
    const pairs = ct.split('/').map((p) => p.trim()).filter(Boolean);
    const out = pairs.map((p) => {
      const [r, c] = p.split(/\s+/).map((g) => g.length);
      return TAP_SQUARE[(r - 1) * 5 + (c - 1)] ?? '';
    }).join('');
    return {
      output: out,
      steps: [
        step('Count the taps', 'Two groups per letter, separated by a pause.', pairs.slice(0, 6).join('  /  ')),
        step('Read off the grid', 'Row then column.', out),
      ],
    };
  },
};

const NATO = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
  'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec',
  'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];

const natoPhonetic: Technique = {
  id: 'nato-phonetic',
  name: 'NATO phonetic alphabet',
  family: 'encoding',
  difficulty: 1,
  era: '1956',
  summary: 'Each letter is spoken as a distinct word.',
  theory:
    'The words were chosen after years of intelligibility testing across languages and over bad radio ' +
    'links: no two sound alike, and each survives heavy distortion. Juliett carries a double T and Alfa ' +
    'drops the PH so that speakers of other languages do not mispronounce them. It conceals nothing — its ' +
    'entire purpose is the opposite.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => NATO[A.indexOf(c)]).join(' ');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Say each letter as a word', 'Chosen so no two can be confused over a noisy channel.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.trim().split(/\s+/).filter(Boolean)
      .map((w) => {
        const i = NATO.findIndex((n) => n.toLowerCase() === w.toLowerCase());
        return i === -1 ? '' : A[i];
      }).join('');
    return {
      output: out,
      steps: [
        step('Split into words', 'One word per letter.', ct.trim().split(/\s+/).slice(0, 8).join(' ')),
        step('Take each initial', 'The word maps back to the letter it names.', out),
      ],
    };
  },
};

const LEET: Record<string, string> = { A: '4', B: '8', E: '3', G: '6', I: '1', O: '0', S: '5', T: '7', Z: '2' };
const LEET_REV: Record<string, string> = Object.fromEntries(Object.entries(LEET).map(([k, v]) => [v, k]));

const leetspeak: Technique = {
  id: 'leetspeak',
  name: 'Leetspeak',
  family: 'encoding',
  difficulty: 1,
  era: '1980s bulletin boards',
  summary: 'Certain letters are replaced by digits that resemble them.',
  theory:
    'It grew on bulletin boards partly as an in-group marker and partly to slip words past crude keyword ' +
    'filters — the same substitution trick still turns up in spam and in attempts to evade moderation. ' +
    'Only the visually suggestive letters are mapped here, which keeps the substitution reversible.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => LEET[c] ?? c).join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Swap the lookalikes', 'A→4, B→8, E→3, G→6, I→1, O→0, S→5, T→7, Z→2.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.toUpperCase().split('').map((c) => LEET_REV[c] ?? c).join('');
    return {
      output: out,
      steps: [step('Swap the digits back', 'Each digit stands for exactly one letter.', out)],
    };
  },
};

const braille: Technique = {
  id: 'braille',
  name: 'Braille',
  family: 'encoding',
  difficulty: 2,
  era: '1824',
  summary: 'Each letter becomes a pattern of raised dots in a six-position cell.',
  theory:
    'Louis Braille was fifteen when he finished it, adapting a military night-writing system that had ' +
    'proved too complex for soldiers. Six dot positions give 64 combinations, enough for the alphabet with ' +
    'room for punctuation and contractions. The Unicode block used here maps each cell to a single ' +
    'character, so the pattern survives as text.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => BRAILLE[A.indexOf(c)]).join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Map to dot patterns', 'Six positions per cell, two columns of three.',
          t.slice(0, 8).split('').map((c) => `${c} = ${BRAILLE[A.indexOf(c)]}`).join('\n')),
        step('Result', 'One Unicode braille cell per letter.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.split('').map((c) => {
      const i = BRAILLE.indexOf(c);
      return i === -1 ? '' : A[i];
    }).join('');
    return {
      output: out,
      steps: [step('Read each cell', 'Dot pattern back to letter.', out)],
    };
  },
};

const BRAILLE = ['⠁', '⠃', '⠉', '⠙', '⠑', '⠋', '⠛', '⠓', '⠊', '⠚', '⠅', '⠇', '⠍',
  '⠝', '⠕', '⠏', '⠟', '⠗', '⠎', '⠞', '⠥', '⠧', '⠺', '⠭', '⠽', '⠵'];

const grayCode: Technique = {
  id: 'gray-code',
  name: 'Gray code',
  family: 'encoding',
  difficulty: 3,
  era: '1947 (patented 1953)',
  summary: 'Each byte is rewritten so that consecutive values differ in exactly one bit.',
  theory:
    'Frank Gray designed it for pulse-code modulation, but the property that made it famous is mechanical: ' +
    'on a rotary encoder, ordinary binary can show a wildly wrong reading mid-transition when several bits ' +
    'change at once. Gray code changes one bit at a time, so the worst possible misreading is off by one. ' +
    'The transform is g = n XOR (n >> 1), and inverting it requires accumulating the XOR from the top bit down.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const t = ascii(pt);
    const out = t.split('').map((c) => {
      const n = c.charCodeAt(0);
      return ((n ^ (n >> 1)) & 0xff).toString(2).padStart(8, '0');
    }).join(' ');
    return {
      output: out,
      steps: [
        step('Take the byte values', 'One byte per character.', t.slice(0, 6).split('').map((c) => `${c} = ${c.charCodeAt(0)}`).join('\n')),
        step('Apply g = n XOR (n >> 1)', 'Shift right by one and exclusive-or with the original.',
          t.slice(0, 4).split('').map((c) => {
            const n = c.charCodeAt(0);
            return `${n.toString(2).padStart(8, '0')} → ${((n ^ (n >> 1)) & 0xff).toString(2).padStart(8, '0')}`;
          }).join('\n')),
        step('Result', 'Adjacent code values now differ in exactly one bit.', out),
      ],
    };
  },
  decode(ct) {
    const groups = ct.trim().split(/\s+/).filter(Boolean);
    const out = groups.map((g) => {
      let n = parseInt(g, 2);
      let mask = n >> 1;
      while (mask) { n ^= mask; mask >>= 1; }
      return String.fromCharCode(n);
    }).join('');
    return {
      output: out,
      steps: [
        step('Split into bytes', 'Eight bits each.', groups.slice(0, 8).join(' ')),
        step('Accumulate the XOR downward', 'Unlike encoding, inversion needs every higher bit to resolve each lower one.', out),
      ],
    };
  },
};

export const ENCODINGS: Technique[] = [
  base64, base32, base16, base58, base36, base62, ascii85,
  binary, octal, decimalAscii,
  urlEncoding, htmlEntities, quotedPrintable,
  morse, tapCode, natoPhonetic, leetspeak, braille, grayCode,
];
