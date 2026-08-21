import type { Difficulty } from './ciphers/types';

/**
 * Join codes.
 *
 * Every quiz platform hands out a short code that participants type in, and
 * every one of them resolves that code against a database row. This has no
 * database, so the code itself carries the whole configuration: seed, question
 * count, difficulty band and time limit are packed into forty bits and rendered
 * as eight characters.
 *
 * The generator is deterministic, so two people typing the same code
 * independently regenerate the identical quiz without anything being stored.
 * That is the same property that lets a lost assessment paper be rebuilt from
 * its seed, reused here.
 *
 * What this buys: a link that cannot expire because there is nothing to expire,
 * nothing to back up, and no row to leak. What it costs: the code cannot be
 * revoked, and a quiz cannot be edited after sharing — a new code has to go
 * out. For a practice quiz shared with a class that is the right trade. For a
 * high-stakes exam it is not, and that case wants the assessment papers.
 *
 * Layout, 40 bits:
 *   seed      20   the value the generator is seeded from
 *   count      4   questions per quiz, stored as count-1, so 1..16
 *   dLow       3   lowest difficulty, 1..5
 *   dHigh      3   highest difficulty, 1..5
 *   minutes    6   time limit, 0 means untimed, up to 63
 *   checksum   4   catches a mistyped character before it becomes "quiz not found"
 */

/**
 * Crockford base32 without I, L, O and U. The first three are dropped because
 * they are misread as 1 and 0 when someone copies a code off a projector; U is
 * dropped because its absence makes accidental words far less likely.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export interface QuizConfig {
  seed: number;
  questions: number;
  difficultyLow: Difficulty;
  difficultyHigh: Difficulty;
  /** Minutes for the whole quiz. Zero means no limit. */
  minutes: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Four-bit fold of the payload. Cheap, and enough to reject a single typo. */
function checksum(payload: bigint): number {
  let acc = 0n;
  let rest = payload;
  while (rest > 0n) {
    acc ^= rest & 0xfn;
    rest >>= 4n;
  }
  return Number(acc & 0xfn);
}

export function encodeQuizCode(config: QuizConfig): string {
  const seed = clamp(config.seed, 0, 0xfffff);
  const count = clamp(config.questions, 1, 16) - 1;
  const lo = clamp(config.difficultyLow, 1, 5);
  const hi = clamp(Math.max(config.difficultyHigh, config.difficultyLow), 1, 5);
  const minutes = clamp(config.minutes, 0, 63);

  let payload = 0n;
  payload = (payload << 20n) | BigInt(seed);
  payload = (payload << 4n) | BigInt(count);
  payload = (payload << 3n) | BigInt(lo);
  payload = (payload << 3n) | BigInt(hi);
  payload = (payload << 6n) | BigInt(minutes);

  const full = (payload << 4n) | BigInt(checksum(payload));

  // Most significant group first, appended in order. Walking down from the top
  // while prepending would emit the digits reversed, which decodes to a
  // different quiz rather than to an error — the checksum still passes because
  // the reversed string is a valid code for some other configuration.
  let out = '';
  for (let i = 7; i >= 0; i--) {
    out += ALPHABET[Number((full >> BigInt(i * 5)) & 0x1fn)];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * Accepts the code in any shape a person might type it: with or without the
 * hyphen, in either case, and with the substitutions people habitually make for
 * the omitted letters.
 */
export function decodeQuizCode(input: string): QuizConfig | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

  if (cleaned.length !== 8) return null;

  let full = 0n;
  for (const ch of cleaned) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    full = (full << 5n) | BigInt(v);
  }

  const payload = full >> 4n;
  if (checksum(payload) !== Number(full & 0xfn)) return null;

  const minutes = Number(payload & 0x3fn);
  const hi = Number((payload >> 6n) & 0x7n);
  const lo = Number((payload >> 9n) & 0x7n);
  const count = Number((payload >> 12n) & 0xfn) + 1;
  const seed = Number(payload >> 16n);

  if (lo < 1 || lo > 5 || hi < 1 || hi > 5 || hi < lo) return null;

  return {
    seed,
    questions: count,
    difficultyLow: lo as Difficulty,
    difficultyHigh: hi as Difficulty,
    minutes,
  };
}

/** The band as the generator wants it, expanded from the two bounds. */
export function difficultyBand(config: QuizConfig): Difficulty[] {
  const band: Difficulty[] = [];
  for (let d = config.difficultyLow; d <= config.difficultyHigh; d++) {
    band.push(d as Difficulty);
  }
  return band;
}

export function randomQuizSeed(): number {
  return Math.floor(Math.random() * 0x100000);
}

/**
 * The one spelling of a code that everything else keys on.
 *
 * `decodeQuizCode` has always been forgiving about spacing, case and the O/0
 * and I/1 substitutions people make, which is right — a code read off a
 * projector should still work. What was missing is the other half: turning all
 * those spellings back into a single canonical one.
 *
 * Without it the forgiveness became a hole. Access rules are stored against a
 * code, so `qps9-6a55` and `QPS96A55` looked up nothing while `QPS9-6A55` found
 * the row — the same quiz, but a restricted one served freely to anybody who
 * typed it in lower case. The quiz itself was never wrong, because the seed
 * decodes identically either way; only the rules attached to it went missing.
 *
 * Returns null for anything that is not a real code, so callers get one check
 * rather than two.
 */
export function canonicalQuizCode(input: string): string | null {
  const config = decodeQuizCode(input);
  if (!config) return null;
  return encodeQuizCode(config);
}
