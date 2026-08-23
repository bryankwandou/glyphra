import type { Metadata } from 'next';
import Link from 'next/link';
import { buildProblem } from '@/lib/problem';
import { ProblemRunner } from '@/components/problem-runner';
import { problemRow, hasDb } from '@/lib/db';
import { currentLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Problem',
  description: 'A single cryptography problem, locked to one technique.',
  robots: { index: false, follow: false },
};

export default async function ProblemPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const built = buildProblem(decodeURIComponent(code), (await currentLocale()) === 'id' ? 'id' : 'en');
  const id = (await currentLocale()) === 'id';

  if (!built) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {id ? 'Kode itu tidak membuka soal' : 'That code does not open a problem'}
        </h1>
        <p className="mt-3 leading-relaxed text-text-muted">
          {id
            ? 'Periksa kalau ada huruf yang salah ketik. Kode soal panjangnya delapan karakter.'
            : 'Check for a mistyped character. A problem code is eight characters long.'}
        </p>
        <Link
          href="/practice"
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          {id ? 'Berlatih sendiri' : 'Practise instead'}
        </Link>
      </div>
    );
  }

  // Same rule as the quiz page: the page is a door too, so the solved state is
  // checked here rather than only when an answer is posted. Otherwise somebody
  // works the whole problem and is refused at the end.
  const row = hasDb() ? await problemRow(built.public.code) : null;

  if (row?.solvedAt) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {id ? 'Sudah dipecahkan' : 'Already solved'}
        </h1>
        <p className="mt-3 leading-relaxed text-text-muted">
          {row.solvedBy
            ? id
              ? `${row.solvedBy} menjawabnya lebih dulu. Kode ini hanya berlaku sampai jawaban benar pertama.`
              : `${row.solvedBy} got there first. This code only lasted until the first correct answer.`
            : id
              ? 'Kode ini hanya berlaku sampai jawaban benar pertama.'
              : 'This code only lasted until the first correct answer.'}
        </p>
        <Link
          href="/practice"
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          {id ? 'Berlatih sendiri' : 'Practise instead'}
        </Link>
      </div>
    );
  }

  return (
    <ProblemRunner
      problem={built.public}
      tracked={!!row}
      label={row?.label ?? null}
    />
  );
}
