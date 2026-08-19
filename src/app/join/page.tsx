import type { Metadata } from 'next';
import { JoinForm } from '@/components/join-form';

export const metadata: Metadata = {
  title: 'Join a quiz',
  description: 'Enter the eight-character code you were given to open a shared cryptography quiz.',
};

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <h1 className="text-center text-2xl font-semibold tracking-[-0.02em]">Join a quiz</h1>
      <p className="mt-2 text-center leading-relaxed text-text-muted">
        Type the code you were given. No account, no sign-up.
      </p>
      <JoinForm />
    </div>
  );
}
