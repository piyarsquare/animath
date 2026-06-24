import { functionNames, POW_PQ_INDEX, QUADRATIC_INDEX } from './complexMath';

/**
 * The shared identity of a complex function, as the two viewers model it: an
 * index into {@link functionNames}, plus the parameters the two parameterized
 * members need — `p`/`q` for `z^(p/q)` (index {@link POW_PQ_INDEX}) and the three
 * complex coefficients for `a·z²+b·z+c` (index {@link QUADRATIC_INDEX}).
 */
export interface FunctionState {
  index: number;
  p?: number;
  q?: number;
  quad?: { a: [number, number]; b: [number, number]; c: [number, number] };
}

/**
 * Pure URL-query codec for the cross-app function handoff (Phase-2 "graph ↔ map"):
 * Complex Particles (the 4D graph) and Plane Transform (the plane map) are two
 * views of the SAME function, so a deep link between them needs to carry only the
 * function's identity — never view/appearance state. Encoding by function *name*
 * (not raw index) keeps the link stable and human-editable, and survives the
 * append-only `functionNames` list. Anything unparseable decodes to `{}` (the
 * target keeps its own state), so a stale or hand-typed link never crashes.
 */
export function encodeFunction(s: FunctionState): string {
  const name = functionNames[s.index];
  if (!name) return '';
  const parts = [`fn=${encodeURIComponent(name)}`];
  if (s.index === POW_PQ_INDEX) {
    if (s.p !== undefined) parts.push(`p=${s.p}`);
    if (s.q !== undefined) parts.push(`q=${s.q}`);
  }
  if (s.index === QUADRATIC_INDEX && s.quad) {
    const pair = (c: [number, number]) => `${c[0]},${c[1]}`;
    parts.push(`a=${pair(s.quad.a)}`, `b=${pair(s.quad.b)}`, `c=${pair(s.quad.c)}`);
  }
  return parts.join('&');
}

/**
 * Parse a function seed from a hash or query string (e.g.
 * `'#/plane-transform?fn=exp'` or `'fn=powPQ&p=1&q=2'`). Returns only the fields
 * actually present and valid; `{}` when there is no parseable `fn`.
 */
export function decodeFunction(input: string): Partial<FunctionState> {
  const qi = input.indexOf('?');
  const query = qi >= 0 ? input.slice(qi + 1) : input;
  const P = new URLSearchParams(query);
  const fn = P.get('fn');
  if (!fn) return {};
  const index = functionNames.indexOf(fn);
  if (index < 0) return {};
  const out: Partial<FunctionState> = { index };
  const num = (k: string) => {
    const v = parseFloat(P.get(k) ?? '');
    return isFinite(v) ? v : undefined;
  };
  if (index === POW_PQ_INDEX) {
    const p = num('p'); const q = num('q');
    if (p !== undefined) out.p = p;
    if (q !== undefined) out.q = q;
  }
  if (index === QUADRATIC_INDEX) {
    const pair = (k: string): [number, number] | undefined => {
      const raw = P.get(k);
      if (!raw) return undefined;
      const [re, im] = raw.split(',').map(parseFloat);
      return isFinite(re) && isFinite(im) ? [re, im] : undefined;
    };
    const a = pair('a'); const b = pair('b'); const c = pair('c');
    if (a && b && c) out.quad = { a, b, c };
  }
  return out;
}
