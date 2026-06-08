/* Stable Matching — the preference model.
 *
 * Two groups, A and B, each of size n. The hidden engine of the whole app is a
 * shared "common preference": every member has a latent `quality` (their
 * desirability *to the other group*), and each person's ranked list is a blend
 *
 *     score(i → j) = consensus · quality[j] + (1 − consensus) · privateNoise
 *
 * so `consensus` is literally the weight on the common preference. At 0 every
 * list is private noise; at 1 everyone in a group ranks the other group
 * identically (the shared quality order).
 *
 * Everything is pure and seeded, so instances and runs are reproducible.
 */

/** Seeded PRNG (mulberry32) — reproducible instances and Lab cells. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Instance {
  n: number;
  /** quality[i] of each group-A member — drives how B ranks A. */
  qualityA: number[];
  qualityB: number[];
  /** prefsA[i] = B-indices, most-preferred first. */
  prefsA: number[][];
  prefsB: number[][];
  /** rankA[i][j] = position (0-based) of B-member j in A-member i's list. */
  rankA: number[][];
  rankB: number[][];
}

export interface GenParams {
  n: number;
  /** 0…1 weight on the common preference for group A's lists. */
  consensusA: number;
  consensusB: number;
  seed: number;
}

export function generateInstance({ n, consensusA, consensusB, seed }: GenParams): Instance {
  const rnd = mulberry32(seed);
  const qualityA = Array.from({ length: n }, () => rnd());
  const qualityB = Array.from({ length: n }, () => rnd());

  // rank `targetQuality` (the other group's desirability) with the given consensus weight
  const mkPrefs = (targetQuality: number[], consensus: number): number[][] =>
    Array.from({ length: n }, () => {
      const scored = targetQuality.map((q, idx) => ({ idx, s: consensus * q + (1 - consensus) * rnd() }));
      scored.sort((x, y) => y.s - x.s);
      return scored.map(o => o.idx);
    });

  const prefsA = mkPrefs(qualityB, consensusA); // A ranks B by B's quality
  const prefsB = mkPrefs(qualityA, consensusB); // B ranks A by A's quality

  const mkRank = (prefs: number[][]): number[][] =>
    prefs.map(list => {
      const r = new Array<number>(n);
      list.forEach((j, pos) => { r[j] = pos; });
      return r;
    });

  return { n, qualityA, qualityB, prefsA, prefsB, rankA: mkRank(prefsA), rankB: mkRank(prefsB) };
}
