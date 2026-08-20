/**
 * Apply the schema.
 *
 *   npm run migrate
 *
 * Every statement is IF NOT EXISTS, so running it twice is a no-op rather than
 * an error. That matters because the alternative — a migration that can only be
 * run once — is one somebody eventually runs twice at the worst moment.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('\nDATABASE_URL is not set.\n');
  console.error('  Local:      npx vercel env pull .env.local');
  console.error('  Then run:   npm run migrate\n');
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf8');

// Comments are stripped before splitting, not after. A semicolon inside a
// comment — "created when someone claims a code; anonymous codes stay open" —
// otherwise cuts a statement in half, and the failure surfaces as a syntax
// error pointing at an ordinary English word.
const statements = schema
  .replace(/--.*$/gm, '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

(async () => {
  console.log(`\nApplying ${statements.length} statements\n`);

  for (const statement of statements) {
    const label = statement.trim().split('\n')[0].slice(0, 68);
    try {
      await sql.query(statement);
      console.log(`  ok    ${label}`);
    } catch (e) {
      console.error(`  FAIL  ${label}`);
      console.error(`        ${(e as Error).message}`);
      process.exit(1);
    }
  }

  const tables = (await sql.query(`
    SELECT table_name, (
      SELECT count(*) FROM information_schema.columns c
      WHERE c.table_name = t.table_name AND c.table_schema = 'public'
    ) AS cols
    FROM information_schema.tables t
    WHERE table_schema = 'public' ORDER BY table_name
  `)) as unknown as Record<string, unknown>[];

  console.log('\nTables now present:\n');
  for (const t of tables) {
    console.log(`  ${String(t.table_name).padEnd(14)} ${t.cols} columns`);
  }
  console.log('');
})();
