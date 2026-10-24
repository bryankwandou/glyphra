/**
 * Print the answers to a quiz or problem, in one participant's order.
 *
 * Exists so the browser check can type real answers into the real form. It
 * derives them the way any third party could — from the code and the plan —
 * rather than asking the server what it thinks the answers are, which would
 * make "the app accepted them" circular.
 *
 *   npx tsx --conditions=react-server scripts/answers-for.ts quiz <code> [name]
 *   npx tsx --conditions=react-server scripts/answers-for.ts problem <code>
 */
import { buildComposed } from '../src/lib/composed';
import { buildProblem } from '../src/lib/problem';
import { buildQuiz, quizAnswers } from '../src/lib/quiz';

(async () => {
  const [kind, code, who = ''] = process.argv.slice(2);

  if (kind === 'problem') {
    const built = buildProblem(code);
    console.log(JSON.stringify(built ? { answers: [built.answer] } : { answers: [] }));
    return;
  }

  const composed = await buildComposed(code, who);
  if (composed) {
    console.log(JSON.stringify({
      answers: composed.answers,
      methods: composed.questions.map((q) => q.challenge.techniqueName),
    }));
    return;
  }

  // A band quiz keeps its answers off the built object, so nothing that renders
  // a quiz can reach its key. quizAnswers rebuilds them from the code alone —
  // still no question put to the server. Returning [] here once made the
  // answer-key check in verify-court fail with "got 0, want 4".
  const band = buildQuiz(code);
  console.log(JSON.stringify({
    answers: quizAnswers(code) ?? [],
    questions: band ? band.questions.length : 0,
  }));
})();
