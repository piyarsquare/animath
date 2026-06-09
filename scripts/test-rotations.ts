/* Cross-check the rotation enumeration against brute force, and verify the
 * named solutions are actually stable. Run:
 *   npx esbuild scripts/test-rotations.ts --bundle --platform=node --format=esm | node --input-type=module
 */
import { generateInstance } from '../src/animations/StableMatching/model';
import { blockingPairs, runRounds } from '../src/animations/StableMatching/galeShapley';
import { allStableMatchings, allStableBrute, namedSolutions, buildLattice, score } from '../src/animations/StableMatching/rotations';
import { rothVandeVate, replaySteps } from '../src/animations/StableMatching/resolver';

const sig = (m: { a: number[] }) => m.a.join(',');
let cases = 0, fails = 0;

function check(n: number, cA: number, cB: number, seed: number) {
  cases++;
  const inst = generateInstance({ n, consensusA: cA, consensusB: cB, seed });
  const fast = allStableMatchings(inst, 100000);
  const brute = allStableBrute(inst);
  const fastSet = new Set(fast.matchings.map(sig));
  const bruteSet = new Set(brute.map(sig));
  // 1. enumeration matches brute force exactly
  if (fastSet.size !== bruteSet.size || [...bruteSet].some(s => !fastSet.has(s))) {
    fails++; console.log(`FAIL enum n=${n} cA=${cA} cB=${cB} seed=${seed}: fast=${fastSet.size} brute=${bruteSet.size}`);
    return;
  }
  // 2. every enumerated matching is stable
  for (const M of fast.matchings) if (blockingPairs(inst, M) !== 0) { fails++; console.log(`FAIL unstable in set n=${n} seed=${seed}`); return; }
  // 3. named solutions are stable and in the set
  const named = namedSolutions(inst, fast.matchings);
  for (const [k, M] of Object.entries(named)) {
    if (blockingPairs(inst, M) !== 0) { fails++; console.log(`FAIL named ${k} unstable n=${n} seed=${seed}`); return; }
    if (!fastSet.has(sig(M))) { fails++; console.log(`FAIL named ${k} not in set n=${n} seed=${seed}`); return; }
  }
  // 4. egalitarian total ≤ both extremes; sex-equal diff ≤ both extremes
  const sa = score(inst, named.aOptimal), sb = score(inst, named.bOptimal), se = score(inst, named.egalitarian), sx = score(inst, named.sexEqual);
  if (se.total > sa.total || se.total > sb.total) { fails++; console.log(`FAIL egalitarian not minimal n=${n} seed=${seed}`); return; }
  if (sx.diff > sa.diff || sx.diff > sb.diff) { fails++; console.log(`FAIL sex-equal not minimal n=${n} seed=${seed}`); return; }
  // 5. lattice: node count matches; A-optimal is the unique top (rank 0)
  const lat = buildLattice(inst, fast.matchings);
  if (lat.nodes.length !== fast.matchings.length) { fails++; console.log(`FAIL lattice node count n=${n} seed=${seed}`); return; }
  // 6. RVV from the (often unstable) synchronous result converges to a matching IN the stable set
  const startM = runRounds(inst, 'alt', 50, seed).matching;
  const rvv = rothVandeVate(inst, startM, seed);
  if (!rvv.converged || blockingPairs(inst, rvv.matching) !== 0) { fails++; console.log(`FAIL RVV not converged n=${n} seed=${seed}`); return; }
  if (!fastSet.has(sig(rvv.matching))) { fails++; console.log(`FAIL RVV landed outside stable set n=${n} seed=${seed}`); return; }
  // replaying all steps reproduces the final matching
  if (sig(replaySteps(rvv.start, rvv.steps, rvv.steps.length)) !== sig(rvv.matching)) { fails++; console.log(`FAIL RVV replay n=${n} seed=${seed}`); return; }
}

for (let n = 2; n <= 7; n++)
  for (let seed = 1; seed <= 40; seed++)
    for (const [cA, cB] of [[0, 0], [0.3, 0.3], [0.5, 0.2], [0.7, 0.7], [1, 0], [0.9, 0.9]] as [number, number][])
      check(n, cA, cB, seed);

console.log(`\n${cases} cases, ${fails} failures`);
if (fails) process.exit(1);
console.log('ALL PASS ✓');
