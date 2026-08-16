import type { Technique } from './types';
import {
  A, lettersOnly, foldJ, mod, modInv, keyedAlphabet, chunk, grouped,
  renderSquare, step, ks, kn,
} from './utils';

const SQ25 = A.replace('J', '');

/**
 * Split into digraphs, breaking doubled pairs and padding an odd tail. This is
 * part of `normalise` for every digraph cipher, so the round-trip guarantee is
 * stated against the padded form rather than the raw input.
 */
function digraphs(text: string): string {
  const t = foldJ(text);
  let out = '';
  let i = 0;
  while (i < t.length) {
    const a = t[i];
    const b = t[i + 1];
    const filler = a === 'X' ? 'Q' : 'X';
    if (b === undefined || a === b) {
      out += a + filler;
      i += 1;
    } else {
      out += a + b;
      i += 2;
    }
  }
  return out;
}

function pos(square: string, ch: string): [number, number] {
  const i = square.indexOf(ch);
  return [Math.floor(i / 5), i % 5];
}

const playfair: Technique = {
  id: 'playfair',
  name: 'Playfair cipher',
  family: 'polygraphic',
  difficulty: 3,
  era: '1854',
  summary: 'Letters are enciphered two at a time using their positions in a 5×5 square.',
  theory:
    'Charles Wheatstone invented it; Lord Playfair pushed it into government use, and it kept his name. ' +
    'Pairs of letters are located in a keyed 5×5 square and replaced according to three rules — same row, ' +
    'same column, or opposite corners of the rectangle they form. Because it works on 676 digraphs rather ' +
    'than 26 letters, single-letter frequency analysis is useless against it. Britain used it in the Boer ' +
    'War and both world wars for tactical traffic that only needed to stay secret for a few hours.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 5, maxLen: 9, label: 'Square keyword' }],
  normalise: digraphs,
  encode(pt, key) {
    const kw = foldJ(ks(key, 'keyword', 'CIPHER'));
    const sq = keyedAlphabet(kw, SQ25);
    const t = digraphs(pt);
    const pairs = chunk(t, 2);
    const trace: string[] = [];
    const out = pairs.map((p) => {
      const [r1, c1] = pos(sq, p[0]);
      const [r2, c2] = pos(sq, p[1]);
      let res: string;
      let rule: string;
      if (r1 === r2) {
        res = sq[r1 * 5 + ((c1 + 1) % 5)] + sq[r2 * 5 + ((c2 + 1) % 5)];
        rule = 'same row — take the letter to the right of each, wrapping';
      } else if (c1 === c2) {
        res = sq[((r1 + 1) % 5) * 5 + c1] + sq[((r2 + 1) % 5) * 5 + c2];
        rule = 'same column — take the letter below each, wrapping';
      } else {
        res = sq[r1 * 5 + c2] + sq[r2 * 5 + c1];
        rule = 'rectangle — swap the columns, keep the rows';
      }
      if (trace.length < 4) trace.push(`${p} → ${res}   (${rule})`);
      return res;
    }).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare digraphs', 'Fold J into I, split into pairs, break any doubled pair with a filler, pad an odd tail.', chunk(t, 2).join(' ')),
        step('Build the square', `Keyword "${kw}" first, then the remaining letters.`, renderSquare(sq, 5)),
        step('Apply the three rules', 'Same row, same column, or opposite corners.', trace.join('\n')),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = foldJ(ks(key, 'keyword', 'CIPHER'));
    const sq = keyedAlphabet(kw, SQ25);
    const t = foldJ(ct);
    const out = chunk(t, 2).map((p) => {
      if (p.length < 2) return p;
      const [r1, c1] = pos(sq, p[0]);
      const [r2, c2] = pos(sq, p[1]);
      if (r1 === r2) return sq[r1 * 5 + mod(c1 - 1, 5)] + sq[r2 * 5 + mod(c2 - 1, 5)];
      if (c1 === c2) return sq[mod(r1 - 1, 5) * 5 + c1] + sq[mod(r2 - 1, 5) * 5 + c2];
      return sq[r1 * 5 + c2] + sq[r2 * 5 + c1];
    }).join('');
    return {
      output: out,
      steps: [
        step('Rebuild the square', `From keyword "${kw}".`, renderSquare(sq, 5)),
        step('Reverse the rules', 'Same row moves left, same column moves up, rectangles swap back the same way.', chunk(out, 2).join(' ')),
        step('Read the plaintext', 'Fillers inserted during preparation are still present and have to be read around.', out),
      ],
    };
  },
};

const twoSquare: Technique = {
  id: 'two-square',
  name: 'Two-square cipher',
  family: 'polygraphic',
  difficulty: 4,
  era: '19th century',
  summary: 'Two stacked 5×5 squares encipher a digraph by swapping its columns.',
  theory:
    'The first letter is located in the upper square and the second in the lower, then the columns are ' +
    'exchanged. The operation is reciprocal, so one procedure both encrypts and decrypts. It carries a ' +
    'known flaw: when both letters fall in the same column the pair passes through untouched, and roughly ' +
    'one digraph in five does exactly that, handing the analyst free plaintext.',
  keySpec: [
    { name: 'top', kind: 'word', minLen: 5, maxLen: 8, label: 'Upper square keyword' },
    { name: 'bottom', kind: 'word', minLen: 5, maxLen: 8, label: 'Lower square keyword' },
  ],
  normalise: digraphs,
  encode(pt, key) {
    const top = keyedAlphabet(foldJ(ks(key, 'top', 'CIPHER')), SQ25);
    const bot = keyedAlphabet(foldJ(ks(key, 'bottom', 'HARBOUR')), SQ25);
    const t = digraphs(pt);
    let transparent = 0;
    const out = chunk(t, 2).map((p) => {
      const [r1, c1] = pos(top, p[0]);
      const [r2, c2] = pos(bot, p[1]);
      if (c1 === c2) { transparent++; return p; }
      return top[r1 * 5 + c2] + bot[r2 * 5 + c1];
    }).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare digraphs', 'Fold J into I and split into pairs.', chunk(t, 2).join(' ')),
        step('Build both squares', 'Upper square holds the first letter, lower square the second.',
          `upper\n${renderSquare(top, 5)}\n\nlower\n${renderSquare(bot, 5)}`),
        step('Swap the columns', 'Keep each row, exchange the columns between the two squares.', chunk(out, 2).join(' ')),
        step('Note the transparencies', `${transparent} of ${Math.ceil(t.length / 2)} pairs shared a column and passed through unchanged — the cipher's structural leak.`,
          grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const top = keyedAlphabet(foldJ(ks(key, 'top', 'CIPHER')), SQ25);
    const bot = keyedAlphabet(foldJ(ks(key, 'bottom', 'HARBOUR')), SQ25);
    const t = foldJ(ct);
    const out = chunk(t, 2).map((p) => {
      if (p.length < 2) return p;
      const [r1, c1] = pos(top, p[0]);
      const [r2, c2] = pos(bot, p[1]);
      if (c1 === c2) return p;
      return top[r1 * 5 + c2] + bot[r2 * 5 + c1];
    }).join('');
    return {
      output: out,
      steps: [
        step('Rebuild both squares', 'Same two keywords.', `upper\n${renderSquare(top, 5)}\n\nlower\n${renderSquare(bot, 5)}`),
        step('Swap the columns again', 'The operation is its own inverse.', chunk(out, 2).join(' ')),
        step('Read the plaintext', 'Preparation fillers remain in place.', out),
      ],
    };
  },
};

const fourSquare: Technique = {
  id: 'four-square',
  name: 'Four-square cipher',
  family: 'polygraphic',
  difficulty: 4,
  era: '1902',
  summary: 'Two plain squares and two keyed squares, arranged in a 2×2 block.',
  theory:
    'Félix Delastelle laid out four 5×5 squares: the two on the diagonal hold the alphabet in order and ' +
    'carry the plaintext, while the two off-diagonal squares are keyed and carry the ciphertext. A digraph ' +
    'is located in the plain squares and read out of the cipher squares at the opposite corners. Unlike ' +
    'the two-square cipher it has no transparent digraphs, and unlike Playfair it needs no rule for ' +
    'doubled letters — a cleaner construction on both counts.',
  keySpec: [
    { name: 'k1', kind: 'word', minLen: 5, maxLen: 8, label: 'Upper-right keyword' },
    { name: 'k2', kind: 'word', minLen: 5, maxLen: 8, label: 'Lower-left keyword' },
  ],
  normalise: digraphs,
  encode(pt, key) {
    const c1sq = keyedAlphabet(foldJ(ks(key, 'k1', 'CIPHER')), SQ25);
    const c2sq = keyedAlphabet(foldJ(ks(key, 'k2', 'HARBOUR')), SQ25);
    const t = digraphs(pt);
    const trace: string[] = [];
    const out = chunk(t, 2).map((p) => {
      const [r1, col1] = pos(SQ25, p[0]);
      const [r2, col2] = pos(SQ25, p[1]);
      const res = c1sq[r1 * 5 + col2] + c2sq[r2 * 5 + col1];
      if (trace.length < 4) trace.push(`${p} → ${res}   (row ${r1 + 1}/col ${col2 + 1} of the upper-right, row ${r2 + 1}/col ${col1 + 1} of the lower-left)`);
      return res;
    }).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare digraphs', 'Fold J into I and split into pairs.', chunk(t, 2).join(' ')),
        step('Lay out the four squares', 'Plain alphabets on the diagonal, keyed squares off it.',
          `upper-left (plain)\n${renderSquare(SQ25, 5)}\n\nupper-right (keyed)\n${renderSquare(c1sq, 5)}\n\nlower-left (keyed)\n${renderSquare(c2sq, 5)}`),
        step('Read the opposite corners', 'First letter gives a row, second letter gives a column, and vice versa.', trace.join('\n')),
        step('Result', 'No digraph can pass through unchanged.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const c1sq = keyedAlphabet(foldJ(ks(key, 'k1', 'CIPHER')), SQ25);
    const c2sq = keyedAlphabet(foldJ(ks(key, 'k2', 'HARBOUR')), SQ25);
    const t = foldJ(ct);
    const out = chunk(t, 2).map((p) => {
      if (p.length < 2) return p;
      const [r1, col1] = pos(c1sq, p[0]);
      const [r2, col2] = pos(c2sq, p[1]);
      return SQ25[r1 * 5 + col2] + SQ25[r2 * 5 + col1];
    }).join('');
    return {
      output: out,
      steps: [
        step('Rebuild the keyed squares', 'Both keywords are needed.',
          `upper-right\n${renderSquare(c1sq, 5)}\n\nlower-left\n${renderSquare(c2sq, 5)}`),
        step('Reverse the corner lookup', 'Locate the pair in the keyed squares, read out of the plain ones.', chunk(out, 2).join(' ')),
        step('Read the plaintext', 'Preparation fillers remain in place.', out),
      ],
    };
  },
};

/* --------------------------------- Hill ---------------------------------- */

function matFromString(s: string, n: number): number[][] {
  const nums = s.split(',').map((x) => parseInt(x.trim(), 10) || 0);
  return Array.from({ length: n }, (_, r) => nums.slice(r * n, r * n + n));
}

function determinant(m: number[][]): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let det = 0;
  for (let c = 0; c < n; c++) {
    const minor = m.slice(1).map((row) => row.filter((_, j) => j !== c));
    det += (c % 2 === 0 ? 1 : -1) * m[0][c] * determinant(minor);
  }
  return det;
}

/** Inverse over Z26 via the adjugate. Returns null when the determinant is not invertible. */
function matInvMod26(m: number[][]): number[][] | null {
  const n = m.length;
  const det = mod(determinant(m), 26);
  const dInv = modInv(det, 26);
  if (dInv === null) return null;
  const adj: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const minor = m.filter((_, i) => i !== r).map((row) => row.filter((_, j) => j !== c));
      const cof = ((r + c) % 2 === 0 ? 1 : -1) * (n === 1 ? 1 : determinant(minor));
      adj[c][r] = mod(cof, 26); // transpose as we go
    }
  }
  return adj.map((row) => row.map((v) => mod(v * dInv, 26)));
}

function matApply(m: number[][], vec: number[]): number[] {
  return m.map((row) => mod(row.reduce((s, v, i) => s + v * vec[i], 0), 26));
}

function renderMatrix(m: number[][]): string {
  return m.map((row) => row.map((v) => String(v).padStart(2)).join('  ')).join('\n');
}

const HILL2_KEYS = ['3,3,2,5', '5,8,17,3', '7,8,11,11', '1,2,3,5', '9,4,5,7', '11,8,3,7'];
const HILL3_KEYS = ['6,24,1,13,16,10,20,17,15', '17,17,5,21,18,21,2,2,19', '2,4,5,9,2,1,3,17,7'];

function hill(n: 2 | 3, options: string[]): Technique {
  return {
    id: `hill-${n}x${n}`,
    name: `Hill cipher (${n}×${n})`,
    family: 'polygraphic',
    difficulty: n === 2 ? 4 : 5,
    era: '1929',
    summary: `Blocks of ${n} letters are multiplied by an ${n}×${n} matrix modulo 26.`,
    theory:
      'Lester Hill treated a block of letters as a vector and multiplied it by a key matrix over Z26. It ' +
      'was the first cipher to apply linear algebra directly, and it diffuses each plaintext letter across ' +
      `all ${n} letters of the output block, which defeats frequency analysis at every order below ${n}. ` +
      'The matrix has to be invertible modulo 26, meaning its determinant must be coprime with 26. Being ' +
      'purely linear is also its undoing: a known-plaintext attack recovers the matrix by solving a linear ' +
      'system, so a handful of matched blocks breaks it outright.',
    keySpec: [{ name: 'matrix', kind: 'choice', options, label: `Key matrix (${n}×${n}, row-major)` }],
    normalise: (s) => {
      const t = lettersOnly(s);
      const pad = (n - (t.length % n)) % n;
      return t + 'X'.repeat(pad);
    },
    encode(pt, key) {
      const m = matFromString(ks(key, 'matrix', options[0]), n);
      const t = this.normalise(pt);
      const blocks = chunk(t, n);
      const trace: string[] = [];
      const out = blocks.map((b) => {
        const vec = b.split('').map((c) => A.indexOf(c));
        const res = matApply(m, vec);
        if (trace.length < 3) trace.push(`${b} = [${vec.join(', ')}] → [${res.join(', ')}] = ${res.map((v) => A[v]).join('')}`);
        return res.map((v) => A[v]).join('');
      }).join('');
      return {
        output: grouped(out),
        steps: [
          step('Prepare and pad', `Letters only, padded with X so the length divides by ${n}.`, blocks.join(' ')),
          step('Check the matrix', `The determinant must be coprime with 26 or the matrix cannot be inverted.`,
            `${renderMatrix(m)}\n\ndet = ${mod(determinant(m), 26)} (mod 26)`),
          step('Multiply each block', 'Treat the block as a column vector and reduce the product modulo 26.', trace.join('\n')),
          step('Result', 'Grouped in fives.', grouped(out)),
        ],
      };
    },
    decode(ct, key) {
      const m = matFromString(ks(key, 'matrix', options[0]), n);
      const inv = matInvMod26(m);
      const t = lettersOnly(ct);
      if (!inv) return { output: '', steps: [step('Invalid key', 'The determinant is not coprime with 26, so no inverse exists.')] };
      const out = chunk(t, n).filter((b) => b.length === n).map((b) =>
        matApply(inv, b.split('').map((c) => A.indexOf(c))).map((v) => A[v]).join('')).join('');
      return {
        output: out,
        steps: [
          step('Invert the matrix modulo 26', 'Compute the adjugate, then scale it by the inverse of the determinant.',
            `key\n${renderMatrix(m)}\n\ninverse\n${renderMatrix(inv)}`),
          step('Multiply each block by the inverse', `Blocks of ${n}, reduced modulo 26.`, chunk(out, n).join(' ')),
          step('Read the plaintext', 'Any X padding added during preparation is still present at the end.', out),
        ],
      };
    },
  };
}

export const POLYGRAPHIC: Technique[] = [
  playfair, twoSquare, fourSquare, hill(2, HILL2_KEYS), hill(3, HILL3_KEYS),
];
