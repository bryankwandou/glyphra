import type { Technique, Family, Difficulty } from './types';
import { SUBSTITUTION } from './substitution';
import { POLYALPHABETIC } from './polyalphabetic';
import { POLYGRAPHIC } from './polygraphic';
import { TRANSPOSITION } from './transposition';
import { FRACTIONATION } from './fractionation';
import { ENCODINGS } from './encodings';
import { MODERN_SYMMETRIC } from './modern-symmetric';
import { MODERN_ADVANCED } from './modern-advanced';
import { EXTRAS } from './extras';

export * from './types';
export * from './utils';

/** Every technique in the catalogue, in no particular order. */
export const TECHNIQUES: Technique[] = [
  ...SUBSTITUTION,
  ...POLYALPHABETIC,
  ...POLYGRAPHIC,
  ...TRANSPOSITION,
  ...FRACTIONATION,
  ...ENCODINGS,
  ...MODERN_SYMMETRIC,
  ...MODERN_ADVANCED,
  ...EXTRAS,
];

const byId = new Map(TECHNIQUES.map((t) => [t.id, t]));

export function getTechnique(id: string): Technique | undefined {
  return byId.get(id);
}

export function techniquesByFamily(family: Family): Technique[] {
  return TECHNIQUES.filter((t) => t.family === family);
}

export function techniquesByDifficulty(d: Difficulty): Technique[] {
  return TECHNIQUES.filter((t) => t.difficulty === d);
}

/** Reversible techniques only — hashes cannot anchor a decryption question. */
export const REVERSIBLE = TECHNIQUES.filter((t) => !t.oneWay);

export const CATALOGUE_SIZE = TECHNIQUES.length;

/** Guards against a duplicate id silently shadowing a technique in the map. */
export function findDuplicateIds(): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const t of TECHNIQUES) {
    if (seen.has(t.id)) dupes.push(t.id);
    seen.add(t.id);
  }
  return dupes;
}
