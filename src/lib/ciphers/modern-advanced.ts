import type { Technique } from './types';
import { toBytes, bytesToHex, modPow, modInv, gcd, step, ks, kn } from './utils';

const ascii = (s: string) => s.replace(/[^\x20-\x7e]/g, '');

/* ================================= hashes ================================= */

function sha256(bytes: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = bytes.length;
  const withPad = new Uint8Array((((len + 8) >> 6) + 1) * 64);
  withPad.set(bytes);
  withPad[len] = 0x80;
  const bitLen = len * 8;
  new DataView(withPad.buffer).setUint32(withPad.length - 4, bitLen >>> 0, false);
  new DataView(withPad.buffer).setUint32(withPad.length - 8, Math.floor(bitLen / 4294967296), false);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (withPad[off + i * 4] << 24) | (withPad[off + i * 4 + 1] << 16) |
        (withPad[off + i * 4 + 2] << 8) | withPad[off + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h = h.map((v, i) => (v + [a, b, c, d, e, f, g, hh][i]) >>> 0);
  }
  const out = new Uint8Array(32);
  h.forEach((v, i) => new DataView(out.buffer).setUint32(i * 4, v, false));
  return out;
}

function sha1(bytes: Uint8Array): Uint8Array {
  let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const len = bytes.length;
  const withPad = new Uint8Array((((len + 8) >> 6) + 1) * 64);
  withPad.set(bytes);
  withPad[len] = 0x80;
  const bitLen = len * 8;
  new DataView(withPad.buffer).setUint32(withPad.length - 4, bitLen >>> 0, false);
  new DataView(withPad.buffer).setUint32(withPad.length - 8, Math.floor(bitLen / 4294967296), false);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  const w = new Uint32Array(80);
  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (withPad[off + i * 4] << 24) | (withPad[off + i * 4 + 1] << 16) |
        (withPad[off + i * 4 + 2] << 8) | withPad[off + i * 4 + 3];
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
    }
    h = h.map((v, i) => (v + [a, b, c, d, e][i]) >>> 0);
  }
  const out = new Uint8Array(20);
  h.forEach((v, i) => new DataView(out.buffer).setUint32(i * 4, v, false));
  return out;
}

function md5(bytes: Uint8Array): Uint8Array {
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const len = bytes.length;
  const withPad = new Uint8Array((((len + 8) >> 6) + 1) * 64);
  withPad.set(bytes);
  withPad[len] = 0x80;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 8, (len * 8) >>> 0, true);
  dv.setUint32(withPad.length - 4, Math.floor((len * 8) / 4294967296), true);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  for (let off = 0; off < withPad.length; off += 64) {
    const M = Array.from({ length: 16 }, (_, i) => dv.getUint32(off + i * 4, true));
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => odv.setUint32(i * 4, v, true));
  return out;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1, b = 0;
  for (const byte of bytes) { a = (a + byte) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

function fnv1a(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

function crc16(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function hashTechnique(opts: {
  id: string; name: string; era: string; difficulty: 2 | 3 | 4;
  summary: string; theory: string;
  compute: (b: Uint8Array) => string;
  detail: string;
}): Technique {
  return {
    id: opts.id,
    name: opts.name,
    family: 'hash',
    difficulty: opts.difficulty,
    era: opts.era,
    summary: opts.summary,
    theory: opts.theory,
    oneWay: true,
    keySpec: [{ name: 'none', kind: 'none', label: 'No key' }],
    normalise: ascii,
    encode(pt) {
      const t = ascii(pt);
      const digest = opts.compute(toBytes(t));
      return {
        output: digest,
        steps: [
          step('Take the input bytes', 'The digest depends on every one of them.', `${toBytes(t).length} bytes`),
          step('Pad and process', opts.detail, ''),
          step('Digest', 'Fixed length regardless of input size. Changing a single input bit changes roughly half the output bits.', digest),
        ],
      };
    },
    decode() {
      return {
        output: '',
        steps: [
          step('Not invertible', 'A hash discards information by design — many inputs map to the same digest, so there is nothing to invert.',
            'The only attacks are searching (dictionary, brute force, rainbow tables) or finding a collision. Neither recovers the original input in general.'),
        ],
      };
    },
  };
}

const HASHES: Technique[] = [
  hashTechnique({
    id: 'sha256', name: 'SHA-256', era: '2001', difficulty: 4,
    summary: 'The current workhorse cryptographic hash, producing a 256-bit digest.',
    theory:
      'Designed by the NSA and published by NIST, SHA-256 processes the message in 512-bit blocks through ' +
      '64 rounds of a compression function built on rotations, shifts and modular addition. No practical ' +
      'collision or preimage attack is known. It underpins Bitcoin, code signing, certificate chains and ' +
      'essentially every integrity check in modern computing. Being fast is a liability for one specific ' +
      'job — password storage — which is why bcrypt, scrypt and Argon2 exist instead.',
    compute: (b) => bytesToHex(sha256(b)),
    detail: 'Append a 1 bit, pad with zeros, append the 64-bit length, then run 64 rounds over each 512-bit block.',
  }),
  hashTechnique({
    id: 'sha1', name: 'SHA-1', era: '1995', difficulty: 3,
    summary: 'A 160-bit hash, now broken for collision resistance.',
    theory:
      'SHA-1 held up for two decades before theory caught up with it. Google and CWI demonstrated the first ' +
      'practical collision in 2017 with the SHAttered attack, producing two different PDFs with the same ' +
      'digest, and the 2020 SHAmbles attack made chosen-prefix collisions affordable. It is dead for ' +
      'signatures and certificates. It survives in Git object naming, where collision resistance was never ' +
      'the property being relied on — though Git has been migrating away regardless.',
    compute: (b) => bytesToHex(sha1(b)),
    detail: '80 rounds over each 512-bit block, using four different round functions in blocks of twenty.',
  }),
  hashTechnique({
    id: 'md5', name: 'MD5', era: '1992', difficulty: 3,
    summary: 'A 128-bit hash, thoroughly broken and still widely encountered.',
    theory:
      'Collisions in MD5 can be produced in seconds on ordinary hardware. Wang and Yu broke it in 2004, and ' +
      'by 2008 researchers had used chosen-prefix collisions to forge a certificate authority certificate; ' +
      'the Flame malware used the same class of attack against Windows Update in 2012. It remains ' +
      'acceptable only as a non-adversarial checksum — detecting accidental corruption — and must never be ' +
      'used where someone might deliberately construct an input.',
    compute: (b) => bytesToHex(md5(b)),
    detail: '64 rounds over each 512-bit block, with constants derived from the sine function.',
  }),
  hashTechnique({
    id: 'crc32', name: 'CRC-32', era: '1961', difficulty: 2,
    summary: 'A 32-bit checksum built from polynomial division, not a cryptographic hash.',
    theory:
      'CRC-32 treats the message as a polynomial over GF(2) and takes the remainder after division by a ' +
      'fixed generator. It is excellent at what it was designed for — catching burst errors on a noisy link ' +
      'or in a corrupted file — and is used by Ethernet, PNG and ZIP. It offers no security whatsoever: ' +
      'the function is linear, so anyone can modify a message and adjust it to keep the same checksum.',
    compute: (b) => crc32(b).toString(16).padStart(8, '0'),
    detail: 'Shift each byte through the register, conditionally XOR-ing with the reversed polynomial 0xEDB88320.',
  }),
  hashTechnique({
    id: 'crc16', name: 'CRC-16 (CCITT)', era: '1970s', difficulty: 2,
    summary: 'A 16-bit polynomial checksum used in serial protocols.',
    theory:
      'The same polynomial-division idea as CRC-32 with a shorter register and the generator 0x1021. It ' +
      'appears in XMODEM, Bluetooth and countless embedded protocols where sixteen bits of error detection ' +
      'is enough and every byte of overhead counts.',
    compute: (b) => crc16(b).toString(16).padStart(4, '0'),
    detail: 'Sixteen-bit register, MSB-first, generator polynomial 0x1021.',
  }),
  hashTechnique({
    id: 'adler32', name: 'Adler-32', era: '1995', difficulty: 2,
    summary: 'Two running sums combined into a 32-bit checksum.',
    theory:
      'Mark Adler designed it for zlib as a faster alternative to CRC-32. One accumulator sums the bytes ' +
      'and the other sums the accumulator, both modulo 65521. It computes quickly but detects errors less ' +
      'reliably than CRC-32, and it is notably weak on short inputs where the sums barely have room to move.',
    compute: (b) => adler32(b).toString(16).padStart(8, '0'),
    detail: 'a = 1 + sum of bytes; b = sum of the running a values; both taken modulo 65521.',
  }),
  hashTechnique({
    id: 'fnv1a', name: 'FNV-1a', era: '1991', difficulty: 2,
    summary: 'A fast non-cryptographic hash used for lookup tables.',
    theory:
      'Fowler, Noll and Vo built it for hash tables: XOR each byte into the accumulator, then multiply by a ' +
      'large prime. It scatters keys well and costs almost nothing to compute. It is trivially reversible ' +
      'and trivially collided on purpose, which made hash-flooding attacks against web frameworks possible ' +
      'until they switched to keyed hashes like SipHash.',
    compute: (b) => fnv1a(b).toString(16).padStart(8, '0'),
    detail: 'For each byte: h ^= byte, then h *= 16777619, all modulo 2³².',
  }),
];

/* =========================== public-key and modular ======================= */

/**
 * Every triple here satisfies gcd(e, (p−1)(q−1)) = 1, so the private exponent
 * always exists. `71,89,7` looks reasonable but is not: (70)(88) = 6160 is
 * divisible by 7, which leaves e with no inverse.
 */
const RSA_KEYS = ['61,53,17', '71,89,13', '107,113,5', '137,131,11', '167,173,13'];

const rsaTextbook: Technique = {
  id: 'rsa-textbook',
  name: 'RSA (textbook)',
  family: 'asymmetric',
  difficulty: 5,
  era: '1977',
  summary: 'Encryption by raising each value to a public exponent modulo a product of two primes.',
  theory:
    'Rivest, Shamir and Adleman built the first practical public-key cryptosystem. Pick two primes p and q, ' +
    'let n = pq, and choose e coprime with (p−1)(q−1). The private exponent d is the modular inverse of e. ' +
    'Encryption is c = mᵉ mod n and decryption m = c^d mod n; the two undo each other by Euler\'s theorem. ' +
    'Security rests on factoring n being hard, which it is for numbers of realistic size. What is shown ' +
    'here is textbook RSA with tiny primes: it is deterministic, so identical characters give identical ' +
    'ciphertext, and enciphering character by character leaks the message structure completely. Real RSA ' +
    'pads with OAEP and encrypts a symmetric key rather than the message itself.',
  keySpec: [{ name: 'pqe', kind: 'choice', options: RSA_KEYS, label: 'p, q, e' }],
  normalise: ascii,
  encode(pt, key) {
    const [p, q, e] = ks(key, 'pqe', RSA_KEYS[0]).split(',').map(Number);
    const n = BigInt(p * q);
    const t = ascii(pt);
    const nums = t.split('').map((c) => modPow(BigInt(c.charCodeAt(0)), BigInt(e), n));
    return {
      output: nums.join(' '),
      steps: [
        step('Choose the primes', `p = ${p}, q = ${q}.`, `n = p × q = ${p * q}\nφ(n) = (p−1)(q−1) = ${(p - 1) * (q - 1)}`),
        step('Check the public exponent', `gcd(${e}, ${(p - 1) * (q - 1)}) must be 1.`, `gcd = ${gcd(e, (p - 1) * (q - 1))}`),
        step('Encrypt each character', `c = m^${e} mod ${p * q}, where m is the ASCII code.`,
          t.slice(0, 5).split('').map((c) => `${c} (${c.charCodeAt(0)}) → ${modPow(BigInt(c.charCodeAt(0)), BigInt(e), n)}`).join('\n')),
        step('Result', 'Deterministic, so repeated characters are visible as repeated numbers — a real weakness.', nums.join(' ')),
      ],
    };
  },
  decode(ct, key) {
    const [p, q, e] = ks(key, 'pqe', RSA_KEYS[0]).split(',').map(Number);
    const n = BigInt(p * q);
    const phi = (p - 1) * (q - 1);
    const d = modInv(e, phi);
    if (d === null) return { output: '', steps: [step('Invalid key', 'e is not invertible modulo φ(n).')] };
    const nums = (ct.match(/\d+/g) ?? []).map((x) => BigInt(x));
    const out = nums.map((c) => String.fromCharCode(Number(modPow(c, BigInt(d), n)))).join('');
    return {
      output: out,
      steps: [
        step('Factor the modulus', `Knowing p and q is the private information. n = ${p * q} = ${p} × ${q}.`, ''),
        step('Compute the private exponent', `Solve ${e}·d ≡ 1 (mod ${phi}).`, `d = ${d}`),
        step('Decrypt each value', `m = c^${d} mod ${p * q}.`, out),
      ],
    };
  },
};

const PH_KEYS = ['2579,7', '3119,11', '4079,13', '5087,17'];

const pohligHellman: Technique = {
  id: 'exponentiation-cipher',
  name: 'Exponentiation cipher (Pohlig-Hellman)',
  family: 'asymmetric',
  difficulty: 5,
  era: '1976',
  summary: 'Each value is raised to a secret exponent modulo a prime.',
  theory:
    'Pohlig and Hellman proposed enciphering as c = mᵉ mod p for a prime p, with decryption m = c^d mod p ' +
    'where d is the inverse of e modulo p−1. Unlike RSA both exponents are secret, so this is a symmetric ' +
    'cipher despite the number-theoretic machinery — it predates RSA and clearly influenced it. Its ' +
    'security rests on the discrete logarithm problem rather than factoring.',
  keySpec: [{ name: 'pe', kind: 'choice', options: PH_KEYS, label: 'prime p, exponent e' }],
  normalise: ascii,
  encode(pt, key) {
    const [p, e] = ks(key, 'pe', PH_KEYS[0]).split(',').map(Number);
    const t = ascii(pt);
    const nums = t.split('').map((c) => modPow(BigInt(c.charCodeAt(0)), BigInt(e), BigInt(p)));
    return {
      output: nums.join(' '),
      steps: [
        step('Choose the prime and exponent', `p = ${p}, e = ${e}.`, `gcd(e, p−1) = ${gcd(e, p - 1)} — must be 1 for the inverse to exist.`),
        step('Raise each character', `c = m^${e} mod ${p}.`,
          t.slice(0, 5).split('').map((c) => `${c} (${c.charCodeAt(0)}) → ${modPow(BigInt(c.charCodeAt(0)), BigInt(e), BigInt(p))}`).join('\n')),
        step('Result', 'Both exponents stay secret, so this is symmetric.', nums.join(' ')),
      ],
    };
  },
  decode(ct, key) {
    const [p, e] = ks(key, 'pe', PH_KEYS[0]).split(',').map(Number);
    const d = modInv(e, p - 1);
    if (d === null) return { output: '', steps: [step('Invalid key', 'e is not invertible modulo p−1.')] };
    const nums = (ct.match(/\d+/g) ?? []).map((x) => BigInt(x));
    const out = nums.map((c) => String.fromCharCode(Number(modPow(c, BigInt(d), BigInt(p))))).join('');
    return {
      output: out,
      steps: [
        step('Invert the exponent', `Solve ${e}·d ≡ 1 (mod ${p - 1}).`, `d = ${d}`),
        step('Raise each value again', `m = c^${d} mod ${p}.`, out),
      ],
    };
  },
};

const EG_KEYS = ['2579,2,765', '3119,7,412', '4079,3,901'];

const elgamal: Technique = {
  id: 'elgamal',
  name: 'ElGamal',
  family: 'asymmetric',
  difficulty: 5,
  era: '1985',
  summary: 'Public-key encryption whose security rests on the discrete logarithm problem.',
  theory:
    'Taher ElGamal built an encryption scheme on top of Diffie-Hellman key agreement. The private key is x ' +
    'and the public key is y = gˣ mod p. To encrypt, pick an ephemeral k and send the pair (gᵏ, m·yᵏ). The ' +
    'recipient recovers m by dividing by (gᵏ)ˣ, which only they can compute. Ciphertext is twice the size ' +
    'of the plaintext, and reusing k across messages is catastrophic — the same class of mistake that ' +
    'exposed Sony\'s PlayStation 3 signing key. DSA is a direct descendant of this construction. Here k is ' +
    'derived from the character position so the example reproduces exactly; a real implementation must draw ' +
    'it fresh at random every time.',
  keySpec: [{ name: 'pgx', kind: 'choice', options: EG_KEYS, label: 'prime p, generator g, private x' }],
  normalise: ascii,
  encode(pt, key) {
    const [p, g, x] = ks(key, 'pgx', EG_KEYS[0]).split(',').map(Number);
    const P = BigInt(p), G = BigInt(g), X = BigInt(x);
    const y = modPow(G, X, P);
    const t = ascii(pt);
    const pairs = t.split('').map((c, i) => {
      const k = BigInt(i + 3);
      const c1 = modPow(G, k, P);
      const c2 = (BigInt(c.charCodeAt(0)) * modPow(y, k, P)) % P;
      return `${c1}:${c2}`;
    });
    return {
      output: pairs.join(' '),
      steps: [
        step('Set up the keys', `p = ${p}, g = ${g}, private x = ${x}.`, `public y = g^x mod p = ${y}`),
        step('Pick an ephemeral value per character', 'Derived from the position here so the result is reproducible; random in practice.', ''),
        step('Encrypt', 'Send the pair (g^k mod p, m · y^k mod p).', pairs.slice(0, 4).join('\n')),
        step('Result', 'Each character becomes two numbers — the ciphertext doubles in size.', pairs.join(' ')),
      ],
    };
  },
  decode(ct, key) {
    const [p, , x] = ks(key, 'pgx', EG_KEYS[0]).split(',').map(Number);
    const P = BigInt(p), X = BigInt(x);
    const out = ct.trim().split(/\s+/).filter(Boolean).map((pair) => {
      const [a, b] = pair.split(':').map((v) => BigInt(v));
      const s = modPow(a, X, P);
      const sInv = modPow(s, P - 2n, P); // Fermat's little theorem, p is prime
      return String.fromCharCode(Number((b * sInv) % P));
    }).join('');
    return {
      output: out,
      steps: [
        step('Recompute the shared value', 'Raise the first component to the private exponent: s = c₁ˣ mod p.', ''),
        step('Invert it', 'Since p is prime, s⁻¹ = s^(p−2) mod p by Fermat\'s little theorem.', ''),
        step('Recover each character', 'm = c₂ · s⁻¹ mod p.', out),
      ],
    };
  },
};

const DH_KEYS = ['2579,2,765,853', '3119,7,412,977', '4079,3,901,1123'];

const diffieHellman: Technique = {
  id: 'diffie-hellman',
  name: 'Diffie-Hellman keyed stream',
  family: 'asymmetric',
  difficulty: 4,
  era: '1976',
  summary: 'Two parties derive a shared secret over a public channel, then use it as a keystream.',
  theory:
    'Diffie and Hellman showed that two people can agree on a secret while an eavesdropper watches every ' +
    'message. Both sides publish gᵃ and gᵇ modulo a prime; each raises the other\'s value to their own ' +
    'exponent and arrives at g^(ab), which the observer cannot compute without solving a discrete ' +
    'logarithm. This was the paper that made public-key cryptography possible. Key agreement alone ' +
    'encrypts nothing, so here the shared value seeds an additive keystream — that second half is a ' +
    'teaching device, not part of the protocol. Plain Diffie-Hellman is also unauthenticated, which leaves ' +
    'it open to an active attacker sitting in the middle; real deployments sign the exchange.',
  keySpec: [{ name: 'pgab', kind: 'choice', options: DH_KEYS, label: 'prime p, generator g, secrets a and b' }],
  normalise: ascii,
  encode(pt, key) {
    const [p, g, a, b] = ks(key, 'pgab', DH_KEYS[0]).split(',').map(Number);
    const P = BigInt(p), G = BigInt(g);
    const A = modPow(G, BigInt(a), P);
    const B = modPow(G, BigInt(b), P);
    const shared = modPow(B, BigInt(a), P);
    const streamSeed = shared.toString();
    const t = ascii(pt);
    const out = t.split('').map((c, i) =>
      String.fromCharCode(32 + ((c.charCodeAt(0) - 32 + Number(streamSeed[i % streamSeed.length])) % 95))).join('');
    return {
      output: out,
      steps: [
        step('Publish the public values', `A = g^a mod p = ${A}, B = g^b mod p = ${B}.`, 'Both of these travel in the clear.'),
        step('Each side computes the shared secret', `B^a mod p = A^b mod p = ${shared}.`,
          `An eavesdropper sees ${A} and ${B} but would have to solve a discrete logarithm to get ${shared}.`),
        step('Derive a keystream', 'The digits of the shared value are cycled as additive shifts over printable ASCII.', streamSeed),
        step('Result', 'The agreement is the real cryptography; this last step is only to make it visible.', out),
      ],
    };
  },
  decode(ct, key) {
    const [p, g, a, b] = ks(key, 'pgab', DH_KEYS[0]).split(',').map(Number);
    const P = BigInt(p), G = BigInt(g);
    const shared = modPow(modPow(G, BigInt(b), P), BigInt(a), P);
    const seed = shared.toString();
    const out = ct.split('').map((c, i) =>
      String.fromCharCode(32 + (((c.charCodeAt(0) - 32) - Number(seed[i % seed.length]) + 95) % 95))).join('');
    return {
      output: out,
      steps: [
        step('Recompute the shared secret', `Either private exponent gets there: ${shared}.`, ''),
        step('Subtract the keystream', 'Reverses the additive shift.', out),
      ],
    };
  },
};

export const MODERN_ADVANCED: Technique[] = [
  ...HASHES, rsaTextbook, pohligHellman, elgamal, diffieHellman,
];
