/**
 * Polygon Worlds — the base layer: the algebra of a polygon edge-gluing schema.
 *
 * A closed surface is a 2n-gon with its edges identified in pairs. Reading the
 * boundary, each edge carries a generator letter and an orientation, giving an
 * **edge word** in {a, a⁻¹, b, b⁻¹, …} where every generator appears exactly
 * twice. From that word ALONE — no per-surface special cases — we derive
 * everything:
 *
 *   • the vertex identifications (union–find on the polygon's corners),
 *   • the Euler characteristic  χ = V − E + F,
 *   • orientability (does every generator appear once with each sign?),
 *   • the forced curvature sign (sign χ), and
 *   • the surface's place in the classification of closed surfaces.
 *
 * Canceling pairs (… c c⁻¹ …) are handled automatically: they raise the edge
 * count — presentation complexity — without changing the topology. (A hexagon
 * with a c c⁻¹ pair is still a torus.)
 *
 * This module is the foundation every geometry/rendering layer builds on. It owns
 * NO Three.js and does NO rendering — only the schema and its invariants, so it
 * can be exhaustively checked against the classification tables.
 */

/** One directed edge of the polygon: a generator index + whether it is inverted. */
export interface Letter { gen: number; inv: boolean }

/** The edge word, length 2n, read around the 2n-gon's boundary. */
export type EdgeWord = Letter[];

/** Parse an edge word from a string. Accepts spaced or compact forms, with
 *  inverses written as a suffix (`a⁻¹`, `a'`, `a^-1`, `a-1`) or as an uppercase
 *  letter in compact form (`abAB` ≡ `a b a⁻¹ b⁻¹`). Generators are indexed in
 *  order of first appearance. */
export function parseWord(s: string): EdgeWord {
  const trimmed = s.trim();
  const tokens = /\s/.test(trimmed) ? trimmed.split(/\s+/) : [...trimmed];
  const genIndex = new Map<string, number>();
  const genOf = (ch: string): number => {
    const k = ch.toLowerCase();
    if (!genIndex.has(k)) genIndex.set(k, genIndex.size);
    return genIndex.get(k)!;
  };
  const out: EdgeWord = [];
  for (const tok of tokens) {
    if (!tok) continue;
    const base = tok[0];
    if (!/[A-Za-z]/.test(base)) continue;
    const rest = tok.slice(1);
    const upperInverse = base !== base.toLowerCase();          // compact convention
    const suffixInverse = /['^⁻¹-]/.test(rest);                // explicit suffix
    out.push({ gen: genOf(base), inv: upperInverse || suffixInverse });
  }
  return out;
}

/** Canonical string form, e.g. `a b a⁻¹ b⁻¹`. */
export function wordToString(w: EdgeWord): string {
  return w.map((l) => String.fromCharCode(97 + l.gen) + (l.inv ? '⁻¹' : '')).join(' ');
}

/** Which two edges a generator glues, and whether the gluing reverses direction.
 *  Consumed by the (future) geometry layer to build the edge-pairing isometries. */
export interface EdgePairing { gen: number; edges: [number, number]; reversed: boolean }

export interface SchemaAnalysis {
  edges: number;                 // 2n, the polygon's edge/corner count
  generators: number;            // distinct generators = E (edge classes)
  V: number;                     // vertex classes after identification
  E: number;
  F: number;                     // 1 (the single polygon face)
  chi: number;                   // V − E + F
  orientable: boolean;
  curvature: 'positive' | 'flat' | 'negative';  // sign χ
  kind: 'orientable' | 'non-orientable';
  genus?: number;                // orientable: (2−χ)/2
  crosscaps?: number;            // non-orientable: 2−χ
  name: string;                  // canonical surface name
  pairings: EdgePairing[];
  valid: boolean;                // every generator appears exactly twice
  reason?: string;               // why invalid
}

class DSU {
  private p: number[];
  constructor(n: number) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(x: number): number { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
  union(a: number, b: number): void { this.p[this.find(a)] = this.find(b); }
  classes(): number { const s = new Set<number>(); for (let i = 0; i < this.p.length; i++) s.add(this.find(i)); return s.size; }
}

/** Analyse an edge word: identify the surface and all its invariants. */
export function analyzeSchema(w: EdgeWord): SchemaAnalysis {
  const n = w.length;                       // 2 · (polygon "n")
  const genCount = new Map<number, number[]>(); // gen → edge indices it appears at
  for (let i = 0; i < n; i++) {
    const arr = genCount.get(w[i].gen) ?? [];
    arr.push(i);
    genCount.set(w[i].gen, arr);
  }
  const E = genCount.size;
  const F = 1;

  // Validity: a closed-surface schema has every generator exactly twice.
  let valid = n % 2 === 0 && n >= 2;
  let reason: string | undefined;
  for (const [g, idx] of genCount) {
    if (idx.length !== 2) {
      valid = false;
      reason = `generator ${String.fromCharCode(97 + g)} appears ${idx.length}× (must be exactly 2)`;
      break;
    }
  }

  // Vertices: union the corners glued by each edge pairing. Corner i is the tail
  // of edge i (edge i runs corner i → corner i+1 mod n). A positive edge contributes
  // its generator tail at corner i and head at i+1; an inverse edge swaps them.
  const dsu = new DSU(n);
  const pairings: EdgePairing[] = [];
  if (valid) {
    const tail = (e: number) => (w[e].inv ? (e + 1) % n : e);
    const head = (e: number) => (w[e].inv ? e : (e + 1) % n);
    for (const [g, [i, j]] of genCount) {
      dsu.union(tail(i), tail(j));
      dsu.union(head(i), head(j));
      // reversed ⟺ the two occurrences carry the same sign (both x or both x⁻¹)
      pairings.push({ gen: g, edges: [i, j], reversed: w[i].inv === w[j].inv });
    }
  }
  const V = valid ? dsu.classes() : 0;
  const chi = valid ? V - E + F : NaN;

  // Orientable ⟺ every generator appears once with each sign.
  let orientable = true;
  for (const [, idx] of genCount) {
    if (idx.length === 2 && w[idx[0]].inv === w[idx[1]].inv) { orientable = false; break; }
  }

  const curvature: SchemaAnalysis['curvature'] = chi > 0 ? 'positive' : chi === 0 ? 'flat' : 'negative';
  const { kind, name, genus, crosscaps } = classify(chi, orientable);

  return { edges: n, generators: E, V, E, F, chi, orientable, curvature, kind, genus, crosscaps, name, pairings, valid, reason };
}

function classify(chi: number, orientable: boolean): {
  kind: SchemaAnalysis['kind']; name: string; genus?: number; crosscaps?: number;
} {
  if (orientable) {
    const genus = (2 - chi) / 2;
    const name = genus === 0 ? 'Sphere'
      : genus === 1 ? 'Torus'
        : genus === 2 ? 'Double torus (genus 2)'
          : `Genus-${genus} surface`;
    return { kind: 'orientable', name, genus };
  }
  const crosscaps = 2 - chi;
  const name = crosscaps === 1 ? 'Projective plane (ℝP²)'
    : crosscaps === 2 ? 'Klein bottle'
      : crosscaps === 3 ? 'Dyck’s surface (3 cross-caps)'
        : `${crosscaps} cross-cap surface`;
  return { kind: 'non-orientable', name, crosscaps };
}

/** Convenience: analyse a word given as a string. */
export function analyze(word: string): SchemaAnalysis {
  return analyzeSchema(parseWord(word));
}

/** The complexity ladder — canonical schemas, smallest-first, as a catalog the UI
 *  can offer. Each is just a word; all invariants come from {@link analyzeSchema}. */
export const SCHEMA_LADDER: { word: string; note: string }[] = [
  { word: 'a a⁻¹', note: 'sphere (2-gon)' },
  { word: 'a a', note: 'projective plane (2-gon)' },
  { word: 'a b a⁻¹ b⁻¹', note: 'torus' },
  { word: 'a b a⁻¹ b', note: 'Klein bottle' },
  { word: 'a a b b', note: 'Klein bottle (cross-cap form)' },
  { word: 'a a b b c c', note: '3 cross-caps' },
  { word: 'a b a⁻¹ b⁻¹ c d c⁻¹ d⁻¹', note: 'genus-2 (double torus)' },
  { word: 'a a b b c c d d', note: '4 cross-caps' },
];
