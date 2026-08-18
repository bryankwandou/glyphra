import type { Metadata } from 'next';
import { InstructorConsole } from '@/components/instructor-console';
import { currentSession } from '@/lib/auth';

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
  const session = await currentSession();
  const params = await searchParams;

  return (
    <InstructorConsole
      signedIn={Boolean(session)}
      username={session?.username ?? null}
      initialSealed={params.sealed ?? ''}
    />
  );
}
