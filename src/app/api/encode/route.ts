import { NextResponse } from 'next/server';
import { getTechnique, randomKey, makeRng } from '@/lib/ciphers';
import type { Key } from '@/lib/ciphers/types';
import { currentLocale } from '@/lib/i18n';
import { translateSteps } from '@/lib/i18n/steps';

export const runtime = 'nodejs';

/**
 * Encipher or decipher text the visitor typed, with their own key.
 *
 * Open, and correctly so. There is no answer being protected here: the person
 * supplied the message and the key, so returning the result and the working
 * reveals nothing they did not already have. This is the workbench a teacher
 * needs to put a worked example on a whiteboard, and its absence was the single
 * most common complaint — the application could generate problems but could not
 * encipher a sentence you actually wanted.
 */
export async function POST(request: Request) {
  const locale = await currentLocale();
  const body = await request.json().catch(() => ({}));

  const techniqueId = String(body.techniqueId ?? '');
  const direction = body.direction === 'decode' ? 'decode' : 'encode';
  const text = String(body.text ?? '');
  const providedKey = (body.key ?? {}) as Key;

  const technique = getTechnique(techniqueId);
  if (!technique) {
    return NextResponse.json({ error: 'Unknown technique.' }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'Type something first.' }, { status: 400 });
  }

  // A generous ceiling. Long enough for a paragraph on a whiteboard, short
  // enough that a pasted book cannot tie up the function.
  if (text.length > 4000) {
    return NextResponse.json({ error: 'Keep it under 4000 characters.' }, { status: 400 });
  }

  // Fill anything the caller left out rather than failing, so the page is
  // usable before every field has been touched.
  const rng = makeRng(`workbench:${techniqueId}`);
  const filled: Key = { ...randomKey(technique.keySpec, rng) };
  for (const field of technique.keySpec) {
    const given = providedKey[field.name];
    if (given === undefined || given === '') continue;
    filled[field.name] = field.kind === 'int' ? Number(given) : String(given);
  }

  try {
    if (direction === 'decode') {
      if (technique.oneWay) {
        return NextResponse.json(
          { error: `${technique.name} is one-way. There is nothing to reverse.` },
          { status: 400 },
        );
      }
      const out = technique.decode(text, filled);
      return NextResponse.json({
        technique: { id: technique.id, name: technique.name, oneWay: !!technique.oneWay },
        key: filled,
        input: text,
        output: out.output,
        steps: translateSteps(out.steps, locale),
      });
    }

    const normalised = technique.normalise(text, filled);
    const out = technique.encode(text, filled);

    // Prove the round trip in the response itself. If a technique ever stops
    // inverting, the person using it finds out here rather than after handing
    // the result to a class.
    let verified: boolean | null = null;
    if (!technique.oneWay) {
      try {
        verified = technique.decode(out.output, filled).output === normalised;
      } catch {
        verified = false;
      }
    }

    return NextResponse.json({
      technique: { id: technique.id, name: technique.name, oneWay: !!technique.oneWay },
      key: filled,
      input: text,
      normalised,
      output: out.output,
      steps: translateSteps(out.steps, locale),
      verified,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
