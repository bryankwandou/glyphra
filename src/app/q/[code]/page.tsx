import type { Metadata } from 'next';
import Link from 'next/link';
import { buildQuiz } from '@/lib/quiz';
import { QuizRunner } from '@/components/quiz-runner';

export const metadata: Metadata = {
  title: 'Quiz',
  description: 'A shared cryptography quiz.',
  robots: { index: false, follow: false },
};

export default async function QuizPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quiz = buildQuiz(decodeURIComponent(code));

  if (!quiz) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">That code did not open a quiz</h1>
        <p className="mt-3 leading-relaxed text-text-muted">
          Codes are eight characters and are checked for typos, so a single wrong character is
          caught rather than opening the wrong quiz. Worth re-reading the code from whoever shared
          it.
        </p>
        <Link
          href="/join"
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          Type a code again
        </Link>
      </div>
    );
  }

  return (
    <QuizRunner
      quiz={{
        code: quiz.code,
        timeLimitSeconds: quiz.timeLimitSeconds,
        questionCount: quiz.questions.length,
        difficultyLow: quiz.config.difficultyLow,
        difficultyHigh: quiz.config.difficultyHigh,
        questions: quiz.questions.map((q) => ({
          number: q.number,
          techniqueName: q.challenge.techniqueName,
          family: q.challenge.family,
          difficulty: q.challenge.difficulty,
          era: q.challenge.era,
          summary: q.challenge.summary,
          theory: q.challenge.theory,
          prompt: q.challenge.prompt,
          ciphertext: q.challenge.ciphertext,
          keyFields: q.challenge.keyFields,
          plaintextLength: q.challenge.plaintextLength,
        })),
      }}
    />
  );
}
