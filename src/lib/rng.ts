/** Shared seeded RNG. The first shared copy — six private `mulberry32`s still
 *  live in individual apps (see docs/sessions/TODO.md); new code imports this one.
 *  Deliberately tiny: a generator and a per-run seed derivation, nothing else, so a
 *  later "improvement" here cannot silently change every app's trajectories. */

/** Fast, decent 32-bit PRNG. Returns uniforms in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-run seed derived from a base seed and a run index (golden-ratio stride). */
export function runSeed(baseSeed: number, index: number): number {
  return (baseSeed + Math.imul(index, 0x9e3779b9)) >>> 0;
}

export type Rng = () => number;
