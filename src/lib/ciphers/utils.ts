import type { Key, Rng, Step } from './types';

export const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Letters only, uppercased. The standard preparation for classical ciphers. */
export function lettersOnly(s: string): string {
  return s.toUpperCase().replace(/[^A-Z]/g, '');
}

/** Letters and digits, uppercased — for techniques with a 36-symbol alphabet. */
export function alnumOnly(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function identity(s: string): string {
  return s;
}

/** Collapse J into I. Required by any 25-cell square. */
export function foldJ(s: string): string {
  return lettersOnly(s).replace(/J/g, 'I');
}

/** Collapse Q away. The alternative 25-cell convention, used by Bifid variants. */
export function dropQ(s: string): string {
  return lettersOnly(s).replace(/Q/g, '');
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function egcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0];
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - Math.floor(a / b) * y];
}

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** Modular inverse, or null when `a` is not invertible mod `m`. */
export function modInv(a: number, m: number): number | null {
  const [g, x] = egcd(mod(a, m), m);
  return g !== 1 ? null : mod(x, m);
}

export function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  let b = base % m;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return result;
}

/**
 * Build a mixed alphabet: the keyword's distinct letters first, then the rest of
 * `alphabet` in order. Shared by keyword substitution, Playfair, Quagmire,
 * ADFGVX and every square-based technique.
 */
export function keyedAlphabet(keyword: string, alphabet: string = A): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of keyword.toUpperCase()) {
    if (alphabet.includes(ch) && !seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  for (const ch of alphabet) {
    if (!seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out.join('');
}

/**
 * Rank the letters of a keyword to give the column read-out order used by every
 * columnar transposition. Repeated letters are numbered left to right, which is
 * the convention every classical text uses.
 */
export function columnOrder(keyword: string): number[] {
  const chars = keyword.toUpperCase().split('');
  const idx = chars.map((c, i) => ({ c, i }));
  idx.sort((a, b) => (a.c === b.c ? a.i - b.i : a.c < b.c ? -1 : 1));
  const order = new Array<number>(chars.length);
  idx.forEach((entry, rank) => {
    order[entry.i] = rank;
  });
  return order;
}

export function chunk(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

/** Group into fives — how classical ciphertext is conventionally transmitted. */
export function grouped(s: string, size = 5): string {
  return chunk(s, size).join(' ');
}

export function toBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function fromBytes(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(h: string): Uint8Array {
  const clean = h.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length >> 1);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

/** Render a square as a fixed-width grid for the worked-solution panel. */
export function renderSquare(square: string, cols: number, rowHdr?: string, colHdr?: string): string {
  const rows = chunk(square, cols);
  const lines: string[] = [];
  if (colHdr) lines.push('    ' + colHdr.split('').join(' '));
  rows.forEach((r, i) => {
    const prefix = rowHdr ? rowHdr[i] + ' | ' : '';
    lines.push(prefix + r.split('').join(' '));
  });
  return lines.join('\n');
}

export function step(title: string, detail: string, data?: string): Step {
  return data === undefined ? { title, detail } : { title, detail, data };
}

/** xmur3 + sfc32 — small, fast, and reproducible across platforms. */
export function makeRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const seedFn = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
  let a = seedFn();
  let b = seedFn();
  let c = seedFn();
  let d = seedFn();
  const next = () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  const rng: Rng = {
    float: next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    shuffle: (items) => {
      const arr = items.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
  return rng;
}

/** Vocabulary the random key generator draws on — recognisable, never obscene. */
export const KEYWORDS = [
  'HARBOUR', 'LANTERN', 'MERIDIAN', 'ORCHARD', 'QUARTZ', 'SPARROW', 'THISTLE',
  'VOYAGER', 'WINTER', 'ZEPHYR', 'ANCHOR', 'BEACON', 'CIPHER', 'DRAGON',
  'EMBER', 'FALCON', 'GRANITE', 'HOLLOW', 'IVORY', 'JUNIPER', 'KESTREL',
  'MARBLE', 'NEBULA', 'OBSIDIAN', 'PHOENIX', 'RIVER', 'SUMMIT', 'TEMPEST',
  'UMBRA', 'VERTEX', 'WILLOW', 'YONDER', 'AZURE', 'BASALT', 'CINDER',
  'DELTA', 'ECLIPSE', 'FATHOM', 'GLACIER', 'HORIZON', 'INDIGO', 'KEYSTONE',
  'LEGACY', 'MONSOON', 'NORTHERN', 'OUTPOST', 'PILGRIM', 'QUIVER', 'RAMPART',
  'SIERRA', 'TRAVERSE', 'UPLAND', 'VESSEL', 'WARDEN', 'YIELD', 'ZODIAC',
] as const;

export function randomKey(spec: import('./types').KeyField[], rng: Rng): Key {
  const key: Key = {};
  for (const field of spec) {
    switch (field.kind) {
      case 'int':
        key[field.name] = rng.int(field.min, field.max);
        break;
      case 'word': {
        const pool = KEYWORDS.filter(
          (w) => w.length >= field.minLen && w.length <= field.maxLen,
        );
        key[field.name] = pool.length ? rng.pick(pool) : rng.pick(KEYWORDS).slice(0, field.maxLen);
        break;
      }
      case 'alphabet':
        key[field.name] = rng.shuffle(A.split('')).join('');
        break;
      case 'choice':
        key[field.name] = rng.pick(field.options);
        break;
      case 'hex':
        key[field.name] = Array.from({ length: field.bytes }, () =>
          rng.int(0, 255).toString(16).padStart(2, '0'),
        ).join('');
        break;
      case 'pad':
        // Provisional length. The challenge generator overwrites this with a pad
        // matched to the actual plaintext once that plaintext exists.
        key[field.name] = Array.from({ length: 256 }, () => A[rng.int(0, 25)]).join('');
        break;
      case 'none':
        break;
    }
  }
  return key;
}

export function ks(key: Key, name: string, fallback = ''): string {
  const v = key[name];
  return v === undefined ? fallback : String(v);
}

export function kn(key: Key, name: string, fallback = 0): number {
  const v = key[name];
  if (v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}
