import type { Metadata } from 'next';
import Link from 'next/link';
import { TECHNIQUES } from '@/lib/ciphers';
import { Workbench, type WorkbenchTechnique } from '@/components/workbench';
import { currentLocale } from '@/lib/i18n';
import { eraText } from '@/lib/i18n/eras';
import { prose } from '@/lib/i18n/techniques';
import { keyLabel } from '@/lib/i18n/key-labels';
import type { Locale } from '@/lib/i18n/dict';

export const metadata: Metadata = {
  title: 'Workbench',
  description:
    'Type your own text, pick a cipher, and watch it transform step by step. Both directions, with the key in your hands and the working shown.',
};

/**
 * Easiest first.
 *
 * The dropdown used to follow catalogue order, which put Chaocipher and Enigma
 * near techniques a beginner could actually attempt. Sorting by difficulty and
 * then by name means the top of the list is genuinely the place to start.
 */
function ordered(locale: Locale): WorkbenchTechnique[] {
  return [...TECHNIQUES]
    .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name))
    .map((t) => ({
      id: t.id,
      name: t.name,
      family: t.family,
      difficulty: t.difficulty,
      summary: prose(t, locale).summary,
      theory: prose(t, locale).theory,
      era: eraText(t.era, locale),
      oneWay: !!t.oneWay,
      keySpec: t.keySpec.map((f) => ({
        name: f.name,
        kind: f.kind,
        label: keyLabel(f.label, locale),
        min: 'min' in f ? f.min : undefined,
        max: 'max' in f ? f.max : undefined,
        options: 'options' in f ? f.options : undefined,
      })),
    }));
}

export default async function EncodePage() {
  const locale = await currentLocale();
  const id = locale === 'id';

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
          {id ? 'Bengkel kerja' : 'Workbench'}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {id ? 'Ketik teks Anda, lihat berubah' : 'Type your text, watch it change'}
        </h1>
        <p className="mt-4 leading-relaxed text-text-muted">
          {id
            ? 'Kunci ada di tangan Anda dan seluruh langkahnya ditampilkan. Ini tempat menyiapkan contoh untuk papan tulis, atau sekadar memahami satu metode dengan mencobanya — bukan menebak jawaban.'
            : 'The key is yours and every step is shown. This is where you prepare an example for a whiteboard, or simply understand a method by trying it — nothing is being withheld here.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/tutorial" className="text-accent hover:underline">
            {id ? 'Baru mulai? Buka tutorialnya' : 'New to this? Read the tutorial'}
          </Link>
          <span className="text-text-faint" aria-hidden>·</span>
          <Link href="/practice" className="text-accent hover:underline">
            {id ? 'Sudah siap dites? Ke latihan' : 'Ready to be tested? Go to practice'}
          </Link>
        </div>
      </header>

      <Workbench techniques={ordered(locale)} />
    </div>
  );
}
