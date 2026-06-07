// Verify the base-layer schema engine against the classification tables.
// Run: npx --yes tsx scripts/verify-schemas.ts
import { analyze, parseWord, wordToString } from '../src/animations/PolygonWorlds/surfaceSchema';

// [word, χ, orientable, curvature, expected surface family]
const rows: [string, number, boolean, string, string][] = [
  ['a a⁻¹',                         2,  true,  'positive', 'Sphere'],
  ['a a',                           1,  false, 'positive', 'Projective plane'],
  ['a b a⁻¹ b⁻¹',                   0,  true,  'flat',     'Torus'],
  ['a b a⁻¹ b',                     0,  false, 'flat',     'Klein bottle'],
  ['a a b b',                       0,  false, 'flat',     'Klein bottle'],
  ['a a⁻¹ b b⁻¹',                   2,  true,  'positive', 'Sphere'],
  ['a b a⁻¹ b⁻¹ c c⁻¹',             0,  true,  'flat',     'Torus'],
  ['a a⁻¹ b b⁻¹ c c⁻¹',             2,  true,  'positive', 'Sphere'],
  ['a a b b c c',                  -1,  false, 'negative', 'cross-cap'],
  ['a b a⁻¹ b⁻¹ c d c⁻¹ d⁻¹',      -2,  true,  'negative', 'genus 2'],
  ['a a b b c c d d',              -2,  false, 'negative', '4 cross-cap'],
];

let fail = 0;
for (const [w, chi, ori, curv, fam] of rows) {
  const a = analyze(w);
  const nameOk = a.name.toLowerCase().includes(fam.toLowerCase());
  const ok = a.valid && a.chi === chi && a.orientable === ori && a.curvature === curv && nameOk;
  if (!ok) fail++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${w.padEnd(26)} edges=${a.edges} V=${a.V} E=${a.E} ` +
    `χ=${String(a.chi).padStart(2)} ${(a.orientable ? 'orientable' : 'non-orient').padEnd(11)} ` +
    `${a.curvature.padEnd(8)} ${a.name}` +
    (ok ? '' : `   << expected χ=${chi} ${ori ? 'orientable' : 'non-orient'} ${curv} (${fam})`),
  );
}

// Parser sanity: compact uppercase-inverse equals the spaced form.
const compact = analyze('abAB'), spaced = analyze('a b a⁻¹ b⁻¹');
const parseOk = compact.chi === spaced.chi && compact.orientable === spaced.orientable;
console.log(`\n${parseOk ? 'PASS' : 'FAIL'}  parser: "abAB" → ${wordToString(parseWord('abAB'))} (χ=${compact.chi})`);
if (!parseOk) fail++;

console.log(fail === 0 ? '\n✓ ALL SCHEMAS MATCH THE TABLES' : `\n✗ ${fail} MISMATCH(ES)`);
process.exit(fail ? 1 : 0);
