import type { Metadata } from 'next';
import { PracticeConsole } from '@/components/practice-console';
import { catalogueSummary } from '@/lib/generator';
import { currentSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Practice',
  description:
    'Generate a fresh cryptography problem from 101 verified techniques and work it through.',
};

export default async function PracticePage() {
  const catalogue = catalogueSummary();
  const session = await currentSession();

  return (
    <>
      <div className="border-b border-border-subtle">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Practice range</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            Every problem is built when you ask for it and marked on the server. Spacing,
            punctuation and case are ignored, so you are graded on the cryptanalysis rather than the
            typing.
          </p>
        </div>
      </div>
      <PracticeConsole catalogue={catalogue} instructorSignedIn={Boolean(session)} />
    </>
  );
}
