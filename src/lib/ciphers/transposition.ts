import type { Technique, Key } from './types';
import { lettersOnly, columnOrder, chunk, grouped, step, ks, kn, mod } from './utils';

/** Render a grid with its key row on top, for the worked-solution panel. */
function renderGrid(rows: string[][], keyword?: string, order?: number[]): string {
  const lines: string[] = [];
  if (keyword && order) {
    lines.push('key  ' + keyword.split('').join(' '));
    lines.push('rank ' + order.map((r) => r + 1).join(' ').replace(/(\d\d)/g, '$1'));
  }
  rows.forEach((r) => lines.push('     ' + r.map((c) => c || '·').join(' ')));
  return lines.join('\n');
}

/* ------------------------------- rail fence ------------------------------- */

/** Zigzag row index for each position across `rails` rails. */
function zigzagPattern(len: number, rails: number): number[] {
  if (rails < 2) return new Array(len).fill(0);
  const pattern: number[] = [];
  let rail = 0;
  let dir = 1;
  for (let i = 0; i < len; i++) {
    pattern.push(rail);
    if (rail === 0) dir = 1;
    else if (rail === rails - 1) dir = -1;
    rail += dir;
  }
  return pattern;
}

const railFence: Technique = {
  id: 'rail-fence',
  name: 'Rail fence',
  family: 'transposition',
  difficulty: 1,
  era: 'American Civil War era',
  summary: 'Letters are written in a zigzag across several lines, then read line by line.',
  theory:
    'Write the message diagonally down and up across a fixed number of rails, then read each rail left ' +
    'to right. Nothing is substituted — the letters are the same, only their order changes, so the letter ' +
    'frequencies are untouched and give the game away immediately. With only a handful of plausible rail ' +
    'counts, exhaustive search settles it at once.',
  keySpec: [{ name: 'rails', kind: 'int', min: 2, max: 7, label: 'Number of rails' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const rails = Math.max(2, kn(key, 'rails', 3));
    const t = lettersOnly(pt);
    const pattern = zigzagPattern(t.length, rails);
    const buckets: string[] = new Array(rails).fill('');
    t.split('').forEach((c, i) => { buckets[pattern[i]] += c; });
    const out = buckets.join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Write the zigzag', `Descend to rail ${rails}, bounce back to rail 1, and repeat.`,
          buckets.map((b, i) => `rail ${i + 1}: ${b}`).join('\n')),
        step('Read the rails in order', 'Top rail first, then the next, and so on.', out),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const rails = Math.max(2, kn(key, 'rails', 3));
    const t = lettersOnly(ct);
    const pattern = zigzagPattern(t.length, rails);
    const counts = new Array(rails).fill(0);
    pattern.forEach((r) => counts[r]++);
    const slices: string[] = [];
    let pos = 0;
    for (let r = 0; r < rails; r++) { slices.push(t.slice(pos, pos + counts[r])); pos += counts[r]; }
    const cursors = new Array(rails).fill(0);
    const out = pattern.map((r) => slices[r][cursors[r]++]).join('');
    return {
      output: out,
      steps: [
        step('Work out the rail lengths', 'The zigzag pattern depends only on the length and the rail count.',
          counts.map((c, i) => `rail ${i + 1}: ${c} letters`).join('\n')),
        step('Cut the ciphertext into rails', 'Each rail takes its share, in order.',
          slices.map((s, i) => `rail ${i + 1}: ${s}`).join('\n')),
        step('Walk the zigzag again', 'Read one letter from the appropriate rail at each step.', out),
      ],
    };
  },
};

const redefence: Technique = {
  id: 'redefence',
  name: 'Redefence',
  family: 'transposition',
  difficulty: 3,
  era: 'American Cryptogram Association',
  summary: 'A rail fence whose rails are read out in a keyed order rather than top to bottom.',
  theory:
    'The zigzag is identical to a rail fence, but a keyword decides the order in which the rails are ' +
    'transmitted. That removes the giveaway that the first rail always begins with the first letter of ' +
    'the message, and adds a permutation of the rails to the key space.',
  keySpec: [
    { name: 'rails', kind: 'int', min: 3, max: 7, label: 'Number of rails' },
    { name: 'keyword', kind: 'word', minLen: 3, maxLen: 7, label: 'Rail order keyword' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const rails = Math.max(3, kn(key, 'rails', 4));
    const kw = lettersOnly(ks(key, 'keyword', 'KEY')).slice(0, rails).padEnd(rails, 'Z');
    const order = columnOrder(kw);
    const t = lettersOnly(pt);
    const pattern = zigzagPattern(t.length, rails);
    const buckets: string[] = new Array(rails).fill('');
    t.split('').forEach((c, i) => { buckets[pattern[i]] += c; });
    const seq = order.map((rank, railIdx) => ({ rank, railIdx })).sort((a, b) => a.rank - b.rank);
    const out = seq.map((s) => buckets[s.railIdx]).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Write the zigzag', `Across ${rails} rails.`, buckets.map((b, i) => `rail ${i + 1}: ${b}`).join('\n')),
        step('Rank the keyword', `"${kw}" gives the transmission order of the rails.`,
          kw.split('').map((c, i) => `${c} → rank ${order[i] + 1} (rail ${i + 1})`).join('\n')),
        step('Read in that order', 'Rails are sent in keyword order, not top to bottom.', out),
      ],
    };
  },
  decode(ct, key) {
    const rails = Math.max(3, kn(key, 'rails', 4));
    const kw = lettersOnly(ks(key, 'keyword', 'KEY')).slice(0, rails).padEnd(rails, 'Z');
    const order = columnOrder(kw);
    const t = lettersOnly(ct);
    const pattern = zigzagPattern(t.length, rails);
    const counts = new Array(rails).fill(0);
    pattern.forEach((r) => counts[r]++);
    const seq = order.map((rank, railIdx) => ({ rank, railIdx })).sort((a, b) => a.rank - b.rank);
    const buckets: string[] = new Array(rails).fill('');
    let pos = 0;
    for (const s of seq) { buckets[s.railIdx] = t.slice(pos, pos + counts[s.railIdx]); pos += counts[s.railIdx]; }
    const cursors = new Array(rails).fill(0);
    const out = pattern.map((r) => buckets[r][cursors[r]++]).join('');
    return {
      output: out,
      steps: [
        step('Rank the keyword', `"${kw}" recovers which block belongs to which rail.`,
          kw.split('').map((c, i) => `${c} → rank ${order[i] + 1} (rail ${i + 1})`).join('\n')),
        step('Restore each rail', 'Rail lengths follow from the zigzag geometry.',
          buckets.map((b, i) => `rail ${i + 1}: ${b}`).join('\n')),
        step('Walk the zigzag', 'Read the message back off the fence.', out),
      ],
    };
  },
};

/* ---------------------------- columnar family ---------------------------- */

export function columnarEncode(text: string, keyword: string): { out: string; grid: string[][]; order: number[] } {
  const cols = keyword.length;
  const rows = Math.ceil(text.length / cols);
  const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(''));
  text.split('').forEach((c, i) => { grid[Math.floor(i / cols)][i % cols] = c; });
  const order = columnOrder(keyword);
  const seq = order.map((rank, col) => ({ rank, col })).sort((a, b) => a.rank - b.rank);
  let out = '';
  for (const s of seq) for (let r = 0; r < rows; r++) if (grid[r][s.col]) out += grid[r][s.col];
  return { out, grid, order };
}

export function columnarDecode(text: string, keyword: string): { out: string; grid: string[][]; order: number[] } {
  const cols = keyword.length;
  const n = text.length;
  const rows = Math.ceil(n / cols);
  const full = n % cols === 0 ? cols : n % cols; // columns 0..full-1 have `rows` cells
  const order = columnOrder(keyword);
  const seq = order.map((rank, col) => ({ rank, col })).sort((a, b) => a.rank - b.rank);
  const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(''));
  let pos = 0;
  for (const s of seq) {
    const height = s.col < full ? rows : rows - 1;
    for (let r = 0; r < height; r++) grid[r][s.col] = text[pos++] ?? '';
  }
  let out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c]) out += grid[r][c];
  return { out, grid, order };
}

const columnar: Technique = {
  id: 'columnar',
  name: 'Columnar transposition',
  family: 'transposition',
  difficulty: 3,
  era: '19th century',
  summary: 'The message fills a grid row by row and leaves it column by column, in keyword order.',
  theory:
    'Write the message across a grid whose width is the keyword length. Rank the keyword letters ' +
    'alphabetically, then read the columns out in that ranking. Because the final row is usually ' +
    'incomplete, the columns have unequal heights, and working out which columns are short is the first ' +
    'task facing a cryptanalyst. This was the workhorse field cipher of both world wars — simple enough ' +
    'to do with pencil and paper under pressure, and genuinely troublesome when the key was long.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 5, maxLen: 9, label: 'Keyword' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const t = lettersOnly(pt);
    const { out, grid, order } = columnarEncode(t, kw);
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Rank the keyword', 'Alphabetical order; ties break left to right.',
          kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('Fill the grid row by row', `Width ${kw.length}. The last row is usually short.`, renderGrid(grid, kw, order)),
        step('Read the columns in rank order', 'Column ranked 1 first, then 2, and so on.', out),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const t = lettersOnly(ct);
    const { out, grid, order } = columnarDecode(t, kw);
    return {
      output: out,
      steps: [
        step('Rank the keyword', 'Same ranking the sender used.',
          kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('Work out the column heights', 'Divide the length by the width; the remainder tells you which columns carry an extra letter.',
          `${t.length} letters over ${kw.length} columns → ${Math.floor(t.length / kw.length)} full rows, ${t.length % kw.length} long columns.`),
        step('Refill the grid column by column', 'Pour the ciphertext back in, rank order first.', renderGrid(grid, kw, order)),
        step('Read across the rows', 'The message.', out),
      ],
    };
  },
};

const doubleColumnar: Technique = {
  id: 'double-columnar',
  name: 'Double columnar transposition',
  family: 'transposition',
  difficulty: 4,
  era: 'WWI-WWII',
  summary: 'A columnar transposition applied twice, with two different keywords.',
  theory:
    'Running the transposition a second time with a different key scatters the adjacencies that survive ' +
    'a single pass, and it defeats the anagramming attacks that break single columnar work. The German ' +
    'army used it as Doppelwürfel and the Allies rated it hard enough to be worth serious effort. Its ' +
    'reputation was justified: correctly used, with unrelated keys of different lengths, it stayed ' +
    'unbroken in the field for a long time.',
  keySpec: [
    { name: 'key1', kind: 'word', minLen: 5, maxLen: 8, label: 'First keyword' },
    { name: 'key2', kind: 'word', minLen: 6, maxLen: 9, label: 'Second keyword' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const k1 = lettersOnly(ks(key, 'key1', 'CIPHER'));
    const k2 = lettersOnly(ks(key, 'key2', 'HARBOUR'));
    const t = lettersOnly(pt);
    const first = columnarEncode(t, k1);
    const second = columnarEncode(first.out, k2);
    return {
      output: grouped(second.out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('First transposition', `Keyword "${k1}".`, renderGrid(first.grid, k1, first.order)),
        step('Intermediate result', 'This is what enters the second pass.', first.out),
        step('Second transposition', `Keyword "${k2}", applied to that intermediate text.`, renderGrid(second.grid, k2, second.order)),
        step('Result', 'Two passes with unrelated keys.', grouped(second.out)),
      ],
    };
  },
  decode(ct, key) {
    const k1 = lettersOnly(ks(key, 'key1', 'CIPHER'));
    const k2 = lettersOnly(ks(key, 'key2', 'HARBOUR'));
    const t = lettersOnly(ct);
    const undoSecond = columnarDecode(t, k2);
    const undoFirst = columnarDecode(undoSecond.out, k1);
    return {
      output: undoFirst.out,
      steps: [
        step('Undo the second pass first', `Keyword "${k2}".`, renderGrid(undoSecond.grid, k2, undoSecond.order)),
        step('Recover the intermediate text', 'This is what the first pass produced.', undoSecond.out),
        step('Undo the first pass', `Keyword "${k1}".`, renderGrid(undoFirst.grid, k1, undoFirst.order)),
        step('Read the plaintext', 'The message.', undoFirst.out),
      ],
    };
  },
};

/** Myszkowski ranks repeated key letters equally, so tied columns interleave. */
function myszkowskiRanks(keyword: string): number[] {
  const distinct = Array.from(new Set(keyword.split(''))).sort();
  return keyword.split('').map((c) => distinct.indexOf(c));
}

const myszkowski: Technique = {
  id: 'myszkowski',
  name: 'Myszkowski transposition',
  family: 'transposition',
  difficulty: 4,
  era: '1902',
  summary: 'A columnar cipher where repeated key letters share a rank and their columns interleave.',
  theory:
    'Émile Myszkowski proposed using a keyword with deliberate repeats. Columns headed by the same letter ' +
    'get the same rank, and instead of being read one after the other they are read together, left to ' +
    'right across each row. That interleaving breaks the clean column blocks a standard columnar cipher ' +
    'produces, which is exactly what makes the usual column-matching attacks harder to apply.',
  keySpec: [{ name: 'keyword', kind: 'choice', options: ['TOMATO', 'BANANA', 'ASSESS', 'PEPPER', 'COCOON', 'SUCCESS'], label: 'Keyword with repeats' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'TOMATO'));
    const cols = kw.length;
    const t = lettersOnly(pt);
    const rows = Math.ceil(t.length / cols);
    const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(''));
    t.split('').forEach((c, i) => { grid[Math.floor(i / cols)][i % cols] = c; });
    const ranks = myszkowskiRanks(kw);
    const maxRank = Math.max(...ranks);
    let out = '';
    for (let r = 0; r <= maxRank; r++) {
      const group = ranks.map((rk, c) => ({ rk, c })).filter((x) => x.rk === r).map((x) => x.c);
      if (group.length === 1) {
        for (let row = 0; row < rows; row++) if (grid[row][group[0]]) out += grid[row][group[0]];
      } else {
        for (let row = 0; row < rows; row++) for (const c of group) if (grid[row][c]) out += grid[row][c];
      }
    }
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Rank with ties', `"${kw}" — identical letters share a rank instead of breaking left to right.`,
          kw.split('').map((c, i) => `${c} → rank ${ranks[i] + 1}`).join('\n')),
        step('Fill the grid', `Width ${cols}, row by row.`, renderGrid(grid, kw, ranks)),
        step('Read rank by rank', 'A lone column is read straight down. Tied columns are read together, left to right across each row.', out),
        step('Result', 'Grouped in fives.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'TOMATO'));
    const cols = kw.length;
    const t = lettersOnly(ct);
    const n = t.length;
    const rows = Math.ceil(n / cols);
    const filled = (r: number, c: number) => r * cols + c < n;
    const ranks = myszkowskiRanks(kw);
    const maxRank = Math.max(...ranks);
    const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(''));
    let pos = 0;
    for (let r = 0; r <= maxRank; r++) {
      const group = ranks.map((rk, c) => ({ rk, c })).filter((x) => x.rk === r).map((x) => x.c);
      if (group.length === 1) {
        for (let row = 0; row < rows; row++) if (filled(row, group[0])) grid[row][group[0]] = t[pos++];
      } else {
        for (let row = 0; row < rows; row++) for (const c of group) if (filled(row, c)) grid[row][c] = t[pos++];
      }
    }
    let out = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (filled(r, c)) out += grid[r][c];
    return {
      output: out,
      steps: [
        step('Rank with ties', `From "${kw}".`, kw.split('').map((c, i) => `${c} → rank ${ranks[i] + 1}`).join('\n')),
        step('Mark which cells exist', 'The final row is short, so some cells are empty.',
          `${n} letters over ${cols} columns → ${rows} rows, last row holds ${n - (rows - 1) * cols}.`),
        step('Pour the ciphertext back', 'Rank by rank, interleaving the tied columns exactly as the sender did.', renderGrid(grid, kw, ranks)),
        step('Read across the rows', 'The message.', out),
      ],
    };
  },
};

const scytale: Technique = {
  id: 'scytale',
  name: 'Scytale',
  family: 'transposition',
  difficulty: 1,
  era: 'c. 7th century BC',
  summary: 'A strip wound round a rod: reading along the rod scrambles the order.',
  theory:
    'Spartan commanders wrapped a leather strip around a wooden staff and wrote across the turns. ' +
    'Unwound, the letters were out of order; rewound on a rod of matching thickness, the message ' +
    'reappeared. The rod diameter is the entire key. It is the oldest military cipher device on record, ' +
    'and mathematically it is just a columnar transposition with the columns taken in their natural order.',
  keySpec: [{ name: 'turns', kind: 'int', min: 3, max: 8, label: 'Letters per turn' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const c = Math.max(2, kn(key, 'turns', 4));
    const t = lettersOnly(pt);
    const rows = Math.ceil(t.length / c);
    let out = '';
    for (let col = 0; col < c; col++) for (let r = 0; r < rows; r++) { const i = r * c + col; if (i < t.length) out += t[i]; }
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Wind the strip', `${c} letters fit around one turn of the rod.`,
          chunk(t, c).map((row, i) => `turn ${i + 1}: ${row.split('').join(' ')}`).join('\n')),
        step('Read along the rod', 'Take every letter in the same position on each turn.', out),
        step('Result', 'Off the rod, the order looks arbitrary.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const c = Math.max(2, kn(key, 'turns', 4));
    const t = lettersOnly(ct);
    const n = t.length;
    const rows = Math.ceil(n / c);
    const full = n % c === 0 ? c : n % c;
    const grid: string[] = new Array(n);
    let pos = 0;
    for (let col = 0; col < c; col++) {
      const height = col < full ? rows : rows - 1;
      for (let r = 0; r < height; r++) grid[r * c + col] = t[pos++];
    }
    const out = grid.join('');
    return {
      output: out,
      steps: [
        step('Match the rod', `A rod taking ${c} letters per turn is the key.`, ''),
        step('Rewind the strip', 'Letters fall back into their original rows.',
          chunk(out, c).map((row, i) => `turn ${i + 1}: ${row.split('').join(' ')}`).join('\n')),
        step('Read across', 'The message.', out),
      ],
    };
  },
};

const routeSpiral: Technique = {
  id: 'route-spiral',
  name: 'Route cipher (spiral)',
  family: 'transposition',
  difficulty: 3,
  era: 'American Civil War',
  summary: 'Fill a rectangle row by row, then read it out along a spiral path.',
  theory:
    'The Union army used route ciphers heavily: the message went into a grid and came out along an ' +
    'agreed path — spirals, snakes, diagonals. The route is the key. A spiral inward from the top-left ' +
    'corner is used here. Route ciphers are weak on their own, because a cryptanalyst who guesses the ' +
    'grid dimensions can try the small number of sensible routes by hand.',
  keySpec: [{ name: 'cols', kind: 'int', min: 4, max: 8, label: 'Grid width' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const cols = Math.max(3, kn(key, 'cols', 5));
    const t = lettersOnly(pt);
    const rows = Math.ceil(t.length / cols);
    const grid: string[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => t[r * cols + c] ?? ''));
    const path = spiralOrder(rows, cols);
    const out = path.map(([r, c]) => grid[r][c]).filter(Boolean).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Fill the rectangle', `Width ${cols}, row by row.`, renderGrid(grid)),
        step('Trace the spiral', 'Start top-left, go right across the top, down the right side, back along the bottom, up the left, then inward.',
          path.slice(0, 12).map(([r, c]) => `(${r + 1},${c + 1})`).join(' → ')),
        step('Read along the path', 'Empty cells in the short final row are skipped.', out),
      ],
    };
  },
  decode(ct, key) {
    const cols = Math.max(3, kn(key, 'cols', 5));
    const t = lettersOnly(ct);
    const n = t.length;
    const rows = Math.ceil(n / cols);
    const exists = (r: number, c: number) => r * cols + c < n;
    const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(''));
    const path = spiralOrder(rows, cols).filter(([r, c]) => exists(r, c));
    path.forEach(([r, c], i) => { grid[r][c] = t[i]; });
    let out = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (exists(r, c)) out += grid[r][c];
    return {
      output: out,
      steps: [
        step('Rebuild the rectangle', `Width ${cols}, ${rows} rows, last row partly empty.`, ''),
        step('Walk the spiral again', 'Drop the ciphertext letters back along the same path.', renderGrid(grid)),
        step('Read across the rows', 'The message.', out),
      ],
    };
  },
};

function spiralOrder(rows: number, cols: number): [number, number][] {
  const out: [number, number][] = [];
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push([top, c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push([r, right]);
    right--;
    if (top <= bottom) { for (let c = right; c >= left; c--) out.push([bottom, c]); bottom--; }
    if (left <= right) { for (let r = bottom; r >= top; r--) out.push([r, left]); left++; }
  }
  return out;
}

const reverseCipher: Technique = {
  id: 'reverse',
  name: 'Reverse writing',
  family: 'transposition',
  difficulty: 1,
  era: 'Antiquity',
  summary: 'The message is simply written backwards.',
  theory:
    'The whole text is reversed end to end. Leonardo da Vinci wrote his notebooks this way, mirrored so ' +
    'they read normally when held to a looking glass. It conceals nothing from anyone who thinks to try ' +
    'it, but it appears constantly as one layer inside a larger puzzle, which is why it is worth recognising ' +
    'on sight.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').reverse().join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Reverse it', 'Last letter first.', out),
      ],
    };
  },
  decode(ct) {
    const t = lettersOnly(ct);
    const out = t.split('').reverse().join('');
    return { output: out, steps: [step('Reverse it again', 'The operation undoes itself.', out)] };
  },
};

const blockRotation: Technique = {
  id: 'block-rotation',
  name: 'Block rotation',
  family: 'transposition',
  difficulty: 2,
  era: 'Modern puzzle convention',
  summary: 'The text is cut into fixed blocks and each block is rotated by the same amount.',
  theory:
    'Split the message into blocks of a fixed size and rotate the letters within each block. Because the ' +
    'permutation is identical in every block, spotting the block boundary is the whole attack — a short ' +
    'crib is usually enough. It appears mostly as an inner layer in composite puzzles.',
  keySpec: [
    { name: 'size', kind: 'int', min: 3, max: 8, label: 'Block size' },
    { name: 'shift', kind: 'int', min: 1, max: 5, label: 'Rotation within block' },
  ],
  normalise: lettersOnly,
  encode(pt, key) {
    const size = Math.max(2, kn(key, 'size', 4));
    const s = kn(key, 'shift', 1);
    const t = lettersOnly(pt);
    const out = chunk(t, size).map((b) => {
      const k = mod(s, b.length || 1);
      return b.slice(k) + b.slice(0, k);
    }).join('');
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Cut into blocks', `Blocks of ${size}. The final block may be short.`, chunk(t, size).join(' ')),
        step('Rotate each block', `Move the first ${s} letters of each block to its end.`, chunk(out, size).join(' ')),
        step('Result', 'Rejoined.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const size = Math.max(2, kn(key, 'size', 4));
    const s = kn(key, 'shift', 1);
    const t = lettersOnly(ct);
    const out = chunk(t, size).map((b) => {
      const k = mod(s, b.length || 1);
      const back = mod(b.length - k, b.length || 1);
      return b.slice(back) + b.slice(0, back);
    }).join('');
    return {
      output: out,
      steps: [
        step('Cut into the same blocks', `Blocks of ${size}.`, chunk(t, size).join(' ')),
        step('Rotate back', 'The opposite direction restores each block.', out),
      ],
    };
  },
};

/* --------------------------------- AMSCO --------------------------------- */

/**
 * AMSCO alternates one and two letters per cell across a columnar grid, with
 * the pattern offset on each row. Cell sizes depend only on the geometry and
 * the message length, so both directions can reconstruct them identically.
 */
function amscoCells(n: number, cols: number): number[][] {
  const cells: number[][] = [];
  let pos = 0;
  let r = 0;
  while (pos < n) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const want = (r + c) % 2 === 0 ? 1 : 2;
      const take = Math.max(0, Math.min(want, n - pos));
      row.push(take);
      pos += take;
    }
    cells.push(row);
    r++;
  }
  return cells;
}

const amsco: Technique = {
  id: 'amsco',
  name: 'AMSCO cipher',
  family: 'transposition',
  difficulty: 4,
  era: 'American Cryptogram Association',
  summary: 'A columnar grid whose cells hold one or two letters in an alternating pattern.',
  theory:
    'Instead of one letter per cell, AMSCO alternates single letters and pairs, and the pattern shifts on ' +
    'every row. Columns therefore hold different numbers of letters even when the grid is full, which ' +
    'destroys the neat column lengths that make ordinary columnar transposition tractable. The attacker ' +
    'has to solve the cell pattern and the key permutation at the same time.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 4, maxLen: 7, label: 'Keyword' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const cols = kw.length;
    const t = lettersOnly(pt);
    const sizes = amscoCells(t.length, cols);
    const grid: string[][] = [];
    let pos = 0;
    for (const row of sizes) {
      const gr: string[] = [];
      for (const size of row) { gr.push(t.slice(pos, pos + size)); pos += size; }
      grid.push(gr);
    }
    const order = columnOrder(kw);
    const seq = order.map((rank, col) => ({ rank, col })).sort((a, b) => a.rank - b.rank);
    let out = '';
    for (const s of seq) for (const row of grid) out += row[s.col] ?? '';
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Alternate one and two', 'Row 1 takes 1, 2, 1, 2 …; row 2 starts with 2 and alternates the other way.',
          grid.map((r, i) => `row ${i + 1}: ${r.map((c) => c || '·').join(' | ')}`).join('\n')),
        step('Rank the keyword', `"${kw}".`, kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('Read the columns in rank order', 'Whole cells travel together, so pairs stay glued.', out),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const cols = kw.length;
    const t = lettersOnly(ct);
    const sizes = amscoCells(t.length, cols);
    const order = columnOrder(kw);
    const seq = order.map((rank, col) => ({ rank, col })).sort((a, b) => a.rank - b.rank);
    const grid: string[][] = sizes.map((row) => new Array(cols).fill(''));
    let pos = 0;
    for (const s of seq) {
      for (let r = 0; r < sizes.length; r++) {
        const size = sizes[r][s.col];
        grid[r][s.col] = t.slice(pos, pos + size);
        pos += size;
      }
    }
    let out = '';
    for (const row of grid) out += row.join('');
    return {
      output: out,
      steps: [
        step('Rebuild the cell pattern', 'It depends only on the width and the message length, both of which you have.',
          sizes.map((r, i) => `row ${i + 1}: ${r.join(' ')}`).join('\n')),
        step('Rank the keyword', `"${kw}".`, kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('Pour the ciphertext into the columns', 'Each column absorbs exactly as many letters as its cells demand.',
          grid.map((r, i) => `row ${i + 1}: ${r.map((c) => c || '·').join(' | ')}`).join('\n')),
        step('Read across the rows', 'The message.', out),
      ],
    };
  },
};

/**
 * Disrupted columnar transposition. Each row leaves a leading gap on the first
 * pass and that gap is filled on the second, which breaks up the regular
 * diagonal structure a plain columnar grid leaves behind. The gap width comes
 * from the key ranks, so both directions derive it identically.
 */
function disruptedFillOrder(rows: number, cols: number, order: number[]): [number, number][] {
  const pass1: [number, number][] = [];
  const pass2: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    const gap = order[r % cols] % cols;
    for (let c = gap; c < cols; c++) pass1.push([r, c]);
    for (let c = 0; c < gap; c++) pass2.push([r, c]);
  }
  return pass1.concat(pass2);
}

const disrupted: Technique = {
  id: 'disrupted-columnar',
  name: 'Disrupted columnar transposition',
  family: 'transposition',
  difficulty: 5,
  era: 'WWII',
  summary: 'A columnar grid filled in two passes, leaving and then closing a staggered gap on each row.',
  theory:
    'A plain columnar grid preserves diagonal relationships that anagramming attacks exploit. Disruption ' +
    'removes them: on the first pass each row is filled only from a starting point determined by the key, ' +
    'and the skipped cells are filled on a second pass. Nothing about the letters changes, but the ' +
    'positional regularity an attacker leans on is gone. Variants of this were standard in wartime ' +
    'hand-cipher systems where a machine was unavailable.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 5, maxLen: 8, label: 'Keyword' }],
  normalise: lettersOnly,
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const cols = kw.length;
    const t = lettersOnly(pt);
    const rows = Math.ceil(t.length / cols);
    const order = columnOrder(kw);
    const fill = disruptedFillOrder(rows, cols, order).slice(0, t.length);
    const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(''));
    fill.forEach(([r, c], i) => { grid[r][c] = t[i]; });
    const seq = order.map((rank, col) => ({ rank, col })).sort((a, b) => a.rank - b.rank);
    let out = '';
    for (const s of seq) for (let r = 0; r < rows; r++) if (grid[r][s.col]) out += grid[r][s.col];
    return {
      output: grouped(out),
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Rank the keyword', `"${kw}" sets both the gaps and the read-out order.`,
          kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('First pass leaves a gap', 'Each row starts at an offset taken from the key ranks.',
          `row offsets: ${Array.from({ length: Math.min(rows, 8) }, (_, r) => order[r % cols] % cols).join(', ')}`),
        step('Second pass closes it', 'The skipped cells are filled once the first pass runs out.', renderGrid(grid, kw, order)),
        step('Read the columns in rank order', 'As with ordinary columnar work.', out),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const cols = kw.length;
    const t = lettersOnly(ct);
    const n = t.length;
    const rows = Math.ceil(n / cols);
    const order = columnOrder(kw);
    const fill = disruptedFillOrder(rows, cols, order).slice(0, n);
    const occupied = new Set(fill.map(([r, c]) => r * cols + c));
    const seq = order.map((rank, col) => ({ rank, col })).sort((a, b) => a.rank - b.rank);
    const grid: string[][] = Array.from({ length: rows }, () => new Array(cols).fill(''));
    let pos = 0;
    for (const s of seq) {
      for (let r = 0; r < rows; r++) {
        if (occupied.has(r * cols + s.col)) grid[r][s.col] = t[pos++];
      }
    }
    const out = fill.map(([r, c]) => grid[r][c]).join('');
    return {
      output: out,
      steps: [
        step('Rank the keyword', `"${kw}".`, kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('Reconstruct which cells are occupied', 'The gap pattern follows from the key and the length, so it can be rebuilt exactly.',
          renderGrid(grid, kw, order)),
        step('Refill the columns in rank order', 'Only occupied cells take a letter.', ''),
        step('Read back along the two passes', 'First pass first, then the cells that were skipped.', out),
      ],
    };
  },
};

export const TRANSPOSITION: Technique[] = [
  railFence, redefence, columnar, doubleColumnar, myszkowski, scytale,
  routeSpiral, reverseCipher, blockRotation, amsco, disrupted,
];
