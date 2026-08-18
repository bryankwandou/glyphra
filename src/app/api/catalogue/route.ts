import { NextResponse } from 'next/server';
import { catalogueSummary } from '@/lib/generator';

export const runtime = 'nodejs';

/**
 * The technique list, for the picker and the reference page. Carries metadata
 * only — no solving machinery, no keys.
 */
export async function GET() {
  return NextResponse.json({ techniques: catalogueSummary() });
}
