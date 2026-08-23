import { generateChallenge, gradeAnswer } from './generator';
import type { PublicChallenge } from './generator';
import { decodeQuizCode, difficultyBand, type QuizConfig, canonicalQuizCode } from './quiz-code';
import type { Difficulty } from './ciphers/types';

/**
 * A shared quiz, rebuilt from its join code.
 *
 * Nothing is stored. Two people typing the same code independently regenerate
 * the identical questions, because the generator is deterministic and the code
 * carries the seed. That is what makes a share link work without a database
 * behind it.
 */

export interface QuizQuestion {
  number: number;
  challenge: PublicChallenge;
}

export interface Quiz {
  code: string;
  config: QuizConfig;
  questions: QuizQuestion[];
  /** Seconds for the whole attempt, or null when untimed. */
  timeLimitSeconds: number | null;
}

/**
 * Spreads the band across the question slots and holds it there, for the same
 * reason the assessment papers do: two people sitting the same quiz should meet
 * the same difficulties in the same order, or their scores are not comparable.
 * Here it also means the quiz opens gently rather than leading with the hardest
 * thing in the band.
 */
function slotDifficulty(config: QuizConfig, index: number): Difficulty[] {
  const band = difficultyBand(config);
  return [band[index % band.length]];
}

/**
 * Builds questions and answers together, in one pass.
 *
 * These were briefly two functions running the same retry loop side by side.
 * That is a bad shape for this particular job: the moment the two loops drift,
 * the quiz is marked against answers belonging to different questions, every
 * participant is scored wrongly, and nothing anywhere reports an error. One
 * pass, one source of truth.
 */
function assemble(code: string, locale: 'en' | 'id' = 'en'): { canonical: string; config: QuizConfig; items: { question: QuizQuestion; answer: string }[] } | null {
  const config = decodeQuizCode(code);
  if (!config) return null;

  // Every caller keys something off this — the policy row, the storage key in
  // the browser, the row in the gradebook. It has to be the same string no
  // matter how the code was typed.
  const canonical = canonicalQuizCode(code);
  if (!canonical) return null;

  const items: { question: QuizQuestion; answer: string }[] = [];
  const used = new Set<string>();

  for (let n = 1; n <= config.questions; n++) {
    let picked: { publicPart: PublicChallenge; plaintext: string } | null = null;

    // Prefer a technique not already on this quiz; a few attempts is plenty,
    // and repeating beats failing to produce the question at all.
    for (let attempt = 0; attempt < 12; attempt++) {
      const { publicPart, solution } = generateChallenge({
        difficulties: slotDifficulty(config, n - 1),
        seed: `quiz:${config.seed}:q${n}:a${attempt}`,
      });
      picked = { publicPart, plaintext: solution.plaintext };
      if (!used.has(publicPart.techniqueId)) break;
    }

    if (!picked) continue;
    used.add(picked.publicPart.techniqueId);
    items.push({
      question: { number: n, challenge: picked.publicPart },
      answer: picked.plaintext,
    });
  }

  return { canonical, config, items };
}

export function buildQuiz(code: string, locale: 'en' | 'id' = 'en'): Quiz | null {
  const built = assemble(code, locale);
  if (!built) return null;

  return {
    code: built.canonical,
    config: built.config,
    questions: built.items.map((i) => i.question),
    timeLimitSeconds: built.config.minutes > 0 ? built.config.minutes * 60 : null,
  };
}

/** The answers, from the same pass. Never sent to a participant. */
export function quizAnswers(code: string): string[] | null {
  // No locale: this reads answers only, and the instruction line is not part of
  // marking. Translating it here would change nothing and imply it might.
  const built = assemble(code);
  return built ? built.items.map((i) => i.answer) : null;
}

export interface QuestionResult {
  number: number;
  correct: boolean;
  proximity: number;
  submitted: string;
  /** Revealed only once the attempt is finished, never mid-quiz. */
  expected: string;
  techniqueName: string;
}

export interface QuizResult {
  code: string;
  total: number;
  correct: number;
  /** Whole percent, so it reads the way a mark normally does. */
  score: number;
  results: QuestionResult[];
}

export function markQuiz(code: string, submitted: string[]): QuizResult | null {
  const built = assemble(code);
  if (!built) return null;

  const results: QuestionResult[] = built.items.map((item, i) => {
    const given = submitted[i] ?? '';
    const graded = gradeAnswer(given, item.answer);
    return {
      number: item.question.number,
      correct: graded.correct,
      proximity: graded.similarity,
      submitted: given,
      expected: item.answer,
      techniqueName: item.question.challenge.techniqueName,
    };
  });

  const correct = results.filter((r) => r.correct).length;

  return {
    code: built.canonical,
    total: results.length,
    correct,
    score: results.length ? Math.round((correct / results.length) * 100) : 0,
    results,
  };
}
