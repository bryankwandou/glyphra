import type { Metadata } from 'next';
import { JoinForm } from '@/components/join-form';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Join a quiz',
  description: 'Enter the eight-character code you were given to open a shared cryptography quiz.',
};

export default async function JoinPage() {
  const d = (await t()).join;

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <h1 className="text-center text-2xl font-semibold tracking-[-0.02em]">{d.title}</h1>
      <p className="mt-2 text-center leading-relaxed text-text-muted">
        {d.lead}
      </p>
      <JoinForm />
    </div>
  );
}
