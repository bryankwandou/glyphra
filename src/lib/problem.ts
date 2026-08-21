import { decodeProblemCode, encodeProblemCode, type ProblemConfig } from './problem-code';
import { generateChallenge, gradeAnswer } from './generator';

export interface BuiltProblem {
  code: string;
  techniqueId: string;
  techniqueName: string;
  family: string;
  difficulty: number;
  era: string;
  summary: string;
  theory: string;
  prompt: string;
  ciphertext: string;
  keyFields: { label: string; disclosed: boolean; value?: string }[];
  plaintextLength: number;
  disclose: boolean;
}

/**
 * Rebuild a problem from its code.
 *
 * The technique comes out of the code rather than being chosen here, which is
 * the property that makes the claim checkable: decode the code yourself and you
 * get the same technique name the page prints. Nothing is stored, so the
 * problem is identical on any machine that has the code.
 */
export function buildProblem(input: string): { public: BuiltProblem; answer: string } | null {
  const config = decodeProblemCode(input);
  if (!config) return null;

  const canonical = encodeProblemCode(config);
  if (!canonical) return null;

  const { publicPart, solution } = generateChallenge({
    techniqueIds: [config.techniqueId],
    seed: `problem:${config.seed}`,
    discloseKey: config.disclose,
  });

  // The generator honours a named technique outright, but this is the one place
  // where a mismatch would make the code itself a lie, so it is checked rather
  // than assumed.
  if (publicPart.techniqueId !== config.techniqueId) return null;

  return {
    public: {
      code: canonical,
      techniqueId: publicPart.techniqueId,
      techniqueName: publicPart.techniqueName,
      family: publicPart.family,
      difficulty: publicPart.difficulty,
      era: publicPart.era,
      summary: publicPart.summary,
      theory: publicPart.theory,
      prompt: publicPart.prompt,
      ciphertext: publicPart.ciphertext,
      keyFields: publicPart.keyFields,
      plaintextLength: publicPart.plaintextLength,
      disclose: config.disclose,
    },
    answer: solution.plaintext,
  };
}

/**
 * Marked by the same function the quiz uses.
 *
 * Not a second implementation that happens to agree today. A separate marker
 * would drift, and the first sign of the drift would be a student marked wrong
 * here for an answer the quiz accepts.
 */
export function markProblem(
  code: string,
  submitted: string,
): { correct: boolean; proximity: number } | null {
  const built = buildProblem(code);
  if (!built) return null;
  const graded = gradeAnswer(submitted, built.answer);
  return { correct: graded.correct, proximity: graded.similarity };
}

export type { ProblemConfig };
