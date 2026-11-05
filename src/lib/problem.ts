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
export function buildProblem(
  input: string,
  locale: 'en' | 'id' = 'en',
  chosenAnswer?: string | null,
): { public: BuiltProblem; answer: string } | null {
  const config = decodeProblemCode(input);
  if (!config) return null;

  const canonical = encodeProblemCode(config);
  if (!canonical) return null;

  const { publicPart, solution } = generateChallenge({
    techniqueIds: [config.techniqueId],
    seed: `problem:${config.seed}`,
    discloseKey: config.disclose,
    locale,
    plaintext: chosenAnswer ?? undefined,
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
      // Counted from the instructor's word, because a method's padding (Playfair
      // turns TES into TESX) is not something the student is being asked to type.
      plaintextLength: chosenAnswer ? chosenAnswer.replace(/\s/g, '').length : publicPart.plaintextLength,
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
  chosenAnswer?: string | null,
): { correct: boolean; proximity: number } | null {
  const built = buildProblem(code, 'en', chosenAnswer);
  if (!built) return null;
  const graded = gradeAnswer(submitted, built.answer);
  // The instructor's own spelling counts too. Playfair folds J into I, so a word
  // with a J deciphers with an I in it, and either form is the right answer.
  const typed = chosenAnswer ? gradeAnswer(submitted, chosenAnswer).correct : false;
  return { correct: graded.correct || typed, proximity: graded.similarity };
}

/**
 * The instructor's answer in the one form everything keys on, or null if it
 * cannot be used. Letters and spaces only: the methods work on letters, so a
 * digit or an accent would be dropped and the student could never type it back.
 */
export function cleanChosenAnswer(input: string): string | null {
  const text = input.trim().replace(/\s+/g, ' ').toUpperCase();
  return /^[A-Z ]{1,200}$/.test(text) ? text : null;
}

export type { ProblemConfig };
