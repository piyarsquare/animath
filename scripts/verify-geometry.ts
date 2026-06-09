// Verify the geometry kernel against the invariants every constant-curvature
// geometry must satisfy. This is the real correctness gate for the kernel (CI is
// build-only). Run: npx --yes tsx scripts/verify-geometry.ts
//
// Mirrors scripts/verify-schemas.ts. Freeze the kernel interface only once green.
import { runBattery } from '../src/animations/PolygonWorlds/lib/invariants';

const checks = runBattery();
let fail = 0;
for (const c of checks) {
  if (!c.pass) fail++;
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `   (${c.detail})` : ''}`);
}

console.log(
  fail === 0
    ? `\n✓ ALL ${checks.length} GEOMETRY INVARIANTS HOLD`
    : `\n✗ ${fail}/${checks.length} INVARIANT(S) FAILED`,
);
process.exit(fail ? 1 : 0);
