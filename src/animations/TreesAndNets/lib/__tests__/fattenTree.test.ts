// Fatten a tree → CDM: the starting tree is additive (NJ recovers it exactly),
// and fattening an edge adds a split that genuinely crosses the tree (a net).
import { describe, expect, it } from 'vitest';

import { computeNeighborJoining } from '../neighborJoining';
import { balancedTreeEdges, companionSide, fattenedMetric } from '../fattenTree';

describe('fatten a tree', () => {
  it('balanced tree edges are n−3 proper arc splits', () => {
    for (const n of [5, 6, 7, 8, 9]) {
      const edges = balancedTreeEdges(n);
      expect(edges.length).toBe(n - 3);
      edges.forEach((e) => {
        expect(e.side.length).toBeGreaterThanOrEqual(2);
        expect(e.side.length).toBeLessThanOrEqual(n - 2);
      });
      // keys are distinct
      expect(new Set(edges.map((e) => e.key)).size).toBe(edges.length);
    }
  });

  it('the fatten companion crosses its edge (incompatible — it opens a box)', () => {
    const n = 7;
    balancedTreeEdges(n).forEach((e) => {
      const c = companionSide(e.side, n);
      expect(c.length).toBe(e.side.length);
      const A = new Set(e.side);
      const B = new Set(c);
      const onlyA = e.side.filter((x) => !B.has(x)).length;
      const onlyB = c.filter((x) => !A.has(x)).length;
      const both = e.side.filter((x) => B.has(x)).length;
      // a genuine crossing: each side has private leaves and they also overlap
      expect(onlyA).toBeGreaterThan(0);
      expect(onlyB).toBeGreaterThan(0);
      expect(both).toBeGreaterThan(0);
    });
  });

  it('a pure tree (no fatten) is additive — NJ recovers exactly the tree splits', () => {
    for (const n of [6, 7, 8]) {
      const edges = balancedTreeEdges(n);
      const m = fattenedMetric(n, edges, { branchLen: 1, leafLen: 1, fatten: {} });
      const got = new Set(computeNeighborJoining(m).splitKeys);
      const want = new Set(edges.map((e) => e.key));
      expect(got).toEqual(want);
    }
  });

  it('fattening an edge changes the metric (adds the crossing split weight)', () => {
    const n = 7;
    const edges = balancedTreeEdges(n);
    const pure = fattenedMetric(n, edges, { branchLen: 1, leafLen: 1, fatten: {} });
    const e = edges[0];
    const fat = fattenedMetric(n, edges, { branchLen: 1, leafLen: 1, fatten: { [e.key]: 1 } });
    // every pair the companion separates gains exactly the fatten weight (1).
    const comp = new Set(companionSide(e.side, n));
    let changed = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const sep = comp.has(i) !== comp.has(j);
        if (sep) expect(fat.d[i][j]).toBeCloseTo(pure.d[i][j] + 1, 9);
        else expect(fat.d[i][j]).toBeCloseTo(pure.d[i][j], 9);
        if (fat.d[i][j] !== pure.d[i][j]) changed += 1;
      }
    }
    expect(changed).toBeGreaterThan(0);
  });
});
