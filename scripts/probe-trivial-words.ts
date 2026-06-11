// Which hexagon words give SMOOTH flat worlds (equal corner classes ⇒ no cone
// points on a regular hexagon), and what's the full honest n-gon catalog?
import { analyze, parseWord } from '../src/animations/PolygonWorlds/surfaceSchema';
import { realize } from '../src/animations/PolygonWorlds/lib/realize';

// corner-class sizes via the same union-find convention as realize.ts
function classSizes(word: ReturnType<typeof parseWord>): number[] {
  const m = word.length;
  const parent = Array.from({ length: m }, (_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  const tail = (e: number) => (word[e].inv ? (e + 1) % m : e);
  const head = (e: number) => (word[e].inv ? e : (e + 1) % m);
  const byGen = new Map<number, number[]>();
  for (let e = 0; e < m; e++) { const a = byGen.get(word[e].gen) ?? []; a.push(e); byGen.set(word[e].gen, a); }
  for (const [, [i, j]] of byGen) { union(tail(i), tail(j)); union(head(i), head(j)); }
  const sizes = new Map<number, number>();
  for (let c = 0; c < m; c++) { const r = find(c); sizes.set(r, (sizes.get(r) ?? 0) + 1); }
  return [...sizes.values()].sort((a, b) => a - b);
}

// enumerate all hexagon words on letters a,b,c (each exactly twice, ± orientation)
const letters = ['a', 'b', 'c'];
const seen = new Set<string>();
const results: string[] = [];
function* arrangements(slots: (string | null)[], remaining: [string, boolean][]): Generator<string[]> {
  const i = slots.indexOf(null);
  if (i < 0) { yield slots as string[]; return; }
  const used = new Set<string>();
  for (let k = 0; k < remaining.length; k++) {
    const [g] = remaining[k];
    if (used.has(g)) continue;
    used.add(g);
    for (const inv of [false, true]) {
      const s = slots.slice(); s[i] = g + (inv ? '⁻¹' : '');
      const rest = remaining.slice(); rest.splice(k, 1);
      yield* arrangements(s, rest);
    }
  }
}
const pool: [string, boolean][] = letters.flatMap((g) => [[g, false], [g, false]] as [string, boolean][]);
for (const arr of arrangements(Array(6).fill(null), pool)) {
  const wordStr = arr.join(' ');
  try {
    const w = parseWord(wordStr);
    const a = analyze(wordStr);
    if (!(a as any).valid && (a as any).valid !== undefined) continue;
    if (a.chi !== 0) continue;
    const sizes = classSizes(w);
    const smooth = sizes.every((s) => s === sizes[0]);
    const key = `${a.orientable}|${smooth}`;
    const sig = `${a.name} ${a.orientable ? 'or' : 'NON'} classes=[${sizes.join(',')}] ${smooth ? 'SMOOTH' : 'cone'}`;
    if (smooth) {
      const tag = `${wordStr}  →  ${sig}`;
      if (!seen.has(a.orientable + wordStr)) results.push(tag);
      seen.add(a.orientable + wordStr);
    }
  } catch { /* invalid word shape */ }
}
console.log('χ=0 hexagon words with EQUAL corner classes (smooth flat):');
const kleinOnes = results.filter((r) => r.includes('NON'));
const torusOnes = results.filter((r) => r.includes(' or '));
console.log(`  torus presentations: ${torusOnes.length} (e.g.)`);
torusOnes.slice(0, 3).forEach((r) => console.log('   ', r));
console.log(`  Klein presentations: ${kleinOnes.length} (e.g.)`);
kleinOnes.slice(0, 6).forEach((r) => console.log('   ', r));

// and the four candidate spherical n-gon worlds, with smoothness/chart status
for (const w of ['a b c a b c', 'a b c d a b c d', 'a a⁻¹ b b⁻¹ c c⁻¹', 'a a⁻¹ b b⁻¹ c c⁻¹ d d⁻¹']) {
  const a = analyze(w);
  const r = realize(parseWord(w));
  console.log(`${w.padEnd(26)} ${a.name} χ=${a.chi} classes=[${classSizes(parseWord(w)).join(',')}] chart=${r.chart} R=${r.circumradius.toFixed(3)}`);
}
