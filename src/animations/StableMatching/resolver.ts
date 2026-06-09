/* Roth–Vande Vate "random path to stability."
 *
 * From ANY matching — including the often-unstable synchronous-schedule result —
 * repeatedly pick a blocking pair and satisfy it (match them; their former
 * partners become single). This provably converges to *a* stable matching in
 * finitely many steps (Roth & Vande Vate, 1990). The number of repair steps is a
 * natural "cost to stabilize" — harder (more steps) when preferences are
 * disordered. We record each step so the visualizer can animate the purple
 * blocking cells healing one at a time.
 */
import type { Instance } from './model';
import { mulberry32 } from './model';
import type { Matching } from './galeShapley';

export interface ResolveStep {
  a: number; b: number;        // the (A,B) blocking pair satisfied this step
  freedA: number;              // the A-member left single (was b's partner); −1 if none
  freedB: number;              // the B-member left single (was a's partner); −1 if none
  remaining: number;           // blocking pairs left AFTER this step
}
export interface ResolveResult { start: Matching; steps: ResolveStep[]; matching: Matching; converged: boolean; }

const clone = (m: Matching): Matching => ({ a: m.a.slice(), b: m.b.slice() });

/** Every blocking pair (A i, B j): both strictly prefer each other to their partner. */
export function blockingPairList(inst: Instance, m: Matching): [number, number][] {
  const n = inst.n, out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const pr = m.a[i] === -1 ? Infinity : inst.rankA[i][m.a[i]];
    for (let j = 0; j < n; j++) {
      if (m.a[i] === j) continue;
      if (inst.rankA[i][j] < pr) { const pj = m.b[j] === -1 ? Infinity : inst.rankB[j][m.b[j]]; if (inst.rankB[j][i] < pj) out.push([i, j]); }
    }
  }
  return out;
}

/** Apply the first `k` resolution steps to `start` (for stepping the animation). */
export function replaySteps(start: Matching, steps: ResolveStep[], k: number): Matching {
  const m = clone(start);
  for (let s = 0; s < k && s < steps.length; s++) {
    const { a, b } = steps[s];
    const oldB = m.a[a], oldA = m.b[b];        // a's current B-partner, b's current A-partner
    if (oldB !== -1) m.b[oldB] = -1;
    if (oldA !== -1) m.a[oldA] = -1;
    m.a[a] = b; m.b[b] = a;
  }
  return m;
}

export function rothVandeVate(inst: Instance, start: Matching, seed = 1): ResolveResult {
  const m = clone(start);
  const rng = mulberry32((seed ^ 0x85ebca6b) >>> 0);
  const steps: ResolveStep[] = [];
  const maxSteps = inst.n * inst.n * 8 + 16;
  for (let it = 0; it < maxSteps; it++) {
    const bp = blockingPairList(inst, m);
    if (!bp.length) return { start, steps, matching: m, converged: true };
    const [a, b] = bp[Math.floor(rng() * bp.length)];
    const freedB = m.a[a], freedA = m.b[b];    // partners about to be displaced
    if (freedB !== -1) m.b[freedB] = -1;
    if (freedA !== -1) m.a[freedA] = -1;
    m.a[a] = b; m.b[b] = a;
    steps.push({ a, b, freedA, freedB, remaining: blockingPairList(inst, m).length });
  }
  return { start, steps, matching: m, converged: blockingPairList(inst, m).length === 0 };
}
