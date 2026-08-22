import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AssessmentBuilder } from '@/components/assessment-builder';
import { QuizShare } from '@/components/quiz-share';
import { currentAccount } from '@/lib/accounts';
import { ProblemMaker } from '@/components/problem-maker';
import { QuizComposer } from '@/components/quiz-composer';
import { REVERSIBLE } from '@/lib/ciphers';
import { PROBLEM_ROSTER } from '@/lib/problem-code';
import { catalogueSummary } from '@/lib/generator';
import { currentSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Assessment papers',
  description: 'Generate a different paper for every student, with one marking key.',
  robots: { index: false, follow: false },
};

export default async function AssessPage() {
  const signedIn = Boolean(await currentAccount());
  const session = await currentSession();
  if (!session) redirect('/instructor');

  return (
    <>
      <div className="no-print border-b border-border-subtle">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Assessment papers</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-text-muted">
            One problem set that circulates between cohorts stops testing anything after the first
            year. This builds a different paper for each student over the same techniques and the
            same difficulty, so the marking stays comparable while copying a neighbour does not
            help.
          </p>
          <p className="mt-3 text-sm text-text-muted">
            Signed in as {session.username}.{' '}
            <Link href="/instructor" className="text-accent hover:underline">
              Instructor view
            </Link>
          </p>
        </div>
      </div>
      <AssessmentBuilder catalogue={catalogueSummary()} />
      <div className="mx-auto max-w-5xl px-5 pb-12">
        <QuizShare signedIn={signedIn} />

        <div className="mt-8">
          <QuizComposer
            signedIn={signedIn}
            techniques={REVERSIBLE.filter((t) => PROBLEM_ROSTER.includes(t.id)).map((t) => ({
              id: t.id,
              name: t.name,
              family: t.family,
              difficulty: t.difficulty,
            }))}
          />
        </div>

        <div className="mt-8">
          <ProblemMaker
            signedIn={signedIn}
            techniques={REVERSIBLE.filter((t) => PROBLEM_ROSTER.includes(t.id)).map((t) => ({
              id: t.id,
              name: t.name,
              family: t.family,
              difficulty: t.difficulty,
            }))}
          />
        </div>
      </div>
    </>
  );
}
