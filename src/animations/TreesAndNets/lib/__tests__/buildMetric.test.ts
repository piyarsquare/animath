// The metric builder: candidate edges + non-negative least-squares fit + rebuild.
import { describe, expect, it } from 'vitest';

import { type WeightedSplit, leafCount, metricFromSplits, preset } from '../metric';
import { computeNeighborJoining } from '../neighborJoining';
import { candidateSplits, fitWeights, metricFromItems } from '../buildMetric';

describe('metric builder', () => {
  it('tree source: candidates cover the NJ splits and a fit reproduces an additive metric exactly', () => {
    // An exactly additive 6-leaf tree metric (3 cherries + pendants).
    const splits: WeightedSplit[] = [
      ...Array.from({ length: 6 }, (_, i) => ({ side: [i], weight: 0.5 + 0.1 * i })),
      { side: [0, 1], weight: 1.0 },
      { side: [2, 3], weight: 1.2 },
      { side: [4, 5], weight: 0.8 },
    ];
    const m = metricFromSplits(6, splits);
    const items = candidateSplits(m, 'tree');
    const itemKeys = new Set(items.map((it) => it.key));
    // every interior NJ split is an editable candidate
    computeNeighborJoining(m).splitKeys.forEach((k) => expect(itemKeys.has(k)).toBe(true));
    // fit then rebuild reproduces the metric exactly
    const w = fitWeights(m, items);
    expect(w.every((x) => x >= -1e-9)).toBe(true);
    const rebuilt = metricFromItems(leafCount(m), items, w, m.leaves);
    for (let i = 0; i < 6; i += 1) {
      for (let j = i + 1; j < 6; j += 1) expect(rebuilt.d[i][j]).toBeCloseTo(m.d[i][j], 5);
    }
  });

  it('circular source: candidates are the circular split system; weights are non-negative and rebuild is symmetric', () => {
    const m = preset(6, 'conflict');
    const items = candidateSplits(m, 'circular');
    expect(items.length).toBeGreaterThan(6); // singletons + arcs
    const w = fitWeights(m, items);
    expect(w.length).toBe(items.length);
    expect(w.every((x) => x >= -1e-9)).toBe(true);
    const rebuilt = metricFromItems(leafCount(m), items, w, m.leaves);
    for (let i = 0; i < 6; i += 1) {
      expect(rebuilt.d[i][i]).toBe(0);
      for (let j = i + 1; j < 6; j += 1) expect(rebuilt.d[i][j]).toBe(rebuilt.d[j][i]);
    }
  });
});
