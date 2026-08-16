import type { Technique } from './types';
import {
  A, lettersOnly, alnumOnly, foldJ, keyedAlphabet, chunk, grouped,
  renderSquare, step, ks, kn,
} from './utils';
import { columnarEncode, columnarDecode } from './transposition';

const SQ25 = A.replace('J', '');

/* --------------------------------- Bifid --------------------------------- */

const bifid: Technique = {
  id: 'bifid',
  name: 'Bifid cipher',
  family: 'fractionation',
  difficulty: 4,
  era: 'c. 1901',
  summary: 'Letters split into coordinates, the coordinates are shuffled, then recombined into new letters.',
  theory:
    'Delastelle\'s insight was to break each letter into two independent parts and then mix those parts ' +
    'before reassembling them. Every letter becomes a row and a column in a 5×5 square; within each block ' +
    'all the rows are written out first and all the columns after, and the resulting digit stream is read ' +
    'back in pairs. A single plaintext letter therefore influences two separate ciphertext letters, and ' +
    'two plaintext letters contribute to one ciphertext letter. That is genuine diffusion, decades before ' +
    'the term existed, and it is what makes Bifid substantially harder than anything purely substitutional.',
  keySpec: [
    { name: 'keyword', kind: 'word', minLen: 5, maxLen: 8, label: 'Square keyword' },
    { name: 'period', kind: 'int', min: 4, max: 9, label: 'Period' },
  ],
  normalise: foldJ,
  encode(pt, key) {
    const sq = keyedAlphabet(foldJ(ks(key, 'keyword', 'CIPHER')), SQ25);
    const period = Math.max(2, kn(key, 'period', 5));
    const t = foldJ(pt);
    const trace: string[] = [];
    let out = '';
    for (const block of chunk(t, period)) {
      const rows: number[] = [], cols: number[] = [];
      for (const ch of block) {
        const i = sq.indexOf(ch);
        rows.push(Math.floor(i / 5));
        cols.push(i % 5);
      }
      const seq = rows.concat(cols);
      let piece = '';
      for (let i = 0; i < seq.length; i += 2) piece += sq[seq[i] * 5 + seq[i + 1]];
      if (trace.length < 3) {
        trace.push(
          `block ${block}\n  rows    ${rows.map((r) => r + 1).join(' ')}\n` +
          `  cols    ${cols.map((c) => c + 1).join(' ')}\n` +
          `  stream  ${seq.map((d) => d + 1).join('')}\n  → ${piece}`,
        );
      }
      out += piece;
    }
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Fold J into I.', t),
        step('Build the square', `Keyword "${ks(key, 'keyword', 'CIPHER')}".`, renderSquare(sq, 5, '12345', '12345')),
        step('Split each block into coordinates', `Blocks of ${period}. Write all the row numbers, then all the column numbers.`, trace.join('\n\n')),
        step('Read the stream back in pairs', 'Each new pair is a fresh coordinate, giving a new letter.', out),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const sq = keyedAlphabet(foldJ(ks(key, 'keyword', 'CIPHER')), SQ25);
    const period = Math.max(2, kn(key, 'period', 5));
    const t = foldJ(ct);
    let out = '';
    for (const block of chunk(t, period)) {
      const seq: number[] = [];
      for (const ch of block) {
        const i = sq.indexOf(ch);
        seq.push(Math.floor(i / 5), i % 5);
      }
      const half = block.length;
      const rows = seq.slice(0, half);
      const cols = seq.slice(half);
      for (let i = 0; i < half; i++) out += sq[rows[i] * 5 + cols[i]];
    }
    return {
      output: out,
      steps: [
        step('Rebuild the square', 'Same keyword.', renderSquare(sq, 5, '12345', '12345')),
        step('Expand each block back to a digit stream', `Blocks of ${period}, two digits per letter.`, ''),
        step('Cut the stream in half', 'The first half is the row numbers, the second half the columns.', ''),
        step('Recombine', 'Pair row i with column i to recover each letter.', out),
      ],
    };
  },
};

/* --------------------------------- Trifid -------------------------------- */

const TRIFID_ALPHABET = A + '.';

const trifid: Technique = {
  id: 'trifid',
  name: 'Trifid cipher',
  family: 'fractionation',
  difficulty: 5,
  era: '1902',
  summary: 'The same idea as Bifid, but each letter splits into three coordinates instead of two.',
  theory:
    'Twenty-seven cells — a 3×3×3 cube holding the alphabet plus one filler — give every letter three ' +
    'coordinates in the range 1 to 3. Within each block all the first coordinates are written, then all ' +
    'the seconds, then all the thirds, and the stream is read back in threes. Splitting into three parts ' +
    'rather than two spreads each plaintext letter across even more of the output, and Delastelle intended ' +
    'it as the stronger sibling of Bifid. Solving one by hand is a serious undertaking.',
  keySpec: [
    { name: 'keyword', kind: 'word', minLen: 5, maxLen: 8, label: 'Cube keyword' },
    { name: 'period', kind: 'int', min: 4, max: 8, label: 'Period' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const cube = keyedAlphabet(lettersOnly(ks(key, 'keyword', 'CIPHER')), TRIFID_ALPHABET);
    const period = Math.max(2, kn(key, 'period', 5));
    const t = lettersOnly(pt);
    const trace: string[] = [];
    let out = '';
    for (const block of chunk(t, period)) {
      const a: number[] = [], b: number[] = [], c: number[] = [];
      for (const ch of block) {
        const i = cube.indexOf(ch);
        a.push(Math.floor(i / 9));
        b.push(Math.floor((i % 9) / 3));
        c.push(i % 3);
      }
      const seq = a.concat(b, c);
      let piece = '';
      for (let i = 0; i < seq.length; i += 3) piece += cube[seq[i] * 9 + seq[i + 1] * 3 + seq[i + 2]];
      if (trace.length < 2) {
        trace.push(
          `block ${block}\n  layer  ${a.map((x) => x + 1).join(' ')}\n` +
          `  row    ${b.map((x) => x + 1).join(' ')}\n  col    ${c.map((x) => x + 1).join(' ')}\n  → ${piece}`,
        );
      }
      out += piece;
    }
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Build the cube', 'Twenty-seven cells: the keyed alphabet plus one filler, arranged 3×3×3.',
          [0, 1, 2].map((l) => `layer ${l + 1}\n${renderSquare(cube.slice(l * 9, l * 9 + 9), 3, '123', '123')}`).join('\n\n')),
        step('Split into three coordinates', `Blocks of ${period}. Write all the layers, then all the rows, then all the columns.`, trace.join('\n\n')),
        step('Read the stream back in threes', 'Each new triple addresses a cell in the cube.', out),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const cube = keyedAlphabet(lettersOnly(ks(key, 'keyword', 'CIPHER')), TRIFID_ALPHABET);
    const period = Math.max(2, kn(key, 'period', 5));
    // The cube's 27th cell is a filler symbol, and it can legitimately appear in
    // the ciphertext — stripping to letters alone would silently drop it.
    const t = ct.toUpperCase().split('').filter((c) => cube.includes(c)).join('');
    let out = '';
    for (const block of chunk(t, period)) {
      const seq: number[] = [];
      for (const ch of block) {
        const i = cube.indexOf(ch);
        seq.push(Math.floor(i / 9), Math.floor((i % 9) / 3), i % 3);
      }
      const n = block.length;
      const a = seq.slice(0, n), b = seq.slice(n, 2 * n), c = seq.slice(2 * n);
      for (let i = 0; i < n; i++) out += cube[a[i] * 9 + b[i] * 3 + c[i]];
    }
    return {
      output: out,
      steps: [
        step('Rebuild the cube', 'Same keyword.', ''),
        step('Expand to a digit stream', `Blocks of ${period}, three digits per letter.`, ''),
        step('Cut the stream into thirds', 'Layers, then rows, then columns.', ''),
        step('Recombine', 'Take the i-th value from each third to address one cell.', out),
      ],
    };
  },
};

/* --------------------------------- ADFGVX -------------------------------- */

function adfgvx(id: string, name: string, labels: string, alphabet: string, difficulty: 4 | 5): Technique {
  const size = labels.length;
  const prepare = size === 5 ? foldJ : alnumOnly;
  return {
    id,
    name,
    family: 'fractionation',
    difficulty,
    era: id === 'adfgx' ? 'March 1918' : 'June 1918',
    summary: `A ${size}×${size} square turns each character into two of the letters ${labels.split('').join(', ')}, then a columnar transposition scrambles them.`,
    theory:
      'The German army fielded this in the spring of 1918. The letters chosen as coordinates were picked ' +
      'because they sound nothing alike in Morse, which cut down on transmission errors. Fractionating ' +
      'first and transposing second is the important part: the transposition separates the two halves of ' +
      'each character and scatters them across the message, so an attacker cannot even identify which ' +
      'symbols belong together. Georges Painvin broke it in 1918 under enormous pressure and lost ' +
      'considerable weight doing so — it remains one of the celebrated feats of hand cryptanalysis.' +
      (size === 6 ? ' The six-by-six version added the digits, which the five-by-five original could not carry.' : ''),
    keySpec: [
      { name: 'square', kind: 'word', minLen: 5, maxLen: 8, label: 'Square keyword' },
      { name: 'transposition', kind: 'word', minLen: 5, maxLen: 8, label: 'Transposition keyword' },
    ],
    normalise: prepare,
    encode(pt, key) {
      const sq = keyedAlphabet(prepare(ks(key, 'square', 'CIPHER')), alphabet);
      const tk = lettersOnly(ks(key, 'transposition', 'HARBOUR'));
      const t = prepare(pt);
      let frac = '';
      for (const ch of t) {
        const i = sq.indexOf(ch);
        frac += labels[Math.floor(i / size)] + labels[i % size];
      }
      const { out } = columnarEncode(frac, tk);
      return {
        output: grouped(out),
        steps: [
          step('Prepare the text', size === 5 ? 'Fold J into I.' : 'Letters and digits, uppercased.', t),
          step('Build the square', `Keyword "${ks(key, 'square', 'CIPHER')}", labelled ${labels}.`,
            renderSquare(sq, size, labels, labels)),
          step('Fractionate', 'Each character becomes its row label followed by its column label.',
            t.slice(0, 6).split('').map((c) => {
              const i = sq.indexOf(c);
              return `${c} → ${labels[Math.floor(i / size)]}${labels[i % size]}`;
            }).join('\n') + `\n\n${frac.slice(0, 60)}${frac.length > 60 ? '…' : ''}`),
          step('Transpose the fractionated text', `Columnar transposition under "${tk}". This is what separates the two halves of each character.`, out),
          step('Result', 'Grouped in fives.', grouped(out)),
        ],
      };
    },
    decode(ct, key) {
      const sq = keyedAlphabet(prepare(ks(key, 'square', 'CIPHER')), alphabet);
      const tk = lettersOnly(ks(key, 'transposition', 'HARBOUR'));
      const t = ct.toUpperCase().split('').filter((c) => labels.includes(c)).join('');
      const { out: frac } = columnarDecode(t, tk);
      let plain = '';
      for (let i = 0; i + 1 < frac.length; i += 2) {
        plain += sq[labels.indexOf(frac[i]) * size + labels.indexOf(frac[i + 1])] ?? '';
      }
      return {
        output: plain,
        steps: [
          step('Undo the transposition first', `Columnar decode under "${tk}".`, frac.slice(0, 60) + (frac.length > 60 ? '…' : '')),
          step('Rebuild the square', `Keyword "${ks(key, 'square', 'CIPHER')}".`, renderSquare(sq, size, labels, labels)),
          step('Recombine the pairs', 'Every two label letters address one cell.', plain),
        ],
      };
    },
  };
}

/* -------------------------------- Nihilist ------------------------------- */

const nihilist: Technique = {
  id: 'nihilist',
  name: 'Nihilist cipher',
  family: 'fractionation',
  difficulty: 3,
  era: '1880s',
  summary: 'Plaintext and key are both turned into square coordinates, then added together as numbers.',
  theory:
    'Russian revolutionaries used this against the Tsarist police. Both the message and a repeating key ' +
    'are converted to two-digit Polybius coordinates, and the pairs are added as ordinary numbers with no ' +
    'carry reduction — so the sums run from 22 to 110. It is really a Vigenère cipher operating on ' +
    'coordinates rather than letters, and it inherits the same fatal periodicity: find the key length and ' +
    'the message falls apart into simple additive columns.',
  keySpec: [
    { name: 'square', kind: 'word', minLen: 5, maxLen: 8, label: 'Square keyword' },
    { name: 'keyword', kind: 'word', minLen: 4, maxLen: 7, label: 'Additive keyword' },
  ],
  normalise: foldJ,
  encode(pt, key) {
    const sq = keyedAlphabet(foldJ(ks(key, 'square', 'CIPHER')), SQ25);
    const kw = foldJ(ks(key, 'keyword', 'HARBOUR')) || 'A';
    const t = foldJ(pt);
    const num = (ch: string) => {
      const i = sq.indexOf(ch);
      return (Math.floor(i / 5) + 1) * 10 + (i % 5) + 1;
    };
    const nums = t.split('').map((c, i) => num(c) + num(kw[i % kw.length]));
    return {
      output: nums.join(' '),
      steps: [
        step('Prepare the text', 'Fold J into I.', t),
        step('Build the square', `Keyword "${ks(key, 'square', 'CIPHER')}".`, renderSquare(sq, 5, '12345', '12345')),
        step('Convert both to numbers', 'Row then column, as a two-digit value.',
          t.slice(0, 6).split('').map((c, i) => `${c}=${num(c)} + ${kw[i % kw.length]}=${num(kw[i % kw.length])} → ${num(c) + num(kw[i % kw.length])}`).join('\n')),
        step('Add without carrying', `The additive key "${kw}" repeats across the message.`, nums.join(' ')),
      ],
    };
  },
  decode(ct, key) {
    const sq = keyedAlphabet(foldJ(ks(key, 'square', 'CIPHER')), SQ25);
    const kw = foldJ(ks(key, 'keyword', 'HARBOUR')) || 'A';
    const num = (ch: string) => {
      const i = sq.indexOf(ch);
      return (Math.floor(i / 5) + 1) * 10 + (i % 5) + 1;
    };
    const nums = (ct.match(/\d+/g) ?? []).map(Number);
    const out = nums.map((n, i) => {
      const v = n - num(kw[i % kw.length]);
      const r = Math.floor(v / 10) - 1;
      const c = (v % 10) - 1;
      return sq[r * 5 + c] ?? '';
    }).join('');
    return {
      output: out,
      steps: [
        step('Rebuild the square', 'Same keyword.', renderSquare(sq, 5, '12345', '12345')),
        step('Subtract the additive key', `"${kw}" repeating.`, nums.slice(0, 8).join(' ')),
        step('Split each result into coordinates', 'Tens digit is the row, units digit is the column.', out),
      ],
    };
  },
};

/* -------------------------- Straddling checkerboard ----------------------- */

const straddling: Technique = {
  id: 'straddling-checkerboard',
  name: 'Straddling checkerboard',
  family: 'fractionation',
  difficulty: 4,
  era: 'Early 20th century',
  summary: 'Common letters become one digit, rarer letters become two — a hand-worked variable-length code.',
  theory:
    'Eight frequent letters sit in the top row and cost a single digit. The two unused digits act as ' +
    'gateways into the second and third rows, where the remaining letters cost two digits each. The result ' +
    'compresses the message and, more importantly, destroys the fixed character boundary — an interceptor ' +
    'cannot tell where one letter ends and the next begins without the board. Soviet intelligence built ' +
    'the VIC cipher on top of this, and the combination held up against the FBI for years.',
  keySpec: [
    { name: 'keyword', kind: 'word', minLen: 5, maxLen: 8, label: 'Board keyword' },
    { name: 'g1', kind: 'int', min: 0, max: 4, label: 'First gateway digit' },
    { name: 'g2', kind: 'int', min: 5, max: 9, label: 'Second gateway digit' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const { map, board } = buildBoard(key);
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => map[c] ?? '').join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Lay out the board', 'Eight letters on the top row cost one digit; the rest cost two.', board),
        step('Encode each letter', 'Frequent letters are cheap, rare letters are not.',
          t.slice(0, 8).split('').map((c) => `${c} → ${map[c]}`).join('\n')),
        step('Result', 'A digit stream with no visible letter boundaries.', out),
      ],
    };
  },
  decode(ct, key) {
    const { rev, g1, g2, board } = buildBoard(key);
    const digits = ct.replace(/[^0-9]/g, '');
    let out = '';
    let i = 0;
    while (i < digits.length) {
      const d = digits[i];
      if (d === String(g1) || d === String(g2)) {
        out += rev[digits.slice(i, i + 2)] ?? '';
        i += 2;
      } else {
        out += rev[d] ?? '';
        i += 1;
      }
    }
    return {
      output: out,
      steps: [
        step('Rebuild the board', 'The keyword and the two gateway digits define it completely.', board),
        step('Read left to right', `A ${g1} or a ${g2} means take the next digit as well; anything else stands alone.`, digits.slice(0, 40)),
        step('Read the plaintext', 'The message.', out),
      ],
    };
  },
};

function buildBoard(key: import('./types').Key) {
  const chars = keyedAlphabet(lettersOnly(ks(key, 'keyword', 'CIPHER')), A) + './';
  const g1 = kn(key, 'g1', 2);
  const g2 = kn(key, 'g2', 6);
  const map: Record<string, string> = {};
  const rev: Record<string, string> = {};
  let idx = 0;
  const topRow: string[] = new Array(10).fill(' ');
  for (let d = 0; d < 10; d++) {
    if (d === g1 || d === g2) continue;
    const ch = chars[idx++];
    map[ch] = String(d);
    rev[String(d)] = ch;
    topRow[d] = ch;
  }
  const row1: string[] = [], row2: string[] = [];
  for (let d = 0; d < 10; d++) {
    const ch = chars[idx++];
    map[ch] = `${g1}${d}`;
    rev[`${g1}${d}`] = ch;
    row1.push(ch);
  }
  for (let d = 0; d < 10; d++) {
    const ch = chars[idx++];
    map[ch] = `${g2}${d}`;
    rev[`${g2}${d}`] = ch;
    row2.push(ch);
  }
  const board =
    `     0 1 2 3 4 5 6 7 8 9\n` +
    `     ${topRow.join(' ')}\n` +
    `${g1} |  ${row1.join(' ')}\n` +
    `${g2} |  ${row2.join(' ')}`;
  return { map, rev, g1, g2, board };
}

export const FRACTIONATION: Technique[] = [
  bifid,
  trifid,
  adfgvx('adfgx', 'ADFGX cipher', 'ADFGX', SQ25, 4),
  adfgvx('adfgvx', 'ADFGVX cipher', 'ADFGVX', A + '0123456789', 5),
  nihilist,
  straddling,
];
