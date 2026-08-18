import { generateChallenge } from './generator';
import type { PublicChallenge, Solution } from './generator';
import type { Difficulty, Family } from './ciphers/types';
import { makeRng } from './ciphers/utils';

/**
 * Assessment papers.
 *
 * The problem this solves is the one every lecturer actually has: a single
 * problem set circulates between cohorts and stops testing anything after the
 * first year. Here each student receives a different paper covering the same
 * techniques at the same difficulty, so comparing answers with a neighbour is
 * useless while the marking stays fair.
 *
 * Nothing is stored. A paper is a pure function of the master seed and the
 * student's position in the list, so a lost paper can be regenerated months
 * later from the seed alone — no database, no backup to lose, no export to
 * misplace. That property is the whole design, and it is why the seed is
 * printed on every sheet.
 */

export interface AssessmentSpec {
  title: string;
  masterSeed: string;
  /** Number of distinct papers, normally one per student. */
  papers: number;
  problemsPerPaper: number;
  techniqueIds?: string[];
  families?: Family[];
  difficulties?: Difficulty[];
}

export interface PaperProblem {
  index: number;
  challenge: PublicChallenge;
  solution: Solution;
}

export interface Paper {
  /** 1-based, as printed. */
  number: number;
  /** Short human-readable identifier, printed on the sheet. */
  code: string;
  problems: PaperProblem[];
}

export interface Assessment {
  title: string;
  masterSeed: string;
  generatedAt: string;
  papers: Paper[];
  /** Techniques that actually appeared, for the instructor's own reference. */
  techniquesUsed: string[];
}

export const LIMITS = {
  maxPapers: 120,
  maxProblemsPerPaper: 12,
} as const;

/**
 * Four uppercase letters and two digits, derived from the seed and the paper
 * number. Short enough to write on a sheet by hand and read back over a desk,
 * long enough that two papers in a cohort will not collide.
 */
function paperCode(masterSeed: string, number: number): string {
  const rng = makeRng(`code:${masterSeed}:${number}`);
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // I and O omitted — they read as 1 and 0
  const head = Array.from({ length: 4 }, () => letters[rng.int(0, letters.length - 1)]).join('');
  return `${head}-${String(number).padStart(2, '0')}`;
}

/**
 * Fixes the difficulty of each question slot, identically on every paper.
 *
 * Without this, asking for difficulty 2 to 3 lets one student draw three
 * difficulty-2 problems while another draws three at difficulty 3. Both papers
 * satisfy the request and they are plainly not equivalent as a test — an early
 * run produced exactly that, one paper of XOR and quoted-printable against
 * another of Polybius, affine and Playfair. Marking those on the same scale
 * would be unfair in a way the instructor could not see.
 *
 * Slot n takes difficulty n mod (number requested), so every paper carries the
 * same composition and only the specific techniques differ.
 */
function difficultyPlan(
  requested: Difficulty[] | undefined,
  slots: number,
  masterSeed: string,
): Difficulty[][] {
  /**
   * With no band requested, a fixed composition still has to be chosen. Leaving
   * each slot open looks harmless and is not: an unconstrained run produced six
   * papers with six different difficulty profiles — one student sat 1,5,4,4 and
   * another 2,2,1,4, marked on the same scale. "No preference" means the
   * instructor did not care which difficulties appear, never that students
   * should draw different ones from each other.
   *
   * So a ramp is built from the seed and then applied to every paper: the sheet
   * opens gently and gets harder, which is also how a paper should read.
   */
  if (!requested?.length) {
    const rng = makeRng(`plan:${masterSeed}`);
    const start = rng.int(1, 2) as Difficulty;
    return Array.from({ length: slots }, (_, i) => {
      const step = Math.floor((i * 4) / Math.max(1, slots - 1));
      return [Math.min(5, start + step) as Difficulty];
    });
  }

  const sorted = [...requested].sort((a, b) => a - b);
  return Array.from({ length: slots }, (_, i) => [sorted[i % sorted.length]]);
}

export function buildAssessment(spec: AssessmentSpec): Assessment {
  const papers = Math.max(1, Math.min(spec.papers, LIMITS.maxPapers));
  const perPaper = Math.max(1, Math.min(spec.problemsPerPaper, LIMITS.maxProblemsPerPaper));
  const used = new Set<string>();
  const plan = difficultyPlan(spec.difficulties, perPaper, spec.masterSeed);

  const built: Paper[] = [];
  for (let n = 1; n <= papers; n++) {
    const problems: PaperProblem[] = [];
    /**
     * Techniques already on this sheet. A paper that asked the same student to
     * do Caesar four times would be a worse test than one covering four
     * different techniques, so repeats are avoided within a paper while
     * remaining free to recur across papers.
     */
    const onThisPaper = new Set<string>();

    for (let q = 1; q <= perPaper; q++) {
      let generated = null;
      // A handful of attempts is enough to find a distinct technique; beyond
      // that the filter is probably narrower than the requested paper length,
      // and repeating is better than failing to produce a paper at all.
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = generateChallenge({
          techniqueIds: spec.techniqueIds,
          families: spec.families,
          difficulties: plan[q - 1],
          seed: `${spec.masterSeed}:p${n}:q${q}:a${attempt}`,
        });
        generated = candidate;
        if (!onThisPaper.has(candidate.publicPart.techniqueId)) break;
      }
      if (!generated) continue;

      onThisPaper.add(generated.publicPart.techniqueId);
      used.add(generated.publicPart.techniqueName);
      problems.push({
        index: q,
        challenge: generated.publicPart,
        solution: generated.solution,
      });
    }

    built.push({ number: n, code: paperCode(spec.masterSeed, n), problems });
  }

  return {
    title: spec.title.trim() || 'Cryptography assessment',
    masterSeed: spec.masterSeed,
    generatedAt: new Date().toISOString(),
    papers: built,
    techniquesUsed: [...used].sort(),
  };
}

/** Strip the solutions, for anything a student is allowed to see. */
export function withoutAnswers(assessment: Assessment) {
  return {
    ...assessment,
    papers: assessment.papers.map((p) => ({
      ...p,
      problems: p.problems.map(({ index, challenge }) => ({ index, challenge })),
    })),
  };
}
