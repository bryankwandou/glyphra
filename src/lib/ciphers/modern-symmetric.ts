import type { Technique } from './types';
import { toBytes, fromBytes, bytesToHex, hexToBytes, chunk, step, ks, kn } from './utils';

const ascii = (s: string) => s.replace(/[^\x20-\x7e]/g, '');

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((v, i) => v ^ b[i % b.length]);
}

/* ---------------------------------- XOR ---------------------------------- */

const xorSingle: Technique = {
  id: 'xor-single',
  name: 'Single-byte XOR',
  family: 'modern-symmetric',
  difficulty: 2,
  era: 'Modern',
  summary: 'Every byte is combined with one fixed byte using exclusive-or.',
  theory:
    'XOR is its own inverse, so encryption and decryption are the same operation. With only 256 possible ' +
    'keys, brute force is instant — the standard attack tries all 256 and scores each result by how closely ' +
    'its letter frequencies match English. It appears constantly in malware and in beginner capture-the-flag ' +
    'problems precisely because it is trivial to implement and trivial to break.',
  keySpec: [{ name: 'key', kind: 'int', min: 1, max: 255, label: 'Key byte (1-255)' }],
  normalise: ascii,
  encode(pt, key) {
    const k = kn(key, 'key', 42) & 0xff;
    const bytes = toBytes(ascii(pt));
    const out = bytes.map((b) => b ^ k);
    return {
      output: bytesToHex(out),
      steps: [
        step('Take the bytes', 'One byte per character.',
          Array.from(bytes.slice(0, 6)).map((b, i) => `${ascii(pt)[i]} = ${b} = ${b.toString(2).padStart(8, '0')}`).join('\n')),
        step('XOR with the key byte', `Key = ${k} = ${k.toString(2).padStart(8, '0')}.`,
          Array.from(bytes.slice(0, 4)).map((b) => `${b.toString(2).padStart(8, '0')} ⊕ ${k.toString(2).padStart(8, '0')} = ${(b ^ k).toString(2).padStart(8, '0')}`).join('\n')),
        step('Result in hex', 'Output bytes are usually unprintable, so they are shown as hex.', bytesToHex(out)),
      ],
    };
  },
  decode(ct, key) {
    const k = kn(key, 'key', 42) & 0xff;
    const out = hexToBytes(ct).map((b) => b ^ k);
    return {
      output: fromBytes(out),
      steps: [
        step('Parse the hex', 'Two digits per byte.', ''),
        step('XOR with the same byte', 'XOR undoes itself.', fromBytes(out)),
      ],
    };
  },
};

const xorRepeating: Technique = {
  id: 'xor-repeating',
  name: 'Repeating-key XOR',
  family: 'modern-symmetric',
  difficulty: 3,
  era: 'Modern',
  summary: 'A short key is cycled across the message and XOR-ed byte by byte.',
  theory:
    'This is Vigenère operating on bytes instead of letters, and it fails for the same reason. The key ' +
    'length is recovered by finding the offset that minimises the Hamming distance between neighbouring ' +
    'blocks, after which the message splits into that many single-byte XOR problems, each solved by ' +
    'frequency analysis. It is the classic exercise for learning how repetition destroys a stream cipher.',
  keySpec: [{ name: 'key', kind: 'word', minLen: 3, maxLen: 7, label: 'Key' }],
  normalise: ascii,
  encode(pt, key) {
    const k = toBytes(ks(key, 'key', 'KEY'));
    const bytes = toBytes(ascii(pt));
    const out = xorBytes(bytes, k);
    return {
      output: bytesToHex(out),
      steps: [
        step('Take the bytes', 'One byte per character.', Array.from(bytes.slice(0, 8)).join(' ')),
        step('Cycle the key', `"${ks(key, 'key', 'KEY')}" repeats across the message.`,
          Array.from(bytes.slice(0, 8)).map((_, i) => k[i % k.length]).join(' ')),
        step('XOR position by position', 'Byte i is combined with key byte i mod keylength.', ''),
        step('Result in hex', 'Repetition at the key length is what an attacker looks for.', bytesToHex(out)),
      ],
    };
  },
  decode(ct, key) {
    const k = toBytes(ks(key, 'key', 'KEY'));
    const out = xorBytes(hexToBytes(ct), k);
    return {
      output: fromBytes(out),
      steps: [
        step('Parse the hex', 'Two digits per byte.', ''),
        step('XOR with the same repeating key', 'Self-inverse.', fromBytes(out)),
      ],
    };
  },
};

/* ---------------------------------- RC4 ---------------------------------- */

function rc4(keyBytes: Uint8Array, data: Uint8Array): { out: Uint8Array; sInit: number[] } {
  const S = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + keyBytes[i % keyBytes.length]) & 0xff;
    [S[i], S[j]] = [S[j], S[i]];
  }
  const sInit = S.slice(0, 16);
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let n = 0; n < data.length; n++) {
    i = (i + 1) & 0xff;
    j = (j + S[i]) & 0xff;
    [S[i], S[j]] = [S[j], S[i]];
    out[n] = data[n] ^ S[(S[i] + S[j]) & 0xff];
  }
  return { out, sInit };
}

const rc4Cipher: Technique = {
  id: 'rc4',
  name: 'RC4',
  family: 'modern-symmetric',
  difficulty: 4,
  era: '1987, leaked 1994',
  summary: 'A stream cipher that shuffles a 256-byte table and XORs the output against the message.',
  theory:
    'Ron Rivest designed RC4 as a trade secret; someone posted it anonymously to a mailing list in 1994 ' +
    'and it became the most widely deployed stream cipher in the world, carrying SSL and WEP for years. ' +
    'It is remarkably compact — the whole algorithm fits in a few lines. It is also badly broken: the first ' +
    'bytes of the keystream are measurably biased, and those biases were enough to break WEP outright and ' +
    'later to threaten TLS. It has been prohibited in TLS since 2015 and should be treated as a museum ' +
    'piece rather than a tool.',
  keySpec: [{ name: 'key', kind: 'word', minLen: 4, maxLen: 8, label: 'Key' }],
  normalise: ascii,
  encode(pt, key) {
    const k = toBytes(ks(key, 'key', 'SECRET'));
    const { out, sInit } = rc4(k, toBytes(ascii(pt)));
    return {
      output: bytesToHex(out),
      steps: [
        step('Initialise the state', 'S starts as 0 through 255 in order.', '0 1 2 3 4 5 6 7 …'),
        step('Key-scheduling pass', 'Walk i from 0 to 255, advance j by S[i] plus a key byte, and swap.',
          `first 16 bytes of S afterwards: ${sInit.join(' ')}`),
        step('Generate the keystream', 'Keep swapping and emit S[(S[i]+S[j]) mod 256] each step.', ''),
        step('XOR against the message', 'Same as any stream cipher.', bytesToHex(out)),
      ],
    };
  },
  decode(ct, key) {
    const k = toBytes(ks(key, 'key', 'SECRET'));
    const { out } = rc4(k, hexToBytes(ct));
    return {
      output: fromBytes(out),
      steps: [
        step('Regenerate the same keystream', 'The key alone determines it.', ''),
        step('XOR again', 'Stream ciphers are symmetric in the plainest sense.', fromBytes(out)),
      ],
    };
  },
};

/* -------------------------------- ChaCha20 -------------------------------- */

function rotl32(v: number, c: number): number {
  return ((v << c) | (v >>> (32 - c))) >>> 0;
}

function chachaBlock(key: Uint32Array, counter: number, nonce: Uint32Array): Uint8Array {
  const s = new Uint32Array(16);
  s[0] = 0x61707865; s[1] = 0x3320646e; s[2] = 0x79622d32; s[3] = 0x6b206574;
  s.set(key, 4);
  s[12] = counter >>> 0;
  s.set(nonce, 13);
  const x = s.slice();
  const qr = (a: number, b: number, c: number, d: number) => {
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rotl32(x[d] ^ x[a], 16);
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rotl32(x[b] ^ x[c], 12);
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rotl32(x[d] ^ x[a], 8);
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rotl32(x[b] ^ x[c], 7);
  };
  for (let i = 0; i < 10; i++) {
    qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15);
    qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14);
  }
  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
    const v = (x[i] + s[i]) >>> 0;
    out[i * 4] = v & 0xff;
    out[i * 4 + 1] = (v >>> 8) & 0xff;
    out[i * 4 + 2] = (v >>> 16) & 0xff;
    out[i * 4 + 3] = (v >>> 24) & 0xff;
  }
  return out;
}

function chacha20(keyHex: string, nonceHex: string, data: Uint8Array): Uint8Array {
  const kb = hexToBytes(keyHex.padEnd(64, '0').slice(0, 64));
  const nb = hexToBytes(nonceHex.padEnd(24, '0').slice(0, 24));
  const key = new Uint32Array(8);
  for (let i = 0; i < 8; i++) key[i] = (kb[i * 4] | (kb[i * 4 + 1] << 8) | (kb[i * 4 + 2] << 16) | (kb[i * 4 + 3] << 24)) >>> 0;
  const nonce = new Uint32Array(3);
  for (let i = 0; i < 3; i++) nonce[i] = (nb[i * 4] | (nb[i * 4 + 1] << 8) | (nb[i * 4 + 2] << 16) | (nb[i * 4 + 3] << 24)) >>> 0;
  const out = new Uint8Array(data.length);
  for (let off = 0; off < data.length; off += 64) {
    const ks = chachaBlock(key, 1 + Math.floor(off / 64), nonce);
    for (let i = 0; i < 64 && off + i < data.length; i++) out[off + i] = data[off + i] ^ ks[i];
  }
  return out;
}

const chacha: Technique = {
  id: 'chacha20',
  name: 'ChaCha20',
  family: 'modern-symmetric',
  difficulty: 5,
  era: '2008',
  summary: 'A modern stream cipher built from addition, rotation and exclusive-or.',
  theory:
    'Daniel Bernstein refined his own Salsa20 into ChaCha20. The state is sixteen 32-bit words — four ' +
    'constants, the key, a block counter and a nonce — stirred by twenty rounds of a quarter-round function ' +
    'that only adds, rotates and XORs. Using no lookup tables means no data-dependent memory access, which ' +
    'removes the cache-timing side channels that plague table-driven AES implementations. It is fast in ' +
    'software without special hardware, and that is why TLS, WireGuard and SSH all adopted it. Note that ' +
    'this is the raw cipher: real deployments pair it with Poly1305 so the ciphertext cannot be tampered ' +
    'with undetected.',
  keySpec: [
    { name: 'key', kind: 'hex', bytes: 32, label: 'Key (256-bit)' },
    { name: 'nonce', kind: 'hex', bytes: 12, label: 'Nonce (96-bit)' },
  ],
  normalise: ascii,
  encode(pt, key) {
    const out = chacha20(ks(key, 'key'), ks(key, 'nonce'), toBytes(ascii(pt)));
    return {
      output: bytesToHex(out),
      steps: [
        step('Build the 4×4 state', 'Constants "expand 32-byte k", then the key, the counter, and the nonce.', ''),
        step('Run twenty rounds', 'Ten double-rounds, each four column quarter-rounds then four diagonal ones.',
          'quarter-round: a += b; d ^= a; d <<<= 16; c += d; b ^= c; b <<<= 12; a += b; d ^= a; d <<<= 8; c += d; b ^= c; b <<<= 7'),
        step('Add the original state back', 'Without this feed-forward the permutation would be invertible and the cipher worthless.', ''),
        step('XOR the keystream against the message', '64 bytes per block.', bytesToHex(out)),
      ],
    };
  },
  decode(ct, key) {
    const out = chacha20(ks(key, 'key'), ks(key, 'nonce'), hexToBytes(ct));
    return {
      output: fromBytes(out),
      steps: [
        step('Regenerate the keystream', 'Key, nonce and counter reproduce it exactly.', ''),
        step('XOR again', 'Recovers the plaintext.', fromBytes(out)),
      ],
    };
  },
};

/* ------------------------------ TEA and XTEA ----------------------------- */

function teaEncryptBlock(v0: number, v1: number, k: number[], rounds = 32): [number, number] {
  let sum = 0;
  const delta = 0x9e3779b9;
  for (let i = 0; i < rounds; i++) {
    sum = (sum + delta) >>> 0;
    v0 = (v0 + ((((v1 << 4) >>> 0) + k[0]) ^ (v1 + sum) ^ (((v1 >>> 5)) + k[1]))) >>> 0;
    v1 = (v1 + ((((v0 << 4) >>> 0) + k[2]) ^ (v0 + sum) ^ (((v0 >>> 5)) + k[3]))) >>> 0;
  }
  return [v0 >>> 0, v1 >>> 0];
}

function teaDecryptBlock(v0: number, v1: number, k: number[], rounds = 32): [number, number] {
  const delta = 0x9e3779b9;
  let sum = (delta * rounds) >>> 0;
  for (let i = 0; i < rounds; i++) {
    v1 = (v1 - ((((v0 << 4) >>> 0) + k[2]) ^ (v0 + sum) ^ (((v0 >>> 5)) + k[3]))) >>> 0;
    v0 = (v0 - ((((v1 << 4) >>> 0) + k[0]) ^ (v1 + sum) ^ (((v1 >>> 5)) + k[1]))) >>> 0;
    sum = (sum - delta) >>> 0;
  }
  return [v0 >>> 0, v1 >>> 0];
}

function bytesToWords(b: Uint8Array): number[] {
  const w: number[] = [];
  for (let i = 0; i < b.length; i += 4) {
    w.push(((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0);
  }
  return w;
}

function wordsToBytes(w: number[]): Uint8Array {
  const b = new Uint8Array(w.length * 4);
  w.forEach((v, i) => {
    b[i * 4] = (v >>> 24) & 0xff;
    b[i * 4 + 1] = (v >>> 16) & 0xff;
    b[i * 4 + 2] = (v >>> 8) & 0xff;
    b[i * 4 + 3] = v & 0xff;
  });
  return b;
}

function pkcs7(b: Uint8Array, block: number): Uint8Array {
  const pad = block - (b.length % block);
  const out = new Uint8Array(b.length + pad);
  out.set(b);
  out.fill(pad, b.length);
  return out;
}

function unpad(b: Uint8Array): Uint8Array {
  if (!b.length) return b;
  const pad = b[b.length - 1];
  return pad > 0 && pad <= b.length ? b.slice(0, b.length - pad) : b;
}

const tea: Technique = {
  id: 'tea',
  name: 'TEA (Tiny Encryption Algorithm)',
  family: 'modern-symmetric',
  difficulty: 4,
  era: '1994',
  summary: 'A 64-bit block cipher small enough to memorise, built from addition, shifts and XOR.',
  theory:
    'Wheeler and Needham wrote TEA to be as short as a real block cipher can get — a few lines, no tables, ' +
    'no key schedule worth the name. It runs 32 Feistel rounds using a constant derived from the golden ' +
    'ratio to break up symmetry between rounds. It has a genuine flaw: every key is equivalent to three ' +
    'others, which cuts the effective key space to 126 bits and made it usable as an attack vector against ' +
    'the original Xbox. XTEA was written to fix it.',
  keySpec: [{ name: 'key', kind: 'hex', bytes: 16, label: 'Key (128-bit)' }],
  normalise: ascii,
  encode(pt, key) {
    const k = bytesToWords(hexToBytes(ks(key, 'key').padEnd(32, '0').slice(0, 32)));
    const data = pkcs7(toBytes(ascii(pt)), 8);
    const words = bytesToWords(data);
    const outWords: number[] = [];
    for (let i = 0; i < words.length; i += 2) {
      const [a, b] = teaEncryptBlock(words[i], words[i + 1], k);
      outWords.push(a, b);
    }
    return {
      output: bytesToHex(wordsToBytes(outWords)),
      steps: [
        step('Pad to a block boundary', 'PKCS#7 padding brings the length to a multiple of 8 bytes.', `${toBytes(ascii(pt)).length} → ${data.length} bytes`),
        step('Split into 64-bit blocks', 'Two 32-bit halves per block.', ''),
        step('Run 32 Feistel rounds', 'Each round mixes one half into the other using shifts, additions and XOR, driven by a running sum of the golden-ratio constant 0x9E3779B9.', ''),
        step('Result in hex', 'Electronic codebook mode — identical blocks encrypt identically, which is why nobody should use it this way in production.', bytesToHex(wordsToBytes(outWords))),
      ],
    };
  },
  decode(ct, key) {
    const k = bytesToWords(hexToBytes(ks(key, 'key').padEnd(32, '0').slice(0, 32)));
    const words = bytesToWords(hexToBytes(ct));
    const outWords: number[] = [];
    for (let i = 0; i < words.length; i += 2) {
      const [a, b] = teaDecryptBlock(words[i], words[i + 1], k);
      outWords.push(a, b);
    }
    return {
      output: fromBytes(unpad(wordsToBytes(outWords))),
      steps: [
        step('Run the rounds backwards', 'The running sum starts at its final value and counts down.', ''),
        step('Strip the padding', 'The last byte says how many padding bytes to remove.', fromBytes(unpad(wordsToBytes(outWords)))),
      ],
    };
  },
};

/* ---------------------------------- AES ---------------------------------- */

function buildSboxes(): { sbox: Uint8Array; inv: Uint8Array } {
  const sbox = new Uint8Array(256);
  const inv = new Uint8Array(256);
  let p = 1;
  let q = 1;
  const rotl8 = (x: number, s: number) => ((x << s) | (x >> (8 - s))) & 0xff;
  do {
    p = (p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0)) & 0xff;
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    sbox[p] = (q ^ rotl8(q, 1) ^ rotl8(q, 2) ^ rotl8(q, 3) ^ rotl8(q, 4) ^ 0x63) & 0xff;
  } while (p !== 1);
  sbox[0] = 0x63;
  for (let i = 0; i < 256; i++) inv[sbox[i]] = i;
  return { sbox, inv };
}

const { sbox: SBOX, inv: INV_SBOX } = buildSboxes();

function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p & 0xff;
}

function expandKey(key: Uint8Array): Uint8Array[] {
  const Nk = 4;
  const Nr = 10;
  const w: number[][] = [];
  for (let i = 0; i < Nk; i++) w.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
  let rcon = 1;
  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = w[i - 1].slice();
    if (i % Nk === 0) {
      temp = [temp[1], temp[2], temp[3], temp[0]].map((b) => SBOX[b]);
      temp[0] ^= rcon;
      rcon = gmul(rcon, 2);
    }
    w.push(w[i - Nk].map((b, j) => b ^ temp[j]));
  }
  const rounds: Uint8Array[] = [];
  for (let r = 0; r <= Nr; r++) {
    const rk = new Uint8Array(16);
    for (let c = 0; c < 4; c++) for (let j = 0; j < 4; j++) rk[c * 4 + j] = w[r * 4 + c][j];
    rounds.push(rk);
  }
  return rounds;
}

function aesEncryptBlock(block: Uint8Array, rk: Uint8Array[]): Uint8Array {
  const s = block.slice();
  for (let i = 0; i < 16; i++) s[i] ^= rk[0][i];
  for (let round = 1; round <= 10; round++) {
    for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]];
    shiftRows(s, false);
    if (round < 10) mixColumns(s, false);
    for (let i = 0; i < 16; i++) s[i] ^= rk[round][i];
  }
  return s;
}

function aesDecryptBlock(block: Uint8Array, rk: Uint8Array[]): Uint8Array {
  const s = block.slice();
  for (let i = 0; i < 16; i++) s[i] ^= rk[10][i];
  for (let round = 9; round >= 0; round--) {
    shiftRows(s, true);
    for (let i = 0; i < 16; i++) s[i] = INV_SBOX[s[i]];
    for (let i = 0; i < 16; i++) s[i] ^= rk[round][i];
    if (round > 0) mixColumns(s, true);
  }
  return s;
}

/** State is column-major: byte index = column*4 + row. */
function shiftRows(s: Uint8Array, inverse: boolean): void {
  for (let r = 1; r < 4; r++) {
    const row = [s[r], s[4 + r], s[8 + r], s[12 + r]];
    const shifted = inverse
      ? row.map((_, i) => row[(i - r + 4) % 4])
      : row.map((_, i) => row[(i + r) % 4]);
    for (let c = 0; c < 4; c++) s[c * 4 + r] = shifted[c];
  }
}

function mixColumns(s: Uint8Array, inverse: boolean): void {
  const m = inverse
    ? [14, 11, 13, 9, 9, 14, 11, 13, 13, 9, 14, 11, 11, 13, 9, 14]
    : [2, 3, 1, 1, 1, 2, 3, 1, 1, 1, 2, 3, 3, 1, 1, 2];
  for (let c = 0; c < 4; c++) {
    const col = [s[c * 4], s[c * 4 + 1], s[c * 4 + 2], s[c * 4 + 3]];
    for (let r = 0; r < 4; r++) {
      s[c * 4 + r] = col.reduce((acc, v, i) => acc ^ gmul(v, m[r * 4 + i]), 0);
    }
  }
}

function aesMode(id: string, name: string, cbc: boolean): Technique {
  return {
    id,
    name,
    family: 'modern-symmetric',
    difficulty: 5,
    era: '2001 (FIPS 197)',
    summary: cbc
      ? 'AES with each block XOR-ed against the previous ciphertext block before encryption.'
      : 'AES applied to each 16-byte block independently.',
    theory:
      'Rijndael, by Daemen and Rijmen, won the open NIST competition and became AES in 2001. Each round ' +
      'applies four steps: a byte-wise substitution through an S-box built from inversion in GF(2⁸), a row ' +
      'shift, a column mix that is a matrix multiply in the same field, and a XOR with the round key. ' +
      'AES-128 runs ten such rounds. After more than two decades of public attack the best known break on ' +
      'the full cipher is barely better than brute force.' +
      (cbc
        ? ' Cipher block chaining feeds each ciphertext block into the next block\'s input, so identical plaintext blocks no longer produce identical ciphertext. It needs a fresh, unpredictable initialisation vector for every message, and on its own it still provides no protection against tampering.'
        : ' Electronic codebook mode encrypts every block in isolation, so identical plaintext blocks give identical ciphertext. The structure of an image encrypted this way remains plainly visible — it is the standard demonstration of why ECB must not be used for real data. It is offered here to be recognised, not used.'),
    keySpec: cbc
      ? [{ name: 'key', kind: 'hex', bytes: 16, label: 'Key (128-bit)' }, { name: 'iv', kind: 'hex', bytes: 16, label: 'Initialisation vector' }]
      : [{ name: 'key', kind: 'hex', bytes: 16, label: 'Key (128-bit)' }],
    normalise: ascii,
    encode(pt, key) {
      const rk = expandKey(hexToBytes(ks(key, 'key').padEnd(32, '0').slice(0, 32)));
      const iv = cbc ? hexToBytes(ks(key, 'iv').padEnd(32, '0').slice(0, 32)) : new Uint8Array(16);
      const data = pkcs7(toBytes(ascii(pt)), 16);
      const out = new Uint8Array(data.length);
      let prev = iv;
      for (let i = 0; i < data.length; i += 16) {
        let block = data.slice(i, i + 16);
        if (cbc) block = block.map((b, j) => b ^ prev[j]);
        const enc = aesEncryptBlock(block, rk);
        out.set(enc, i);
        prev = enc;
      }
      return {
        output: bytesToHex(out),
        steps: [
          step('Pad to 16 bytes', 'PKCS#7.', `${toBytes(ascii(pt)).length} → ${data.length} bytes`),
          step('Expand the key', 'Eleven round keys are derived from the 128-bit key.', `round 0: ${bytesToHex(rk[0])}\nround 10: ${bytesToHex(rk[10])}`),
          cbc
            ? step('Chain each block', 'XOR with the previous ciphertext block, or the IV for the first.', `IV: ${bytesToHex(iv)}`)
            : step('Encrypt each block independently', 'No chaining — that is the weakness.', ''),
          step('Ten rounds per block', 'SubBytes, ShiftRows, MixColumns, AddRoundKey. The final round omits MixColumns.', ''),
          step('Result in hex', '', bytesToHex(out)),
        ],
      };
    },
    decode(ct, key) {
      const rk = expandKey(hexToBytes(ks(key, 'key').padEnd(32, '0').slice(0, 32)));
      const iv = cbc ? hexToBytes(ks(key, 'iv').padEnd(32, '0').slice(0, 32)) : new Uint8Array(16);
      const data = hexToBytes(ct);
      const out = new Uint8Array(data.length);
      let prev = iv;
      for (let i = 0; i < data.length; i += 16) {
        const block = data.slice(i, i + 16);
        let dec = aesDecryptBlock(block, rk);
        if (cbc) dec = dec.map((b, j) => b ^ prev[j]);
        out.set(dec, i);
        prev = block;
      }
      const plain = fromBytes(unpad(out));
      return {
        output: plain,
        steps: [
          step('Expand the key', 'Same eleven round keys.', ''),
          step('Run the rounds in reverse', 'InvShiftRows, InvSubBytes, AddRoundKey, InvMixColumns.', ''),
          cbc ? step('Unchain', 'XOR each decrypted block with the previous ciphertext block.', '') : step('Decrypt independently', 'Each block stands alone.', ''),
          step('Strip the padding', 'The final byte gives the padding length.', plain),
        ],
      };
    },
  };
}

export const MODERN_SYMMETRIC: Technique[] = [
  xorSingle, xorRepeating, rc4Cipher, chacha, tea,
  aesMode('aes-128-ecb', 'AES-128-ECB', false),
  aesMode('aes-128-cbc', 'AES-128-CBC', true),
];
