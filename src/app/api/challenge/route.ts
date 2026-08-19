import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/generator';
import { seal } from '@/lib/seal';
import type { Difficulty, Family } from '@/lib/ciphers/types';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

interface Body {
  techniqueIds?: string[];
  families?: Family[];
  difficulties?: Difficulty[];
  seed?: string;
  /**
   * 'machine' draws the message from the built-in bank.
   * 'ai' asks a language model for a fresh one.
   */
  source?: 'machine' | 'ai';
  theme?: string;
  /** Beginner mode: show the key instead of making them recover it first. */
  discloseKey?: boolean;
  /** A message the visitor typed themselves, instead of a drawn one. */
  plaintext?: string;
}

/**
 * Ask Groq for a single sentence to encipher.
 *
 * The model writes the *message* and never touches the cryptography — the
 * cipher engine does that, and it is the part that has been verified. Letting a
 * language model produce ciphertext directly would be the obvious way to build
 * this and the wrong one, because there would be nothing guaranteeing the
 * output is actually correct.
 *
 * Any failure falls back to the built-in bank rather than surfacing an error,
 * so a missing API key degrades the feature instead of breaking the page.
 */
/**
 * Tried in order. Hosted model names get retired without much notice — the
 * first version of this file named a model that had already been withdrawn, and
 * the only symptom was the feature silently falling back to the message bank.
 * A list means one retirement degrades to the next entry instead of the whole
 * feature going quiet.
 */
const MODELS = ['groq/compound-mini', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

/**
 * Generous relative to a fourteen-word sentence, and deliberately so. Several
 * of these models reason before answering and that reasoning is billed against
 * the same budget — with a tight limit they hit the cap mid-thought and return
 * an empty string, which reads as a failure for no obvious reason.
 */
const MAX_TOKENS = 400;

const SYSTEM_BRIEF =
  'You write single short sentences to be used as cryptography exercise material. ' +
  'Reply with the sentence alone: no quotation marks, no preamble, no explanation. ' +
  'Between eight and fourteen words. Plain declarative English. No proper nouns, no ' +
  'numbers, no punctuation beyond a final full stop.';

async function aiPlaintext(theme?: string): Promise<string | null> {
  const apiKey = env('GROQ_API_KEY');
  if (!apiKey) return null;

  const subject = theme?.trim()
    ? `The sentence should concern: ${theme.trim()}.`
    : 'Pick any ordinary subject — logistics, travel, an office, a delivery.';

  // Keys pasted out of a text file often carry a byte-order mark, which becomes
  // an invisible character in the header and a 401 that is very hard to read.
  const authorization = `Bearer ${apiKey}`;

  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify({
          model,
          temperature: 1.1,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: SYSTEM_BRIEF },
            { role: 'user', content: subject },
          ],
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (!text) continue;

      const cleaned = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '') // reasoning models emit these
        .replace(/^["'\s]+|["'\s]+$/g, '')
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
        .pop();

      // A model that ignores the brief and returns a paragraph would make an
      // unusable problem, so anything outside a sane range is discarded.
      if (!cleaned || cleaned.length < 12 || cleaned.length > 140) continue;
      return cleaned;
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is a valid request: generate anything.
  }

  // A message the visitor typed wins over both the bank and the model. Asking
  // for your own sentence and getting something else back is the same class of
  // silent override that made the technique filter untrustworthy.
  let plaintext: string | undefined;
  let usedAi = false;
  const own = typeof body.plaintext === 'string' ? body.plaintext.trim().slice(0, 400) : '';

  if (own) {
    plaintext = own;
  } else if (body.source === 'ai') {
    const generated = await aiPlaintext(body.theme);
    if (generated) {
      plaintext = generated;
      usedAi = true;
    }
  }

  const { publicPart, solution } = generateChallenge({
    techniqueIds: body.techniqueIds,
    families: body.families,
    difficulties: body.difficulties,
    seed: body.seed,
    plaintext,
    discloseKey: body.discloseKey,
  });

  return NextResponse.json({
    ...publicPart,
    messageSource: own ? 'own' : usedAi ? 'ai' : 'machine',
    // The answer travels with the problem, sealed. The browser holds it but
    // cannot open it; only this server can, and only to mark an attempt or to
    // serve the instructor view.
    sealed: seal({ ...solution, techniqueId: publicPart.techniqueId }),
  });
}
