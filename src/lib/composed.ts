import 'server-only';
import { generateChallenge } from './generator';
import { quizPlan, type QuizPlan } from './db';
import type { QuizQuestion } from './quiz';

/**
 * A quiz built from an arrangement rather than a difficulty band.
 *
 * The composer names the method for every question, in order, the way a teacher
 * writes a paper. That arrangement cannot fit in an eight-character code — ten
 * named methods need seventy bits before the seed — so it lives in the database
 * and the code points at it. Every other kind of quiz here stays stateless; this
 * one buys per-question control at the price of needing storage, and the
 * interface says so where the choice is made.
 *
 * What does not change: the questions themselves are still a pure function of
 * the seed and the named method, so a plan reproduces the identical paper on any
 * machine, and the answer key is never stored.
 */
export interface ComposedQuiz {
  code: string;
  plan: QuizPlan;
  timeLimitSeconds: number | null;
  questions: QuizQuestion[];
  answers: string[];
}

/**
 * Order for one participant.
 *
 * A shuffled plan varies the order per person, so copying a neighbour's screen
 * gives you the answer to a different question. It is seeded from the plan and
 * the participant's name together, which means the same person always sees the
 * same order — refreshing the page must not deal a new arrangement halfway
 * through an attempt.
 */
function orderFor(plan: QuizPlan, participant: string): number[] {
  const order = plan.techniques.map((_, i) => i);
  if (!plan.shuffle) return order;

  let h = 2166136261;
  for (const ch of `${plan.code}:${participant.trim().toLowerCase()}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  // Fisher-Yates, driven by a small deterministic generator.
  for (let i = order.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export async function buildComposed(
  code: string,
  participant = '',
): Promise<ComposedQuiz | null> {
  const plan = await quizPlan(code);
  if (!plan || !plan.techniques.length) return null;

  const order = orderFor(plan, participant);
  const questions: QuizQuestion[] = [];
  const answers: string[] = [];

  order.forEach((source, position) => {
    const techniqueId = plan.techniques[source];
    const { publicPart, solution } = generateChallenge({
      techniqueIds: [techniqueId],
      // Seeded from the source position, not the shuffled one, so shuffling
      // reorders the same questions instead of generating different ones.
      seed: `plan:${plan.seed}:q${source}`,
      discloseKey: plan.disclose,
    });

    // The plan names the method; if the generator returned another the plan
    // would be a description rather than an instruction.
    if (publicPart.techniqueId !== techniqueId) return;

    questions.push({ number: position + 1, challenge: publicPart });
    answers.push(solution.plaintext);
  });

  if (questions.length !== plan.techniques.length) return null;

  return {
    code: plan.code,
    plan,
    timeLimitSeconds: plan.minutes > 0 ? plan.minutes * 60 : null,
    questions,
    answers,
  };
}
