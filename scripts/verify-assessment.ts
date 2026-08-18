/**
 * Assessment invariants.
 *
 * The cipher harness proves each technique is correct. This proves the papers
 * built from those techniques are *fair*, which is a separate claim and the one
 * an instructor is actually relying on when they put a mark in a register.
 *
 * These four properties were checked by hand once, against a running build.
 * Checking something once is how it silently breaks six months later, so they
 * run on every build alongside the cipher round trips.
 *
 *   npm run verify
 */
import { buildAssessment } from '../src/lib/assessment';
import type { Difficulty } from '../src/lib/ciphers/types';

interface Failure {
  property: string;
  detail: string;
}

const failures: Failure[] = [];
const notes: string[] = [];

function fail(property: string, detail: string) {
  failures.push({ property, detail });
}

function fingerprint(papers: ReturnType<typeof buildAssessment>['papers']): string {
  return JSON.stringify(papers.map((p) => p.problems.map((q) => q.challenge.ciphertext)));
}

/* ---------------------------------------------------------------- scenarios */

const SCENARIOS = [
  { label: 'mixed band 2-4, 12 papers x 3', papers: 12, per: 3, difficulties: [2, 3, 4] as Difficulty[] },
  { label: 'full range 1-5, 8 papers x 5', papers: 8, per: 5, difficulties: [1, 2, 3, 4, 5] as Difficulty[] },
  { label: 'single difficulty, 10 papers x 4', papers: 10, per: 4, difficulties: [3] as Difficulty[] },
  { label: 'unconstrained, 6 papers x 4', papers: 6, per: 4, difficulties: undefined },
  { label: 'large cohort, 40 papers x 3', papers: 40, per: 3, difficulties: [2, 3] as Difficulty[] },
];

for (const s of SCENARIOS) {
  const spec = {
    title: 'Verification run',
    masterSeed: `verify:${s.label}`,
    papers: s.papers,
    problemsPerPaper: s.per,
    difficulties: s.difficulties,
  };

  const built = buildAssessment(spec);

  /* 1. Every paper is fully populated. A short paper would quietly under-test
        one student while everyone else sat the full set. */
  for (const p of built.papers) {
    if (p.problems.length !== s.per) {
      fail('paper length', `${s.label}: paper ${p.code} has ${p.problems.length} of ${s.per}`);
    }
  }

  /* 2. No technique repeats inside one paper. Four Caesar problems is a worse
        test than four different ciphers. */
  for (const p of built.papers) {
    const ids = p.problems.map((q) => q.challenge.techniqueId);
    if (new Set(ids).size !== ids.length) {
      fail('repeat within paper', `${s.label}: paper ${p.code} repeats a technique — ${ids.join(', ')}`);
    }
  }

  /* 3. Identical difficulty composition on every paper. Without this, one
        student can draw three easy problems and another three hard ones, both
        inside the requested band, and be marked on the same scale. */
  const comps = new Set(
    built.papers.map((p) => p.problems.map((q) => q.challenge.difficulty).join(',')),
  );
  if (comps.size !== 1) {
    fail(
      'difficulty composition',
      `${s.label}: ${comps.size} different compositions across papers — ${[...comps].join(' | ')}`,
    );
  }

  /* 4. Papers actually differ. The whole point is that copying a neighbour
        does not help. */
  const distinct = new Set(
    built.papers.map((p) => p.problems.map((q) => q.challenge.ciphertext).join('|')),
  );
  if (distinct.size !== built.papers.length) {
    fail(
      'distinct papers',
      `${s.label}: only ${distinct.size} distinct of ${built.papers.length}`,
    );
  }

  /* 5. The seed reproduces the set exactly. This is what lets a lost sheet be
        rebuilt months later, and it is why no database is needed. */
  const again = buildAssessment(spec);
  if (fingerprint(built.papers) !== fingerprint(again.papers)) {
    fail('reproducibility', `${s.label}: rebuilding from the same seed produced a different set`);
  }

  /* 6. A different seed produces a different set. Reproducibility is worthless
        if every cohort receives the identical papers. */
  const other = buildAssessment({ ...spec, masterSeed: spec.masterSeed + ':other' });
  if (fingerprint(built.papers) === fingerprint(other.papers)) {
    fail('seed sensitivity', `${s.label}: a different seed produced an identical set`);
  }

  /* 7. Every problem carries a usable marking key. A paper without one is
        exactly the hand-marking problem this replaces. */
  for (const p of built.papers) {
    for (const q of p.problems) {
      if (!q.solution.plaintext || q.solution.plaintext.length < 4) {
        fail('marking key', `${s.label}: paper ${p.code} question ${q.index} has no answer`);
      }
      if (q.solution.decodeSteps.length === 0) {
        fail('worked solution', `${s.label}: paper ${p.code} question ${q.index} has no decode steps`);
      }
    }
  }

  /* 8. The ciphertext is not simply the answer. A technique that failed to
        transform its input would hand the plaintext to the student. */
  for (const p of built.papers) {
    for (const q of p.problems) {
      const ct = q.challenge.ciphertext.replace(/\s+/g, '').toUpperCase();
      const pt = q.solution.plaintext.replace(/\s+/g, '').toUpperCase();
      if (ct === pt) {
        fail(
          'no transformation',
          `${s.label}: paper ${p.code} question ${q.index} (${q.challenge.techniqueId}) ` +
            'gives back the plaintext',
        );
      }
    }
  }

  /* 9. Paper codes are unique within a set, since they are how a sheet is
        identified when it is handed back. */
  const codes = new Set(built.papers.map((p) => p.code));
  if (codes.size !== built.papers.length) {
    fail('code collision', `${s.label}: ${built.papers.length - codes.size} duplicate paper codes`);
  }

  notes.push(
    `  ${s.label.padEnd(34)} ${built.papers.length} papers, ` +
      `${built.techniquesUsed.length} distinct techniques drawn`,
  );
}

/* -------------------------------------------------------------------- output */

console.log('\nAssessment invariants\n');
console.log(notes.join('\n'));

const properties = [
  'every paper fully populated',
  'no technique repeats within a paper',
  'identical difficulty composition across papers',
  'all papers distinct',
  'the same seed reproduces the same set',
  'a different seed produces a different set',
  'every question carries a marking key and worked solution',
  'ciphertext never equals the plaintext',
  'paper codes unique within a set',
];

console.log(`\n  ${properties.length} properties checked over ${SCENARIOS.length} scenarios\n`);

if (failures.length) {
  console.error(`FAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  [${f.property}] ${f.detail}`);
  console.error('');
  process.exit(1);
}

console.log(`All ${properties.length} assessment invariants hold.\n`);
