import type { Technique, Key, Step } from './types';
import {
  A, lettersOnly, alnumOnly, identity, mod, modInv, keyedAlphabet, chunk,
  grouped, renderSquare, step, ks, kn, foldJ,
} from './utils';

/** Apply a plain→cipher alphabet map, letter by letter. */
function mapAlphabet(text: string, from: string, to: string): string {
  let out = '';
  for (const ch of text) {
    const i = from.indexOf(ch);
    out += i === -1 ? ch : to[i];
  }
  return out;
}

/** Show the first few substitutions so a student can check the mapping by eye. */
function sampleMapping(text: string, from: string, to: string, n = 6): string {
  return text
    .slice(0, n)
    .split('')
    .map((ch) => {
      const i = from.indexOf(ch);
      return i === -1 ? `${ch} → ${ch}` : `${ch} → ${to[i]}`;
    })
    .join('\n');
}

const caesar: Technique = {
  id: 'caesar',
  name: 'Caesar shift',
  family: 'substitution',
  difficulty: 1,
  era: 'c. 58 BC',
  summary: 'Every letter moves a fixed number of places along the alphabet.',
  theory:
    'Number the alphabet A=0 through Z=25. Encryption is C = (P + k) mod 26 for a single shift k, ' +
    'and decryption is P = (C - k) mod 26. There are only 25 useful keys, so exhaustive search breaks ' +
    'it in seconds — which is exactly why it is the first cipher anyone is shown.',
  keySpec: [{ name: 'shift', kind: 'int', min: 1, max: 25, label: 'Shift (1-25)' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const k = mod(kn(key, 'shift'), 26);
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => A[mod(A.indexOf(c) + k, 26)]).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', `Strip everything that is not a letter and uppercase the rest.`, t),
        step('Build the shifted alphabet', `Rotate the alphabet left by ${k}.`,
          `plain  ${A}\ncipher ${A.slice(k) + A.slice(0, k)}`),
        step('Substitute', `Replace each letter using that pairing. C = (P + ${k}) mod 26.`,
          sampleMapping(t, A, A.slice(k) + A.slice(0, k))),
        step('Group in fives', 'Classical ciphertext is transmitted in five-letter groups.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const k = mod(kn(key, 'shift'), 26);
    const t = lettersOnly(ct);
    const out = t.split('').map((c) => A[mod(A.indexOf(c) - k, 26)]).join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Remove the transmission spacing.', t),
        step('Reverse the shift', `P = (C - ${k}) mod 26.`,
          `cipher ${A}\nplain  ${A.slice(26 - k) + A.slice(0, 26 - k)}`),
        step('Read the plaintext', 'Substitute back through the reversed pairing.', out),
      ],
    };
  },
};

function fixedShift(id: string, name: string, k: number, difficulty: 1 | 2): Technique {
  return {
    id,
    name,
    family: 'substitution',
    difficulty,
    era: '1980s (Usenet)',
    summary: `A Caesar shift locked at ${k}, so encoding and decoding are the same operation.`,
    theory:
      `Because ${k} is exactly half of 26, applying the shift twice returns the original text. ` +
      'That self-inverse property is the entire appeal: one routine both hides and reveals. It offers ' +
      'no security whatsoever and was only ever meant to keep spoilers out of plain sight.',
    keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
    normalise: lettersOnly,
    encode(pt) {
      const t = lettersOnly(pt);
      const out = t.split('').map((c) => A[mod(A.indexOf(c) + k, 26)]).join('');
      return {
        output: grouped(out),
        steps: [
          step('Prepare the text', 'Letters only, uppercased.', t),
          step(`Shift by ${k}`, 'The key is fixed, so there is nothing to guess.',
            `plain  ${A}\ncipher ${A.slice(k) + A.slice(0, k)}`),
          step('Result', 'Applying the same shift again would undo this.', grouped(out)),
        ],
      };
    },
    decode(ct) {
      const t = lettersOnly(ct);
      const out = t.split('').map((c) => A[mod(A.indexOf(c) - k, 26)]).join('');
      return {
        output: out,
        steps: [
          step('Prepare the text', 'Letters only.', t),
          step(`Shift by ${k} again`, 'The operation is its own inverse.', out),
        ],
      };
    },
  };
}

const rot13 = fixedShift('rot13', 'ROT13', 13, 1);

const rot5: Technique = {
  id: 'rot5',
  name: 'ROT5 (digits)',
  family: 'substitution',
  difficulty: 1,
  era: '1980s',
  summary: 'The digit-only counterpart of ROT13: each digit moves five places.',
  theory:
    'Digits 0-9 form a ring of ten, and five is half of ten, so shifting by five is self-inverse ' +
    'in the same way ROT13 is for letters. Letters pass through untouched.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: (s) => s.replace(/[^0-9]/g, ''),
  encode(pt) {
    const t = pt.replace(/[^0-9]/g, '');
    const out = t.split('').map((d) => String((Number(d) + 5) % 10)).join('');
    return {
      output: out,
      steps: [
        step('Keep the digits', 'Everything that is not 0-9 is discarded.', t),
        step('Add five, wrap at ten', 'D = (d + 5) mod 10.', `${t}\n${out}`),
      ],
    };
  },
  decode(ct) {
    const t = ct.replace(/[^0-9]/g, '');
    const out = t.split('').map((d) => String((Number(d) + 5) % 10)).join('');
    return {
      output: out,
      steps: [step('Add five again', 'Self-inverse on a ring of ten.', out)],
    };
  },
};

const rot47: Technique = {
  id: 'rot47',
  name: 'ROT47',
  family: 'substitution',
  difficulty: 2,
  era: '1990s',
  summary: 'Rotates across the 94 printable ASCII characters instead of just the 26 letters.',
  theory:
    'The printable ASCII range 33-126 holds 94 characters. Adding 47 — half of 94 — wraps within ' +
    'that range and is self-inverse. Unlike ROT13 it scrambles punctuation and digits too, which makes ' +
    'the output look far more alien while being no harder to break.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: (s) => s.replace(/[^\x21-\x7e]/g, ''),
  encode(pt) {
    const t = pt.replace(/[^\x21-\x7e]/g, '');
    const out = t.split('').map((c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94))).join('');
    return {
      output: out,
      steps: [
        step('Restrict to printable ASCII', 'Codes 33 (!) through 126 (~).', t),
        step('Rotate by 47', 'C = 33 + ((code - 33 + 47) mod 94).',
          t.slice(0, 5).split('').map((c, i) => `${c} (${c.charCodeAt(0)}) → ${out[i]} (${out.charCodeAt(i)})`).join('\n')),
        step('Result', 'Half of 94, so a second pass restores the input.', out),
      ],
    };
  },
  decode(ct) {
    const t = ct.replace(/[^\x21-\x7e]/g, '');
    const out = t.split('').map((c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94))).join('');
    return { output: out, steps: [step('Rotate by 47 again', 'Self-inverse.', out)] };
  },
};

const rot18: Technique = {
  id: 'rot18',
  name: 'ROT18',
  family: 'substitution',
  difficulty: 1,
  era: '1990s',
  summary: 'ROT13 on the letters and ROT5 on the digits, applied together.',
  theory:
    'Both halves are self-inverse, so the combination is too. It exists because ROT13 alone leaves ' +
    'numbers legible, which often gave away the content it was meant to hide.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: alnumOnly,
  encode(pt) {
    const t = alnumOnly(pt);
    const f = (c: string) => (/[0-9]/.test(c) ? String((Number(c) + 5) % 10) : A[mod(A.indexOf(c) + 13, 26)]);
    const out = t.split('').map(f).join('');
    return {
      output: out,
      steps: [
        step('Keep letters and digits', 'Uppercased.', t),
        step('Split the work', 'Letters take a shift of 13; digits take a shift of 5.', `${t}\n${out}`),
      ],
    };
  },
  decode(ct) {
    const t = alnumOnly(ct);
    const f = (c: string) => (/[0-9]/.test(c) ? String((Number(c) + 5) % 10) : A[mod(A.indexOf(c) + 13, 26)]);
    const out = t.split('').map(f).join('');
    return { output: out, steps: [step('Apply the same pass again', 'Both halves are self-inverse.', out)] };
  },
};

const atbash: Technique = {
  id: 'atbash',
  name: 'Atbash',
  family: 'substitution',
  difficulty: 1,
  era: 'c. 600 BC',
  summary: 'The alphabet is reversed: A pairs with Z, B with Y, and so on.',
  theory:
    'Originally a Hebrew scribal device — the name comes from aleph-tav-beth-shin, the first and last ' +
    'letters paired inward. The map is C = 25 - P, which is its own inverse. There is no key at all, ' +
    'so it hides content only from a reader who has never seen it before.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const rev = A.split('').reverse().join('');
    const out = mapAlphabet(t, A, rev);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Reverse the alphabet', 'C = 25 - P.', `plain  ${A}\ncipher ${rev}`),
        step('Substitute', 'Each letter takes its mirror.', sampleMapping(t, A, rev)),
        step('Result', 'Grouped for transmission.', grouped(out)),
      ],
    };
  },
  decode(ct) {
    const t = lettersOnly(ct);
    const rev = A.split('').reverse().join('');
    const out = mapAlphabet(t, A, rev);
    return {
      output: out,
      steps: [step('Mirror again', 'Atbash undoes itself.', out)],
    };
  },
};

const AFFINE_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

const affine: Technique = {
  id: 'affine',
  name: 'Affine cipher',
  family: 'substitution',
  difficulty: 2,
  era: 'Classical',
  summary: 'Multiply the letter index, then add an offset, all modulo 26.',
  theory:
    'C = (a·P + b) mod 26. The multiplier a has to be coprime with 26 or the map collapses and becomes ' +
    'impossible to invert, which leaves twelve legal values for a and twenty-six for b — 312 keys in total. ' +
    'Decryption needs the modular inverse of a: P = a⁻¹·(C - b) mod 26. Caesar is the special case a = 1.',
  keySpec: [
    { name: 'a', kind: 'choice', options: AFFINE_A.map(String), label: 'Multiplier a (coprime with 26)' },
    { name: 'b', kind: 'int', min: 0, max: 25, label: 'Offset b' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const a = kn(key, 'a', 5);
    const b = mod(kn(key, 'b'), 26);
    const t = lettersOnly(pt);
    const cipherAlpha = A.split('').map((_, i) => A[mod(a * i + b, 26)]).join('');
    const out = mapAlphabet(t, A, cipherAlpha);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Check the multiplier', `gcd(${a}, 26) must be 1 for the map to be reversible.`,
          `${a} is coprime with 26, so every letter maps to a distinct letter.`),
        step('Build the cipher alphabet', `C = (${a}·P + ${b}) mod 26 applied to each index.`,
          `plain  ${A}\ncipher ${cipherAlpha}`),
        step('Substitute', 'Read each plaintext letter through that alphabet.', sampleMapping(t, A, cipherAlpha)),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const a = kn(key, 'a', 5);
    const b = mod(kn(key, 'b'), 26);
    const inv = modInv(a, 26);
    const t = lettersOnly(ct);
    if (inv === null) return { output: '', steps: [step('Invalid key', `${a} has no inverse mod 26.`)] };
    const out = t.split('').map((c) => A[mod(inv * (A.indexOf(c) - b), 26)]).join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Find the modular inverse', `Solve ${a}·x ≡ 1 (mod 26).`, `a⁻¹ = ${inv}, because ${a}×${inv} = ${a * inv} ≡ 1 (mod 26).`),
        step('Invert the map', `P = ${inv}·(C - ${b}) mod 26.`, out),
      ],
    };
  },
};

const multiplicative: Technique = {
  id: 'multiplicative',
  name: 'Multiplicative cipher',
  family: 'substitution',
  difficulty: 2,
  era: 'Classical',
  summary: 'An affine cipher with the offset fixed at zero — pure multiplication.',
  theory:
    'C = (a·P) mod 26 with a coprime to 26. A is always fixed, since 0 multiplied by anything is 0. ' +
    'That single invariant leaks the cipher immediately to anyone doing frequency analysis.',
  keySpec: [{ name: 'a', kind: 'choice', options: AFFINE_A.filter((x) => x !== 1).map(String), label: 'Multiplier a' }],
  normalise: lettersOnly,
  encode(pt, key) {
    return affine.encode(pt, { a: kn(key, 'a', 5), b: 0 });
  },
  decode(ct, key) {
    return affine.decode(ct, { a: kn(key, 'a', 5), b: 0 });
  },
};

const keywordCipher: Technique = {
  id: 'keyword',
  name: 'Keyword substitution',
  family: 'substitution',
  difficulty: 2,
  era: '16th century',
  summary: 'A keyword seeds a mixed alphabet, and the remaining letters follow in order.',
  theory:
    'Write the keyword with repeats removed, then continue with the unused letters in alphabetical order. ' +
    'The result is a full substitution alphabet that a person can memorise from one word instead of ' +
    'carrying a written table — the practical advantage that kept it in field use for centuries. ' +
    'Its weakness is that the tail of the alphabet stays in order, which cryptanalysts exploit.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 5, maxLen: 9, label: 'Keyword' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const alpha = keyedAlphabet(kw);
    const t = lettersOnly(pt);
    const out = mapAlphabet(t, A, alpha);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Deduplicate the keyword', `"${kw}" with repeated letters removed.`,
          Array.from(new Set(kw)).join('')),
        step('Complete the alphabet', 'Append every letter the keyword did not use, in order.',
          `plain  ${A}\ncipher ${alpha}`),
        step('Substitute', 'Read each letter through the mixed alphabet.', sampleMapping(t, A, alpha)),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const alpha = keyedAlphabet(kw);
    const t = lettersOnly(ct);
    const out = mapAlphabet(t, alpha, A);
    return {
      output: out,
      steps: [
        step('Rebuild the mixed alphabet', `From the keyword "${kw}".`, `cipher ${alpha}\nplain  ${A}`),
        step('Substitute in reverse', 'Find each ciphertext letter in the mixed alphabet and read the plain letter above it.', out),
      ],
    };
  },
};

const simpleSubstitution: Technique = {
  id: 'simple-substitution',
  name: 'Simple substitution',
  family: 'substitution',
  difficulty: 3,
  era: 'Antiquity',
  summary: 'An arbitrary one-to-one mapping over the whole alphabet.',
  theory:
    'The key is a complete permutation of the alphabet, giving 26! ≈ 4×10²⁶ possibilities — far beyond ' +
    'brute force. It still falls to frequency analysis, because the statistical fingerprint of the ' +
    'language survives the substitution intact. Al-Kindi described the attack in the ninth century.',
  keySpec: [{ name: 'alphabet', kind: 'alphabet', label: 'Cipher alphabet (26 letters)' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const alpha = ks(key, 'alphabet', A);
    const t = lettersOnly(pt);
    const out = mapAlphabet(t, A, alpha);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('The key is the whole alphabet', 'One arbitrary permutation, 26! in total.',
          `plain  ${A}\ncipher ${alpha}`),
        step('Substitute', 'Straight table lookup.', sampleMapping(t, A, alpha)),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const alpha = ks(key, 'alphabet', A);
    const t = lettersOnly(ct);
    const out = mapAlphabet(t, alpha, A);
    return {
      output: out,
      steps: [
        step('Invert the table', 'Swap the two rows.', `cipher ${alpha}\nplain  ${A}`),
        step('Substitute back', 'Look each ciphertext letter up in the cipher row.', out),
      ],
    };
  },
};

const a1z26: Technique = {
  id: 'a1z26',
  name: 'A1Z26',
  family: 'substitution',
  difficulty: 1,
  era: 'Modern puzzle convention',
  summary: 'Letters are replaced by their position in the alphabet.',
  theory:
    'A becomes 1 and Z becomes 26. Separators are essential — without them 1-2 and 12 are ' +
    'indistinguishable, which is the ambiguity that makes unseparated numeric ciphers interesting.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => A.indexOf(c) + 1).join('-');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Index each letter', 'A=1 … Z=26.',
          t.slice(0, 8).split('').map((c) => `${c} = ${A.indexOf(c) + 1}`).join('\n')),
        step('Join with hyphens', 'The separator resolves the two-digit ambiguity.', out),
      ],
    };
  },
  decode(ct) {
    const nums = ct.match(/\d+/g) ?? [];
    const out = nums.map((n) => A[Number(n) - 1] ?? '').join('');
    return {
      output: out,
      steps: [
        step('Split on the separators', 'Each group is one letter index.', nums.join(' ')),
        step('Convert back to letters', '1=A … 26=Z.', out),
      ],
    };
  },
};

const BACON_A = 'A', BACON_B = 'B';

const baconian: Technique = {
  id: 'baconian',
  name: 'Baconian cipher',
  family: 'substitution',
  difficulty: 2,
  era: '1605',
  summary: 'Each letter becomes a five-symbol group drawn from just two symbols.',
  theory:
    'Francis Bacon encoded every letter as five binary marks — his "biliteral" alphabet, and effectively ' +
    'a five-bit binary code three centuries before Baudot. The point was concealment rather than secrecy: ' +
    'the two symbols could be hidden as two typefaces in an innocent-looking passage, so the message was ' +
    'invisible rather than merely unreadable. This build uses the 26-letter variant so every letter is distinct.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => {
      const i = A.indexOf(c);
      return i.toString(2).padStart(5, '0').replace(/0/g, BACON_A).replace(/1/g, BACON_B);
    }).join(' ');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Index and write in binary', 'A=0 … Z=25, padded to five bits.',
          t.slice(0, 5).split('').map((c) => {
            const i = A.indexOf(c);
            return `${c} = ${i} = ${i.toString(2).padStart(5, '0')}`;
          }).join('\n')),
        step('Relabel the bits', '0 becomes A, 1 becomes B.', out),
      ],
    };
  },
  decode(ct) {
    const groups = ct.toUpperCase().replace(/[^AB]/g, '').match(/.{1,5}/g) ?? [];
    const out = groups
      .filter((g) => g.length === 5)
      .map((g) => A[parseInt(g.replace(/A/g, '0').replace(/B/g, '1'), 2)] ?? '')
      .join('');
    return {
      output: out,
      steps: [
        step('Keep only the two symbols', 'Everything else is decoration.', groups.join(' ')),
        step('Read each group as binary', 'A=0, B=1, five bits per letter.', out),
      ],
    };
  },
};

/**
 * Pigpen is a graphical cipher. The grid geometry is preserved here as distinct
 * box-drawing characters so the mapping stays exactly one-to-one in text form.
 */
const PIGPEN_SYMBOLS = '⌐¬⌊⌋⌈⌉◱◲◳◰◫◧◨◩◪△▽◁▷▲▼◀▶⬖⬗⬘';

const pigpen: Technique = {
  id: 'pigpen',
  name: 'Pigpen (Freemason) cipher',
  family: 'substitution',
  difficulty: 2,
  era: '18th century',
  summary: 'Letters are replaced by the fragment of grid that encloses them.',
  theory:
    'Letters are laid into two tic-tac-toe grids and two X grids; each letter is drawn as the lines ' +
    'surrounding its cell, with a dot marking the second grid of each pair. Used by Freemasons and later ' +
    'by Union prisoners in the American Civil War. Cryptographically it is an ordinary monoalphabetic ' +
    'substitution — the unfamiliar glyphs are the only obstacle, and they are not much of one.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => PIGPEN_SYMBOLS[A.indexOf(c)]).join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Lay out the grids', 'Two tic-tac-toe grids and two X grids hold 26 cells between them.',
          `${A}\n${PIGPEN_SYMBOLS}`),
        step('Draw each cell', 'Replace the letter with the lines that enclose it.', out),
      ],
    };
  },
  decode(ct) {
    const out = ct.split('').map((c) => {
      const i = PIGPEN_SYMBOLS.indexOf(c);
      return i === -1 ? '' : A[i];
    }).join('');
    return {
      output: out,
      steps: [
        step('Locate each glyph', 'Find which grid cell the drawing corresponds to.', `${PIGPEN_SYMBOLS}\n${A}`),
        step('Read the letters', 'Cell position gives the letter.', out),
      ],
    };
  },
};

const polybius: Technique = {
  id: 'polybius',
  name: 'Polybius square',
  family: 'substitution',
  difficulty: 2,
  era: 'c. 150 BC',
  summary: 'Each letter becomes its row and column number in a 5×5 grid.',
  theory:
    'Twenty-five cells hold the alphabet with I and J sharing one, so every letter becomes a pair of ' +
    'digits from 1 to 5. Polybius devised it for signalling with torches — two groups of raised torches ' +
    'per letter. Its real importance is later: turning letters into coordinate pairs is the first move ' +
    'in Bifid, Nihilist and ADFGVX, which is why this square keeps reappearing.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 5, maxLen: 8, label: 'Square keyword' }],
  normalise: foldJ,
  encode(pt, key) {
    const kw = foldJ(ks(key, 'keyword', 'CIPHER'));
    const square = keyedAlphabet(kw, A.replace('J', ''));
    const t = foldJ(pt);
    const out = t.split('').map((c) => {
      const i = square.indexOf(c);
      return `${Math.floor(i / 5) + 1}${(i % 5) + 1}`;
    }).join(' ');
    return {
      output: out,
      steps: [
        step('Fold J into I', 'A 5×5 grid holds 25 cells, so two letters must share one.', t),
        step('Build the square', `Keyword "${kw}" first, then the unused letters in order.`,
          renderSquare(square, 5, '12345', '12345')),
        step('Read coordinates', 'Row first, then column.',
          t.slice(0, 6).split('').map((c) => {
            const i = square.indexOf(c);
            return `${c} → row ${Math.floor(i / 5) + 1}, col ${(i % 5) + 1}`;
          }).join('\n')),
        step('Result', 'Each letter is now two digits.', out),
      ],
    };
  },
  decode(ct, key) {
    const kw = foldJ(ks(key, 'keyword', 'CIPHER'));
    const square = keyedAlphabet(kw, A.replace('J', ''));
    const digits = ct.replace(/[^1-5]/g, '');
    const out = (digits.match(/.{1,2}/g) ?? [])
      .filter((p) => p.length === 2)
      .map((p) => square[(Number(p[0]) - 1) * 5 + (Number(p[1]) - 1)] ?? '')
      .join('');
    return {
      output: out,
      steps: [
        step('Rebuild the square', `From keyword "${kw}".`, renderSquare(square, 5, '12345', '12345')),
        step('Pair the digits', 'Every two digits are one coordinate.', (digits.match(/.{1,2}/g) ?? []).join(' ')),
        step('Look up each cell', 'Row then column.', out),
      ],
    };
  },
};

const keyedCaesar: Technique = {
  id: 'keyed-caesar',
  name: 'Keyed Caesar',
  family: 'substitution',
  difficulty: 2,
  era: 'Classical',
  summary: 'A keyword mixes the alphabet, then a Caesar shift is applied on top.',
  theory:
    'Combining the two removes the ordered tail that gives a plain keyword cipher away, without ' +
    'requiring the operator to memorise a full random permutation. The key is a word plus a number.',
  keySpec: [
    { name: 'keyword', kind: 'word', minLen: 5, maxLen: 9, label: 'Keyword' },
    { name: 'shift', kind: 'int', min: 1, max: 25, label: 'Shift' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const s = mod(kn(key, 'shift'), 26);
    const base = keyedAlphabet(kw);
    const alpha = base.slice(s) + base.slice(0, s);
    const t = lettersOnly(pt);
    const out = mapAlphabet(t, A, alpha);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Mix with the keyword', `"${kw}" first, then the remaining letters.`, base),
        step('Rotate by the shift', `Rotate that mixed alphabet left by ${s}.`, `plain  ${A}\ncipher ${alpha}`),
        step('Substitute', 'Table lookup.', sampleMapping(t, A, alpha)),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const s = mod(kn(key, 'shift'), 26);
    const base = keyedAlphabet(kw);
    const alpha = base.slice(s) + base.slice(0, s);
    const t = lettersOnly(ct);
    const out = mapAlphabet(t, alpha, A);
    return {
      output: out,
      steps: [
        step('Rebuild the alphabet', `Keyword "${kw}", rotated by ${s}.`, `cipher ${alpha}\nplain  ${A}`),
        step('Substitute back', 'Reverse lookup.', out),
      ],
    };
  },
};

/**
 * Chaocipher, as disclosed from Byrne's papers in 2010. Two alphabets permute
 * after every character, which makes it dynamic rather than merely polyalphabetic.
 * Positions below are zero-indexed; the classical description uses 1-indexed
 * "zenith" (position 1) and "nadir" (position 14).
 */
function chaoPermuteLeft(left: string[], idx: number): string[] {
  const rotated = left.slice(idx).concat(left.slice(0, idx));
  const taken = rotated.splice(1, 1)[0];
  rotated.splice(13, 0, taken);
  return rotated;
}

function chaoPermuteRight(right: string[], idx: number): string[] {
  let rotated = right.slice(idx).concat(right.slice(0, idx));
  rotated = rotated.slice(1).concat(rotated.slice(0, 1));
  const taken = rotated.splice(2, 1)[0];
  rotated.splice(13, 0, taken);
  return rotated;
}

const chaocipher: Technique = {
  id: 'chaocipher',
  name: 'Chaocipher',
  family: 'substitution',
  difficulty: 5,
  era: '1918, disclosed 2010',
  summary: 'Two alphabets that rearrange themselves after every single letter.',
  theory:
    'John F. Byrne built this on two rotating disks — a left alphabet for ciphertext and a right one for ' +
    'plaintext. After each letter both disks permute: the used letter swings to the top, then one letter ' +
    'is lifted out and reinserted at the fourteenth position. Because the state changes every character, ' +
    'the same plaintext letter almost never enciphers the same way twice. Byrne offered a prize for ' +
    'breaking it and died without revealing the method; the mechanism only became public in 2010.',
  keySpec: [
    { name: 'left', kind: 'word', minLen: 5, maxLen: 9, label: 'Left (cipher) alphabet keyword' },
    { name: 'right', kind: 'word', minLen: 5, maxLen: 9, label: 'Right (plain) alphabet keyword' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    let left = keyedAlphabet(lettersOnly(ks(key, 'left', 'HARBOUR'))).split('');
    let right = keyedAlphabet(lettersOnly(ks(key, 'right', 'LANTERN'))).split('');
    const startL = left.join(''), startR = right.join('');
    const t = lettersOnly(pt);
    const trace: string[] = [];
    let out = '';
    for (let n = 0; n < t.length; n++) {
      const i = right.indexOf(t[n]);
      const c = left[i];
      out += c;
      if (n < 4) trace.push(`${t[n]} at right[${i}] → left[${i}] = ${c}`);
      left = chaoPermuteLeft(left, i);
      right = chaoPermuteRight(right, i);
    }
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Set both alphabets', 'Left carries ciphertext, right carries plaintext.',
          `left  ${startL}\nright ${startR}`),
        step('Encipher one letter at a time', 'Find the plain letter in the right alphabet; the left alphabet at the same index gives the cipher letter.',
          trace.join('\n')),
        step('Permute after every letter', 'Left: rotate the used letter to the top, lift position 2 and reinsert at 14. Right: rotate to the top, advance one more, lift position 3 and reinsert at 14.',
          `left  ${left.join('')}\nright ${right.join('')}   (state after the final letter)`),
        step('Result', 'The alphabets never repeat a state, so the cipher resists frequency analysis.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    let left = keyedAlphabet(lettersOnly(ks(key, 'left', 'HARBOUR'))).split('');
    let right = keyedAlphabet(lettersOnly(ks(key, 'right', 'LANTERN'))).split('');
    const t = lettersOnly(ct);
    let out = '';
    const trace: string[] = [];
    for (let n = 0; n < t.length; n++) {
      const i = left.indexOf(t[n]);
      const p = right[i];
      out += p;
      if (n < 4) trace.push(`${t[n]} at left[${i}] → right[${i}] = ${p}`);
      left = chaoPermuteLeft(left, i);
      right = chaoPermuteRight(right, i);
    }
    return {
      output: out,
      steps: [
        step('Restore the starting alphabets', 'Both keywords are needed.', ''),
        step('Reverse the lookup', 'Find the cipher letter on the left; read the plain letter at the same index on the right.', trace.join('\n')),
        step('Apply the identical permutation', 'Sender and receiver stay in step because the permutation depends only on the index, not on direction.', out),
      ],
    };
  },
};

export const SUBSTITUTION: Technique[] = [
  caesar, rot13, rot5, rot18, rot47, atbash, affine, multiplicative,
  keywordCipher, simpleSubstitution, a1z26, baconian, pigpen, polybius,
  keyedCaesar, chaocipher,
];
