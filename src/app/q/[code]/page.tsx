import type { Metadata } from 'next';
import Link from 'next/link';
import { buildQuiz } from '@/lib/quiz';
import { QuizRunner } from '@/components/quiz-runner';
import { t, currentLocale } from '@/lib/i18n';
import { quizPolicy, hasDb } from '@/lib/db';
import { currentAccount } from '@/lib/accounts';

export const metadata: Metadata = {
  title: 'Quiz',
  description: 'A shared cryptography quiz.',
  robots: { index: false, follow: false },
};

function Notice({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-3 leading-relaxed text-text-muted">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
      >
        {cta}
      </Link>
    </div>
  );
}

export default async function QuizPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quiz = buildQuiz(decodeURIComponent(code));
  const d = (await t()).quiz;
  const id = (await currentLocale()) === 'id';

  if (!quiz) {
    return <Notice title={d.notFoundTitle} body={d.notFoundP} cta={d.notFoundCta} href="/join" />;
  }

  // The page is a door in its own right, and for a while it was an unlocked
  // one. The fetch and marking endpoints both checked the rules, but this route
  // rendered the questions server-side without asking — so a host-only quiz
  // refused strangers at the API while handing them every question through the
  // page. Enforcing a rule at the endpoints and not at the page that renders
  // the same data is not enforcing it.
  const policy = hasDb() ? await quizPolicy(quiz.code) : null;

  if (policy?.closedAt) {
    return (
      <Notice
        title={id ? 'Kuis ini sudah ditutup' : 'This quiz is closed'}
        body={
          policy.mode === 'first_correct'
            ? id
              ? `Kuis ini ditutup otomatis begitu ada yang menjawab semuanya benar${
                  policy.closedBy ? ` — ${policy.closedBy}` : ''
                }. Kodenya sengaja hanya berlaku sampai orang pertama memecahkannya.`
              : `It closed automatically once somebody answered everything correctly${
                  policy.closedBy ? ` — ${policy.closedBy}` : ''
                }. The code was set to last only until the first person solved it.`
            : id
              ? 'Orang yang membuat kuis ini menutupnya. Kalau menurut Anda seharusnya masih terbuka, hubungi mereka.'
              : 'The person who set it has closed it. If you think it should still be open, ask them.'
        }
        cta={id ? 'Berlatih sendiri' : 'Practise on your own'}
        href="/practice"
      />
    );
  }

  if (policy?.mode === 'host_only') {
    const account = await currentAccount();
    if (!account || account.id !== policy.ownerId) {
      return (
        <Notice
          title={id ? 'Kuis ini terkunci' : 'This quiz is restricted'}
          body={
            id
              ? 'Hanya orang yang membuatnya yang bisa mengerjakan kuis ini, walaupun Anda punya kodenya.'
              : 'Only the person who set this quiz can attempt it, even holding the code.'
          }
          cta={id ? 'Berlatih sendiri' : 'Practise on your own'}
          href="/practice"
        />
      );
    }
  }

  return (
    <QuizRunner
      mode={policy?.mode ?? 'open'}
      title={policy?.title ?? null}
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
