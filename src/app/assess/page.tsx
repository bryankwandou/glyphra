import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AssessmentBuilder } from '@/components/assessment-builder';
import { QuizShare } from '@/components/quiz-share';
import { catalogueSummary } from '@/lib/generator';
import { currentSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Assessment papers',
  description: 'Generate a different paper for every student, with one marking key.',
  robots: { index: false, follow: false },
};

export default async function AssessPage() {
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
        <QuizShare />
      </div>
    </>
  );
}
