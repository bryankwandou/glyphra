import type { Technique } from './types';
import {
  A, lettersOnly, chunk, grouped, columnOrder, toBytes, fromBytes,
  bytesToHex, hexToBytes, step, ks, kn,
} from './utils';

const ascii = (s: string) => s.replace(/[^\x20-\x7e]/g, '');

/* ============================== substitution ============================== */

/**
 * Distinct glyphs, one per letter — the historical figures are pictorial.
 * These live outside the Basic Multilingual Plane, so every access goes through
 * `Array.from`; indexing the string directly would land on half a surrogate pair.
 */
const DANCING_GLYPHS = Array.from('𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫');

const dancingMen: Technique = {
  id: 'dancing-men',
  name: 'Dancing Men cipher',
  family: 'substitution',
  difficulty: 2,
  era: '1903 (fictional)',
  summary: 'Each letter is drawn as a small stick figure in a distinct pose.',
  theory:
    'Conan Doyle invented this for "The Adventure of the Dancing Men", where Holmes breaks it by noting ' +
    'that the most frequent figure must be E and working outward from there — a clean fictional ' +
    'demonstration of frequency analysis. A figure holding a flag marks the end of a word. Structurally it ' +
    'is an ordinary monoalphabetic substitution; the pictorial disguise adds nothing but novelty. Distinct ' +
    'glyphs stand in for the drawings here so the mapping survives as text.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const out = t.split('').map((c) => DANCING_GLYPHS[A.indexOf(c)]).join('');
    return {
      output: out,
      steps: [
        step('Prepare the text', 'Letters only.', t),
        step('Draw each figure', 'One pose per letter, twenty-six in all.', `${A}\n${DANCING_GLYPHS.join('')}`),
        step('Result', 'Frequency analysis breaks it exactly as it breaks any substitution.', out),
      ],
    };
  },
  decode(ct) {
    const out = Array.from(ct).map((c) => {
      const i = DANCING_GLYPHS.indexOf(c);
      return i === -1 ? '' : A[i];
    }).join('');
    return {
      output: out,
      steps: [
        step('Count the figures', 'The most common one is almost certainly E.', ''),
        step('Read off the mapping', 'Pose back to letter.', out),
      ],
    };
  },
};

/* ============================== transposition ============================= */

/** Rotate a 4×4 coordinate 90° clockwise. */
function rot4(r: number, c: number): [number, number] {
  return [c, 3 - r];
}

function grilleHoles(key: import('./types').Key): [number, number][] {
  // Four rotation orbits partition the 4×4 grid; one cell is opened per orbit.
  const orbits: [number, number][][] = [];
  const seen = new Set<number>();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (seen.has(r * 4 + c)) continue;
      const orbit: [number, number][] = [];
      let [rr, cc] = [r, c];
      for (let i = 0; i < 4; i++) {
        orbit.push([rr, cc]);
        seen.add(rr * 4 + cc);
        [rr, cc] = rot4(rr, cc);
      }
      orbits.push(orbit);
    }
  }
  const picks = String(kn(key, 'pattern', 1234)).padStart(4, '1').slice(0, 4);
  return orbits.map((orbit, i) => orbit[Number(picks[i]) % 4]);
}

const turningGrille: Technique = {
  id: 'turning-grille',
  name: 'Turning grille',
  family: 'transposition',
  difficulty: 4,
  era: '1880s, used 1916-1917',
  summary: 'A card with holes is laid over a grid, filled, then rotated a quarter turn and filled again.',
  theory:
    'Cut holes in a square card so that four quarter-turns expose every cell exactly once. Write through ' +
    'the holes, turn the card, write again, and after four turns the grid is full; then read it off ' +
    'normally. Fleissner designed the version the German army adopted in 1916 under the codename ' +
    'ANNA — it lasted about four months before French cryptanalysts broke it. The grille itself is the key, ' +
    'and it is physical, which is both its practical charm and its operational weakness.',
  keySpec: [{ name: 'pattern', kind: 'int', min: 1111, max: 4444, label: 'Hole pattern (four digits 1-4)' }],
  normalise: (s) => {
    const t = lettersOnly(s);
    const pad = (16 - (t.length % 16)) % 16;
    return t + 'X'.repeat(pad);
  },
  encode(pt, key) {
    const holes = grilleHoles(key);
    const t = this.normalise(pt);
    let out = '';
    const gridsShown: string[] = [];
    for (const block of chunk(t, 16)) {
      const grid: string[][] = Array.from({ length: 4 }, () => new Array(4).fill(''));
      let pos = 0;
      for (let rot = 0; rot < 4; rot++) {
        const open = holes.map(([r, c]) => {
          let [rr, cc] = [r, c];
          for (let i = 0; i < rot; i++) [rr, cc] = rot4(rr, cc);
          return [rr, cc] as [number, number];
        }).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        for (const [r, c] of open) grid[r][c] = block[pos++] ?? 'X';
      }
      if (gridsShown.length < 1) gridsShown.push(grid.map((r) => r.join(' ')).join('\n'));
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out += grid[r][c];
    }
    return {
      output: grouped(out),
      steps: [
        step('Pad to full grids', 'Each grille holds sixteen letters.', chunk(t, 16).join(' ')),
        step('Cut the holes', 'One cell per rotation orbit, so four turns expose all sixteen cells exactly once.',
          holes.map(([r, c]) => `(row ${r + 1}, col ${c + 1})`).join('  ')),
        step('Write through four quarter-turns', 'Fill the visible cells in reading order, then turn the card.', gridsShown[0] ?? ''),
        step('Read the grid normally', 'Left to right, top to bottom.', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const holes = grilleHoles(key);
    const t = lettersOnly(ct);
    let out = '';
    for (const block of chunk(t, 16)) {
      const grid: string[][] = Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => block[r * 4 + c] ?? ''));
      for (let rot = 0; rot < 4; rot++) {
        const open = holes.map(([r, c]) => {
          let [rr, cc] = [r, c];
          for (let i = 0; i < rot; i++) [rr, cc] = rot4(rr, cc);
          return [rr, cc] as [number, number];
        }).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        for (const [r, c] of open) out += grid[r][c];
      }
    }
    return {
      output: out,
      steps: [
        step('Refill the grid', 'The ciphertext goes back in reading order.', ''),
        step('Lay the grille over it', 'Read the visible cells, turn, and read again.',
          holes.map(([r, c]) => `(row ${r + 1}, col ${c + 1})`).join('  ')),
        step('Read the plaintext', 'Padding letters remain at the end.', out),
      ],
    };
  },
};

const nihilistTransposition: Technique = {
  id: 'nihilist-transposition',
  name: 'Nihilist transposition',
  family: 'transposition',
  difficulty: 4,
  era: '19th century',
  summary: 'A square grid whose rows and columns are both permuted by the same keyword.',
  theory:
    'Write the message into a square, then reorder the rows using the keyword ranking and reorder the ' +
    'columns using the same ranking. Permuting in both directions moves every letter twice and destroys ' +
    'the row and column adjacencies that a single columnar transposition leaves intact. The grid must be ' +
    'square, so the keyword length fixes the block size.',
  keySpec: [{ name: 'keyword', kind: 'word', minLen: 5, maxLen: 7, label: 'Keyword' }],
  // The grid must be square, so the block size is the keyword length squared.
  // Padding therefore depends on the key, which is why the key is consulted here.
  normalise(s, key) {
    const n = lettersOnly(ks(key ?? {}, 'keyword', 'CIPHER')).length || 6;
    const t = lettersOnly(s);
    return t + 'X'.repeat((n * n - (t.length % (n * n))) % (n * n));
  },
  encode(pt, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const n = kw.length;
    const order = columnOrder(kw);
    const t = lettersOnly(pt);
    const padded = t + 'X'.repeat((n * n - (t.length % (n * n))) % (n * n));
    let out = '';
    let shown = '';
    for (const block of chunk(padded, n * n)) {
      const grid: string[][] = Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => block[r * n + c]));
      const res: string[][] = Array.from({ length: n }, () => new Array(n).fill(''));
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          // Row order[r] and column order[c] move to positions r and c.
          res[order[r]][order[c]] = grid[r][c];
        }
      }
      if (!shown) shown = res.map((row) => row.join(' ')).join('\n');
      out += res.map((row) => row.join('')).join('');
    }
    return {
      output: grouped(out),
      steps: [
        step('Pad to full squares', `Keyword length ${n} means ${n * n}-letter blocks.`, chunk(padded, n * n).join(' ')),
        step('Rank the keyword', 'The same ranking drives both permutations.',
          kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('Permute rows and columns', 'Every letter moves twice.', shown),
        step('Read across the rows', '', grouped(out)),
      ],
    };
  },
  decode(ct, key) {
    const kw = lettersOnly(ks(key, 'keyword', 'CIPHER'));
    const n = kw.length;
    const order = columnOrder(kw);
    const t = lettersOnly(ct);
    let out = '';
    for (const block of chunk(t, n * n)) {
      const res: string[][] = Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => block[r * n + c] ?? ''));
      const grid: string[][] = Array.from({ length: n }, () => new Array(n).fill(''));
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) grid[r][c] = res[order[r]][order[c]];
      }
      out += grid.map((row) => row.join('')).join('');
    }
    return {
      output: out,
      steps: [
        step('Rank the keyword', 'Same ranking.', kw.split('').map((c, i) => `${c} → ${order[i] + 1}`).join('\n')),
        step('Undo both permutations', 'Move row and column order[i] back to position i.', ''),
        step('Read the plaintext', 'Padding remains at the end.', out),
      ],
    };
  },
};

/* ================================ encodings =============================== */

const B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

const base45: Technique = {
  id: 'base45',
  name: 'Base45',
  family: 'encoding',
  difficulty: 3,
  era: '2022 (RFC 9285)',
  summary: 'Two bytes become three characters, using an alphabet QR codes can store efficiently.',
  theory:
    'QR codes have an alphanumeric mode covering exactly 45 characters, and it packs those far more ' +
    'densely than byte mode. Base45 exists to exploit that. It became widely deployed almost overnight as ' +
    'the encoding inside EU digital COVID certificates. Two bytes give a value under 65536, which fits in ' +
    'three base-45 digits since 45³ exceeds it.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const bytes = toBytes(ascii(pt));
    let out = '';
    for (let i = 0; i < bytes.length; i += 2) {
      if (i + 1 < bytes.length) {
        let n = bytes[i] * 256 + bytes[i + 1];
        const c = n % 45; n = Math.floor(n / 45);
        const d = n % 45; const e = Math.floor(n / 45);
        out += B45[c] + B45[d] + B45[e];
      } else {
        let n = bytes[i];
        const c = n % 45; const d = Math.floor(n / 45);
        out += B45[c] + B45[d];
      }
    }
    return {
      output: out,
      steps: [
        step('Pair the bytes', 'Two at a time; a lone trailing byte is handled separately.', Array.from(bytes.slice(0, 8)).join(' ')),
        step('Read each pair as one number', 'Big-endian, so the value is under 65536.', ''),
        step('Convert to base 45', 'Three digits per pair, two for a single trailing byte.', ''),
        step('Result', 'Uses only characters QR alphanumeric mode supports.', out),
      ],
    };
  },
  decode(ct) {
    const clean = ct.toUpperCase().split('').filter((c) => B45.includes(c)).join('');
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 3) {
      const g = clean.slice(i, i + 3);
      if (g.length === 3) {
        const n = B45.indexOf(g[0]) + B45.indexOf(g[1]) * 45 + B45.indexOf(g[2]) * 2025;
        bytes.push(Math.floor(n / 256), n % 256);
      } else if (g.length === 2) {
        bytes.push(B45.indexOf(g[0]) + B45.indexOf(g[1]) * 45);
      }
    }
    const out = fromBytes(new Uint8Array(bytes));
    return {
      output: out,
      steps: [
        step('Group into threes', 'A trailing group of two encodes one byte.', clean.slice(0, 30)),
        step('Rebuild each value', 'c + d×45 + e×2025.', ''),
        step('Split into bytes', 'High byte then low byte.', out),
      ],
    };
  },
};

const uuencode: Technique = {
  id: 'uuencode',
  name: 'Uuencode',
  family: 'encoding',
  difficulty: 3,
  era: '1980 (Unix-to-Unix Copy)',
  summary: 'Three bytes become four characters, offset into the printable ASCII range.',
  theory:
    'Built for uucp, the store-and-forward network that carried Unix mail and Usenet before the internet ' +
    'was general. Six bits are taken at a time and 32 is added, landing in the printable range starting at ' +
    'the space character — which caused endless trouble when mail systems stripped trailing spaces, so ' +
    'the backtick is substituted for it. Each line is prefixed by a character giving its byte count. ' +
    'Base64 replaced it for good reason, but it is still worth recognising in old archives.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: ascii,
  encode(pt) {
    const bytes = toBytes(ascii(pt));
    const enc = (v: number) => (v === 0 ? '`' : String.fromCharCode(v + 32));
    let body = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i] ?? 0, b1 = bytes[i + 1] ?? 0, b2 = bytes[i + 2] ?? 0;
      body += enc(b0 >> 2) + enc(((b0 & 3) << 4) | (b1 >> 4)) + enc(((b1 & 15) << 2) | (b2 >> 6)) + enc(b2 & 63);
    }
    const out = enc(bytes.length) + body;
    return {
      output: out,
      steps: [
        step('Group into three bytes', '24 bits at a time.', Array.from(bytes.slice(0, 9)).join(' ')),
        step('Split into four six-bit values', 'Each covers 0 to 63.', ''),
        step('Add 32 to each', 'Lands in printable ASCII. A zero would become a space, so a backtick is used instead.', ''),
        step('Prefix the length', 'The first character gives the number of bytes on the line.', out),
      ],
    };
  },
  decode(ct) {
    const dec = (c: string) => (c === '`' ? 0 : (c.charCodeAt(0) - 32) & 63);
    const len = dec(ct[0] ?? '`');
    const body = ct.slice(1);
    const bytes: number[] = [];
    for (let i = 0; i + 3 < body.length + 1; i += 4) {
      const g = body.slice(i, i + 4).padEnd(4, '`');
      const v = [dec(g[0]), dec(g[1]), dec(g[2]), dec(g[3])];
      bytes.push(((v[0] << 2) | (v[1] >> 4)) & 0xff, ((v[1] << 4) | (v[2] >> 2)) & 0xff, ((v[2] << 6) | v[3]) & 0xff);
    }
    const out = fromBytes(new Uint8Array(bytes.slice(0, len)));
    return {
      output: out,
      steps: [
        step('Read the length prefix', `The first character says ${len} bytes.`, ''),
        step('Subtract 32 from each character', 'Recovers the six-bit values.', ''),
        step('Repack into bytes', 'Four six-bit values give three bytes; trim to the stated length.', out),
      ],
    };
  },
};

/* ============================ modern symmetric ============================ */

function xteaBlock(v0: number, v1: number, k: number[], encrypt: boolean): [number, number] {
  const delta = 0x9e3779b9;
  if (encrypt) {
    let sum = 0;
    for (let i = 0; i < 32; i++) {
      v0 = (v0 + (((((v1 << 4) >>> 0) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]))) >>> 0;
      sum = (sum + delta) >>> 0;
      v1 = (v1 + (((((v0 << 4) >>> 0) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum >>> 11) & 3]))) >>> 0;
    }
  } else {
    let sum = (delta * 32) >>> 0;
    for (let i = 0; i < 32; i++) {
      v1 = (v1 - (((((v0 << 4) >>> 0) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum >>> 11) & 3]))) >>> 0;
      sum = (sum - delta) >>> 0;
      v0 = (v0 - (((((v1 << 4) >>> 0) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]))) >>> 0;
    }
  }
  return [v0 >>> 0, v1 >>> 0];
}

function toWords(b: Uint8Array): number[] {
  const w: number[] = [];
  for (let i = 0; i < b.length; i += 4) w.push(((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0);
  return w;
}

function fromWords(w: number[]): Uint8Array {
  const b = new Uint8Array(w.length * 4);
  w.forEach((v, i) => {
    b[i * 4] = (v >>> 24) & 0xff; b[i * 4 + 1] = (v >>> 16) & 0xff;
    b[i * 4 + 2] = (v >>> 8) & 0xff; b[i * 4 + 3] = v & 0xff;
  });
  return b;
}

const xtea: Technique = {
  id: 'xtea',
  name: 'XTEA',
  family: 'modern-symmetric',
  difficulty: 4,
  era: '1997',
  summary: 'A corrected TEA with a better key schedule and a rearranged round function.',
  theory:
    'Needham and Wheeler published XTEA to repair TEA\'s equivalent-key flaw. The round function shifts ' +
    'and XORs before adding, and the key word used in each round is selected from a different part of the ' +
    'running sum, which removes the symmetry that made TEA keys interchangeable. It stays tiny — still a ' +
    'few dozen lines — which is why it keeps appearing in embedded firmware where a full AES ' +
    'implementation will not fit.',
  keySpec: [{ name: 'key', kind: 'hex', bytes: 16, label: 'Key (128-bit)' }],
  normalise: ascii,
  encode(pt, key) {
    const k = toWords(hexToBytes(ks(key, 'key').padEnd(32, '0').slice(0, 32)));
    const data = toBytes(ascii(pt));
    const padLen = 8 - (data.length % 8);
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data);
    padded.fill(padLen, data.length);
    const w = toWords(padded);
    const outW: number[] = [];
    for (let i = 0; i < w.length; i += 2) {
      const [a, b] = xteaBlock(w[i], w[i + 1], k, true);
      outW.push(a, b);
    }
    return {
      output: bytesToHex(fromWords(outW)),
      steps: [
        step('Pad to 8-byte blocks', 'PKCS#7.', `${data.length} → ${padded.length} bytes`),
        step('Run 32 rounds', 'Each round: shift, XOR, add, then combine with a key word chosen by the running sum.', ''),
        step('Key selection differs from TEA', 'The index comes from two different slices of the sum, which is what removes the equivalent-key weakness.', ''),
        step('Result in hex', '', bytesToHex(fromWords(outW))),
      ],
    };
  },
  decode(ct, key) {
    const k = toWords(hexToBytes(ks(key, 'key').padEnd(32, '0').slice(0, 32)));
    const w = toWords(hexToBytes(ct));
    const outW: number[] = [];
    for (let i = 0; i < w.length; i += 2) {
      const [a, b] = xteaBlock(w[i], w[i + 1], k, false);
      outW.push(a, b);
    }
    const bytes = fromWords(outW);
    const pad = bytes[bytes.length - 1];
    const out = fromBytes(pad > 0 && pad <= 8 ? bytes.slice(0, bytes.length - pad) : bytes);
    return {
      output: out,
      steps: [
        step('Run the rounds backwards', 'The sum starts at its final value and counts down.', ''),
        step('Strip the padding', 'The last byte gives the count.', out),
      ],
    };
  },
};

const vernamBinary: Technique = {
  id: 'vernam-binary',
  name: 'Vernam cipher (binary)',
  family: 'modern-symmetric',
  difficulty: 3,
  era: '1917',
  summary: 'Message bytes XOR-ed against a random pad of the same length.',
  theory:
    'Gilbert Vernam patented XOR-ing a teleprinter tape of message against a tape of random key, one bit ' +
    'per bit. Joseph Mauborgne then observed that if the key tape is truly random, never reused and as ' +
    'long as the message, the system is unbreakable — the insight Shannon later proved formally. This is ' +
    'the one-time pad in binary rather than modulo 26. Every practical failure of the scheme has come from ' +
    'violating one of those three conditions, never from the mathematics.',
  keySpec: [{ name: 'pad', kind: 'pad', label: 'Pad (hex, as long as the message)' }],
  normalise: ascii,
  encode(pt, key) {
    const data = toBytes(ascii(pt));
    const padSrc = ks(key, 'pad', 'A');
    const pad = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) pad[i] = padSrc.charCodeAt(i % padSrc.length) & 0xff;
    const out = data.map((b, i) => b ^ pad[i]);
    return {
      output: bytesToHex(out),
      steps: [
        step('Take the message bytes', 'One per character.', Array.from(data.slice(0, 8)).join(' ')),
        step('Take the same number of pad bytes', 'Random, used once, then destroyed.', bytesToHex(pad.slice(0, 8))),
        step('XOR bit by bit', 'Every output bit is independent of the message bit given the pad.', ''),
        step('Result in hex', 'Perfect secrecy, provided the three conditions hold.', bytesToHex(out)),
      ],
    };
  },
  decode(ct, key) {
    const data = hexToBytes(ct);
    const padSrc = ks(key, 'pad', 'A');
    const pad = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) pad[i] = padSrc.charCodeAt(i % padSrc.length) & 0xff;
    const out = fromBytes(data.map((b, i) => b ^ pad[i]));
    return {
      output: out,
      steps: [
        step('Retrieve the matching pad', 'The receiver holds the only other copy.', ''),
        step('XOR again', 'Recovers the message.', out),
      ],
    };
  },
};

/* ============================= steganography ============================= */

const whitespaceStego: Technique = {
  id: 'whitespace-stego',
  name: 'Whitespace steganography',
  family: 'steganography',
  difficulty: 3,
  era: 'Modern',
  summary: 'Bits are hidden as spaces and tabs, which render as nothing visible.',
  theory:
    'Steganography hides the existence of a message rather than its content — an encrypted message ' +
    'announces that something is being concealed, while a hidden one does not. Encoding each bit as a ' +
    'space or a tab produces text that looks blank. It survives copy-and-paste but almost nothing else: ' +
    'any editor that trims trailing whitespace destroys the payload silently.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const bits = t.split('').map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    const out = bits.split('').map((b) => (b === '0' ? ' ' : '\t')).join('');
    return {
      output: out,
      steps: [
        step('Convert to bits', 'Eight bits per character.', bits.slice(0, 48)),
        step('Map bits to whitespace', 'Zero becomes a space, one becomes a tab.', ''),
        step('Result', `${out.length} invisible characters. Shown here with · for space and → for tab.`,
          out.replace(/ /g, '·').replace(/\t/g, '→').slice(0, 64)),
      ],
    };
  },
  decode(ct) {
    const bits = ct.split('').filter((c) => c === ' ' || c === '\t').map((c) => (c === ' ' ? '0' : '1')).join('');
    const out = (bits.match(/.{8}/g) ?? []).map((b) => String.fromCharCode(parseInt(b, 2))).join('');
    return {
      output: out,
      steps: [
        step('Extract the whitespace', 'Everything else is ignored.', bits.slice(0, 48)),
        step('Read eight bits at a time', 'Each group is one character.', out),
      ],
    };
  },
};

const zeroWidthStego: Technique = {
  id: 'zero-width-stego',
  name: 'Zero-width character steganography',
  family: 'steganography',
  difficulty: 3,
  era: 'Modern',
  summary: 'Bits are hidden in Unicode characters that occupy no visual space at all.',
  theory:
    'Zero-width space and zero-width non-joiner exist for legitimate typesetting reasons in scripts that ' +
    'need invisible boundary markers. Because they render as nothing but survive as real characters, they ' +
    'can carry a payload through any channel that passes Unicode intact — chat, documents, web pages. The ' +
    'technique has been used to watermark documents and fingerprint the recipient of a leak, since each ' +
    'copy can carry a different invisible tag.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const bits = t.split('').map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    const out = bits.split('').map((b) => (b === '0' ? '​' : '‌')).join('');
    return {
      output: out,
      steps: [
        step('Convert to bits', 'Eight bits per character.', bits.slice(0, 48)),
        step('Map to invisible code points', 'U+200B zero-width space for 0, U+200C zero-width non-joiner for 1.', ''),
        step('Result', `${out.length} characters that render as nothing. Shown here as 0 and 1.`,
          out.replace(/​/g, '0').replace(/‌/g, '1').slice(0, 64)),
      ],
    };
  },
  decode(ct) {
    const bits = Array.from(ct).filter((c) => c === '​' || c === '‌')
      .map((c) => (c === '​' ? '0' : '1')).join('');
    const out = (bits.match(/.{8}/g) ?? []).map((b) => String.fromCharCode(parseInt(b, 2))).join('');
    return {
      output: out,
      steps: [
        step('Filter to the invisible characters', 'Visible text is discarded.', bits.slice(0, 48)),
        step('Read eight bits at a time', '', out),
      ],
    };
  },
};

const NULL_WORDS = [
  'ARRIVED', 'BRIDGE', 'CARGO', 'DELAYED', 'ENGINE', 'FREIGHT', 'GRANTED', 'HARBOUR',
  'INSPECT', 'JUNCTION', 'KEEPING', 'LANDING', 'MANIFEST', 'NOTICE', 'ORDERS', 'PACKET',
  'QUARTER', 'RECEIPT', 'SHIPPING', 'TONNAGE', 'UNLOAD', 'VESSEL', 'WHARF', 'XRAYED',
  'YARDAGE', 'ZONING',
];

const nullCipher: Technique = {
  id: 'null-cipher',
  name: 'Null cipher',
  family: 'steganography',
  difficulty: 2,
  era: 'Long-standing',
  summary: 'The message is spelled by the first letter of each word in an innocuous-looking text.',
  theory:
    'The cover text carries the message in its initials while reading as ordinary correspondence. ' +
    'Wartime censors watched for exactly this and would rewrite letters — replacing words with synonyms — ' +
    'specifically to destroy any hidden pattern without having to prove one existed. The weakness is that ' +
    'the cover has to sound natural, and forcing particular initial letters makes that hard.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    const words = t.split('').map((c) => NULL_WORDS[A.indexOf(c)]);
    return {
      output: words.join(' '),
      steps: [
        step('Take the hidden message', 'Letters only.', t),
        step('Choose a word for each letter', 'Every word begins with the letter it carries.',
          t.slice(0, 5).split('').map((c) => `${c} → ${NULL_WORDS[A.indexOf(c)]}`).join('\n')),
        step('Result', 'The cover reads as shipping correspondence; the initials carry the payload.', words.join(' ')),
      ],
    };
  },
  decode(ct) {
    const out = ct.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('');
    return {
      output: out,
      steps: [
        step('Take the first letter of each word', 'The rest of the text is decoration.', ''),
        step('Read them in order', '', out),
      ],
    };
  },
};

const COVER =
  'THEQUARTERLYREPORTARRIVEDLATEONFRIDAYANDTHEBOARDREVIEWEDEVERYFIGURE' +
  'BEFORESIGNINGOFFONTHEACCOUNTSTHEAUDITORSRAISEDNOOBJECTIONSTHISTIME' +
  'ANDTHEMEETINGCLOSEDEARLIERTHANANYONEHADEXPECTEDGIVENTHEAGENDA' +
  'SEVERALITEMSWEREHELDOVERUNTILTHENEXTSESSIONWHICHISSCHEDULEDFORTHESPRING' +
  'THETREASURERNOTEDTHATRESERVESREMAINADEQUATEFORTHECOMINGYEAR';

const caseStego: Technique = {
  id: 'case-stego',
  name: 'Bacon case steganography',
  family: 'steganography',
  difficulty: 4,
  era: '1605, in modern form',
  summary: 'A Baconian five-bit code carried by the letter case of an ordinary cover text.',
  theory:
    'This is what Bacon actually intended. The five-symbol code per letter is not written out; it is ' +
    'carried by some binary property of the cover — two typefaces in his printed examples, upper and lower ' +
    'case here. The reader sees ordinary prose and has no reason to suspect it carries anything. Five ' +
    'cover letters are consumed per hidden letter, so the cover has to be five times the payload.',
  keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
  normalise: lettersOnly,
  encode(pt) {
    const t = lettersOnly(pt);
    // 11111 = 31, which is past Z. The cover after the payload is all lowercase,
    // and lowercase reads as 00000 = A — so without an explicit terminator the
    // decoder would append A's for the entire remaining cover.
    const bits = t.split('').map((c) => A.indexOf(c).toString(2).padStart(5, '0')).join('') + '11111';
    if (bits.length > COVER.length) {
      return { output: '', steps: [step('Cover too short', `Need ${bits.length} cover letters, have ${COVER.length}.`)] };
    }
    const out = COVER.split('').map((c, i) => (i < bits.length ? (bits[i] === '1' ? c.toUpperCase() : c.toLowerCase()) : c.toLowerCase())).join('');
    return {
      output: out,
      steps: [
        step('Encode the message in five bits per letter', 'A=00000 … Z=11001.', bits.slice(0, 40)),
        step('Append a terminator', 'The group 11111 is 31, past the end of the alphabet, so the reader knows where the payload stops.', ''),
        step('Take a cover text', `${bits.length} letters are needed for a ${t.length}-letter message.`, COVER.slice(0, 60) + '…'),
        step('Set the case from the bits', 'Uppercase for 1, lowercase for 0.', out.slice(0, 60) + '…'),
        step('Result', 'The cover reads normally; only its capitalisation carries the payload.', out),
      ],
    };
  },
  decode(ct) {
    const letters = ct.split('').filter((c) => /[A-Za-z]/.test(c));
    const bits = letters.map((c) => (c === c.toUpperCase() ? '1' : '0')).join('');
    const groups = bits.match(/.{5}/g) ?? [];
    let out = '';
    for (const g of groups) {
      const v = parseInt(g, 2);
      if (v > 25) break; // past the payload, the cover is all lowercase
      out += A[v];
    }
    return {
      output: out,
      steps: [
        step('Read the case pattern', 'Uppercase is 1, lowercase is 0.', bits.slice(0, 40)),
        step('Group into fives', 'Each group is one hidden letter.', groups.slice(0, 8).join(' ')),
        step('Decode', 'Values above 25 mark the end of the payload.', out),
      ],
    };
  },
};

export const EXTRAS: Technique[] = [
  dancingMen,
  turningGrille, nihilistTransposition,
  base45, uuencode,
  xtea, vernamBinary,
  whitespaceStego, zeroWidthStego, nullCipher, caseStego,
];
