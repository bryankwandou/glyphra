import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountForm } from '@/components/account-form';
import { currentAccount } from '@/lib/accounts';
import { hasDb } from '@/lib/db';
import { currentLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Sign in to set problems, restrict a quiz, and see who attempted it.',
};

export default async function AccountPage() {
  const account = await currentAccount();
  if (account) redirect('/instructor');

  const id = (await currentLocale()) === 'id';

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <h1 className="text-center text-2xl font-semibold tracking-[-0.02em]">
        {id ? 'Akun pengajar' : 'Instructor account'}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-text-muted">
        {id
          ? 'Untuk membuat soal, mengunci kuis ke satu orang, menutupnya saat sudah terpecahkan, dan melihat daftar nilainya.'
          : 'For setting problems, restricting a quiz to one person, closing it once solved, and seeing the results.'}
      </p>

      <div className="mt-8">
        <AccountForm available={hasDb()} />
      </div>
    </div>
  );
}
