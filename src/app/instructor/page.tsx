import type { Metadata } from 'next';
import Link from 'next/link';
import { InstructorConsole } from '@/components/instructor-console';
import { QuizDashboard } from '@/components/quiz-dashboard';
import { currentViewer } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { ownedQuizzes, ownedProblems, hasDb } from '@/lib/db';
import { ProblemHistory } from '@/components/problem-history';
import { getTechnique } from '@/lib/ciphers';
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
  const session = await currentViewer();
  const account = await currentAccount();
  const params = await searchParams;
  const id = (await currentLocale()) === 'id';

  const quizzes = account ? await ownedQuizzes(account.id) : [];
  const problems = account ? await ownedProblems(account.id) : [];

  const accountSection = hasDb() ? (
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

            <h2 className="mt-10 text-lg font-medium tracking-[-0.01em]">
              {id ? 'Soal tunggal' : 'Single problems'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
              {id
                ? 'Satu kode, satu soal, satu metode. Berjalan sampai ada yang menjawab benar, lalu tercatat atas nama orang itu.'
                : 'One code, one problem, one method. It runs until somebody answers correctly, then it is recorded against their name.'}
            </p>

            <div className="mt-4">
              <ProblemHistory
                problems={problems.map((p) => ({
                  code: p.code,
                  techniqueId: p.techniqueId,
                  techniqueName: getTechnique(p.techniqueId)?.name ?? p.techniqueId,
                  label: p.label,
                  disclose: p.disclose,
                  solvedAt: p.solvedAt,
                  solvedBy: p.solvedBy,
                  attempts: p.attempts,
                  createdAt: p.createdAt,
                }))}
              />
            </div>
          </>
        ) : (
          /*
            Somebody already signed in must never be shown a sign-in prompt.

            This branch renders whenever there is no account, and it used to be
            written as though nobody were there at all: "Have an account? Sign
            in or sign up", sitting directly above a console that says "Signed
            in as ...". Both halves were true — the shared instructor login and
            an account are different credentials — but the screen contradicted
            itself, and the only reasonable reading is that the sign-in failed.
            So people signed in again, and the prompt was still there.

            What a shared login actually lacks is ownership, not access, so that
            is what this now says.
          */
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-medium">
                {session
                  ? id
                    ? 'Daftar nilai butuh akun tersendiri'
                    : 'The gradebook needs an account of its own'
                  : id
                    ? 'Punya akun?'
                    : 'Have an account?'}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-muted">
                {session
                  ? id
                    ? `Anda sudah masuk sebagai ${session.username} dan kunci jawaban di bawah sudah terbuka — tidak ada lagi yang perlu dimasuki. Satu hal saja yang belum tercakup: kepemilikan kuis. Menutup kuis, membatasi pesertanya, dan membaca nilainya dicatat atas nama sebuah akun, sedangkan login pengajar ini dipakai bersama sehingga tidak bisa memikul nama siapa pun.`
                    : `You are signed in as ${session.username} and the answer keys below are already open — there is nothing further to sign into. One thing is not covered: owning a quiz. Closing one, restricting who may attempt it, and reading the results are recorded against an account, and this instructor login is shared, so it cannot carry anybody's name.`
                  : id
                    ? 'Masuk untuk mengklaim kode kuis, membatasi siapa yang boleh mengerjakannya, menutupnya begitu ada yang memecahkan, dan melihat daftar nilainya.'
                    : 'Sign in to claim a quiz code, restrict who may attempt it, close it once somebody solves it, and see the results.'}
              </p>
            </div>
            <Link
              href="/account"
              className="ml-auto rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
            >
              {session
                ? id
                  ? 'Tambahkan akun'
                  : 'Add an account'
                : id
                  ? 'Masuk atau daftar'
                  : 'Sign in or sign up'}
            </Link>
          </div>
        )}
      </div>
    </section>
  ) : null;

  const workspace = (
    <InstructorConsole
      signedIn={Boolean(session)}
      username={session?.username ?? null}
      initialSealed={params.sealed ?? ''}
    />
  );

  // Order follows what the visitor came for. Signed in without an account, the
  // answer keys are the point and the account note is an aside, so the console
  // goes first; signed out, the sign-in is the only way forward and belongs at
  // the top.
  return session && !account ? (
    <>
      {workspace}
      {accountSection}
    </>
  ) : (
    <>
      {accountSection}
      {workspace}
    </>
  );
}
