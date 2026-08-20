'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';

export function SignOutButton() {
  const router = useRouter();
  const id = useLocale() === 'id';

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/account/signout', { method: 'POST' });
        router.refresh();
      }}
      className="text-sm text-text-muted transition-colors hover:text-text"
    >
      {id ? 'Keluar' : 'Sign out'}
    </button>
  );
}
