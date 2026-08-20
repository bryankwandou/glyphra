import type { Metadata } from 'next';
import Link from 'next/link';
import { InstructorConsole } from '@/components/instructor-console';
import { QuizDashboard } from '@/components/quiz-dashboard';
import { currentSession } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { ownedQuizzes, hasDb } from '@/lib/db';
import { currentLocale } from '@/lib/i18n';
import { SignOutButton } from '@/components/sign-out-button';

export const metadata: Metadata = {
  title: 'Instructor',
  description: 'Answer keys and complete worked solutions, held behind a sign-in.',
  robots: { index: false, follow: false },
};

export default async function InstructorPage({
  searchParams,
}: {
  searchParams: Promise<{ sealed?: string }>;
}) {
  // Two ways in, on purpose. The shared instructor login predates accounts and
  // still opens answer keys, so nothing that already worked has stopped. An
  // account is what ownership and the gradebook hang off, because "who set this
  // quiz" cannot be answered by a login everybody shares.
  const session = await currentSession();
  const account = await currentAccount();
  const params = await searchParams;
  const id = (await currentLocale()) === 'id';

  const quizzes = account ? await ownedQuizzes(account.id) : [];

  return (
    <>
      {hasDb() && (
        <section className="border-b border-border-subtle bg-bg-sunken">
          <div className="mx-auto max-w-4xl px-5 py-8">
            {account ? (
              <>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-lg font-medium tracking-[-0.01em]">
                    {id ? 'Kuis Anda' : 'Your quizzes'}
                  </h2>
                  <span className="text-sm text-text-muted">{account.displayName}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <Link href="/assess" className="text-sm text-accent hover:underline">
                      {id ? 'Buat satu kuis' : 'Create a quiz'}
                    </Link>
                    <SignOutButton />
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                  {id
                    ? 'Kuis yang sudah Anda klaim. Di sini Anda bisa menutupnya, membukanya kembali, dan melihat siapa saja yang mengerjakan beserta nilainya.'
                    : 'Quizzes you have claimed. Close them, reopen them, and see who attempted them and what they scored.'}
                </p>

                <div className="mt-5">
                  <QuizDashboard quizzes={quizzes} />
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium">
                    {id ? 'Punya akun?' : 'Have an account?'}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-muted">
                    {id
                      ? 'Masuk untuk mengklaim kode kuis, membatasi siapa yang boleh mengerjakannya, menutupnya begitu ada yang memecahkan, dan melihat daftar nilainya.'
                      : 'Sign in to claim a quiz code, restrict who may attempt it, close it once somebody solves it, and see the results.'}
                  </p>
                </div>
                <Link
                  href="/account"
                  className="ml-auto rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
                >
                  {id ? 'Masuk atau daftar' : 'Sign in or sign up'}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <InstructorConsole
        signedIn={Boolean(session)}
        username={session?.username ?? null}
        initialSealed={params.sealed ?? ''}
      />
    </>
  );
}
