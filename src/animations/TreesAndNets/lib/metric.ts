// Distance matrices over a leaf set — the input every tree/split/order routine
// consumes. A `DistanceMatrix` is a symmetric, zero-diagonal pairwise metric.
//
// REPRESENTATION CONVENTION:
//   - Leaves are 0-based indices `0..n-1`; `leaves[i]` is leaf i's display label.
//   - `d[i][j] = d[j][i]` is the distance between leaf i and leaf j; `d[i][i]=0`.
//
// This module also reproduces quantum-tree's named metric presets (docs/map.js
// `mapConfigs` + `presetMetricFromSplits` / `presetCycleMetric` /
// `presetStarMetric`) for n = 4..8, and adds an exact canonical circular-unit
// ("cycle") metric for every n.
//
// `metricFromSplits` is the additive-metric builder: each split contributes its
// weight to every pair it separates (faithful to map.js
// `presetMetricFromSplits`, generalized to indices).

export type DistanceMatrix = {
  /** Display labels, one per leaf; `leaves.length` is n. */
  leaves: string[];
  /** Symmetric n×n matrix, zero diagonal. */
  d: number[][];
};

/** A split as a set of leaf indices on one side, carrying a branch weight. */
export interface WeightedSplit {
  /** Leaf indices on one side of the split (the other side is the complement). */
  side: number[];
  /** Non-negative branch length contributed to every separated pair. */
  weight: number;
}

/** Number of leaves. */
export function leafCount(m: DistanceMatrix): number {
  return m.leaves.length;
}

/** Distance between leaves i and j (indices). */
export function dist(m: DistanceMatrix, i: number, j: number): number {
  return m.d[i][j];
}

/** Default labels a, b, c, … for n leaves (matches quantum-tree). */
export function defaultLeaves(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i));
}

/**
 * Build an additive metric from a list of weighted splits: d(i,j) is the sum of
 * the weights of all splits that separate i from j. Faithful port of map.js
 * `presetMetricFromSplits` (generalized to indices and to weights ≠ 1).
 */
export function metricFromSplits(n: number, splits: WeightedSplit[], leaves?: string[]): DistanceMatrix {
  const sides = splits.map((s) => ({ set: new Set(s.side), weight: s.weight }));
  const d: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      let sum = 0;
      for (const s of sides) {
        if (s.set.has(i) !== s.set.has(j)) sum += s.weight;
      }
      d[i][j] = sum;
      d[j][i] = sum;
    }
  }
  return { leaves: leaves ?? defaultLeaves(n), d };
}

/**
 * The canonical circular-unit ("cycle 1s") metric: with leaves in the identity
 * circular order 0,1,…,n-1 around a circle, d(i,j) is the number of circular
 * splits of that order that separate i and j. This equals min(gap, n-gap) where
 * gap = |i-j| — i.e. the shorter arc length between i and j on the n-cycle.
 *
 * This is exact (not a generator with jitter): it is `metricFromSplits` over the
 * full set of circular intervals of the identity order, all weight 1. We compute
 * it directly as the shorter circular gap, which is provably equal.
 */
export function cycleMetric(n: number, leaves?: string[]): DistanceMatrix {
  const d: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const gap = Math.abs(i - j);
      const v = Math.min(gap, n - gap);
      d[i][j] = v;
      d[j][i] = v;
    }
  }
  return { leaves: leaves ?? defaultLeaves(n), d };
}

/** A uniform star metric: every pair at distance `value`. (map.js `presetStarMetric`.) */
export function starMetric(n: number, value = 3, leaves?: string[]): DistanceMatrix {
  const d: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      d[i][j] = value;
      d[j][i] = value;
    }
  }
  return { leaves: leaves ?? defaultLeaves(n), d };
}

// ---------------------------------------------------------------------------
// quantum-tree named presets (faithful reproduction of docs/map.js mapConfigs).
// Literal tables for n=4..7; generators for n=8. Distances are keyed by the
// pair label (e.g. "ad"); we materialize them into the index matrix.
// ---------------------------------------------------------------------------

type LabelPairTable = Record<string, number>;

/** Materialize a label-keyed pair table (e.g. {ad: 4.2}) into a DistanceMatrix. */
function fromPairTable(leaves: string[], table: LabelPairTable): DistanceMatrix {
  const n = leaves.length;
  const idx = new Map(leaves.map((l, i) => [l, i]));
  const d: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (const [key, value] of Object.entries(table)) {
    // Keys are two single-character labels concatenated in leaf order.
    const a = idx.get(key[0]);
    const b = idx.get(key[1]);
    if (a === undefined || b === undefined) continue;
    d[a][b] = value;
    d[b][a] = value;
  }
  return { leaves, d };
}

/** map.js `presetCycleMetric`: spaced by circular gap with a deterministic jitter. */
function presetCycleMetric(
  leaves: string[],
  order: string[],
  base: number,
  step: number,
): DistanceMatrix {
  const n = leaves.length;
  const orderIndex = new Map(order.map((leaf, index) => [leaf, index]));
  const d: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let leftIndex = 0; leftIndex < n; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < n; rightIndex += 1) {
      const li = orderIndex.get(leaves[leftIndex]) ?? 0;
      const ri = orderIndex.get(leaves[rightIndex]) ?? 0;
      const circularGap = Math.abs(li - ri);
      const gap = Math.min(circularGap, n - circularGap);
      const variation = ((leftIndex * 7 + rightIndex * 3) % 5) * 0.08;
      const value = Number((base + gap * step + variation).toFixed(2));
      d[leftIndex][rightIndex] = value;
      d[rightIndex][leftIndex] = value;
    }
  }
  return { leaves, d };
}

/** Preset names quantum-tree ships per leaf count. */
export type PresetName = 'tree' | 'blend' | 'conflict' | 'star' | 'cycle';

const TABLES_4 = {
  tree: { ab: 2, ac: 4, ad: 4, bc: 4, bd: 4, cd: 2 },
  blend: { ab: 2.4, ac: 2.7, ad: 4.2, bc: 4.0, bd: 2.8, cd: 2.5 },
  conflict: { ab: 4, ac: 2, ad: 4, bc: 4, bd: 2, cd: 4 },
  star: { ab: 3, ac: 3, ad: 3, bc: 3, bd: 3, cd: 3 },
} satisfies Record<string, LabelPairTable>;

const TABLES_5 = {
  tree: { ab: 2.0, ac: 4.7, ad: 4.7, ae: 3.5, bc: 4.7, bd: 4.7, be: 3.5, cd: 2.0, ce: 3.2, de: 3.2 },
  blend: { ab: 2.2, ac: 3.4, ad: 4.4, ae: 3.0, bc: 3.5, bd: 4.2, be: 3.1, cd: 2.8, ce: 2.7, de: 3.4 },
  conflict: { ab: 2.0, ac: 2.4, ad: 4.8, ae: 3.6, bc: 3.1, bd: 4.5, be: 3.4, cd: 2.1, ce: 4.6, de: 2.5 },
  star: { ab: 3, ac: 3, ad: 3, ae: 3, bc: 3, bd: 3, be: 3, cd: 3, ce: 3, de: 3 },
} satisfies Record<string, LabelPairTable>;

const TABLES_6 = {
  tree: {
    ab: 2.0, ac: 4.8, ad: 4.8, ae: 4.2, af: 4.2, bc: 4.8, bd: 4.8, be: 4.2, bf: 4.2,
    cd: 2.0, ce: 4.5, cf: 4.5, de: 4.5, df: 4.5, ef: 2.0,
  },
  blend: {
    ab: 2.1, ac: 3.4, ad: 4.4, ae: 3.7, af: 4.1, bc: 3.6, bd: 4.0, be: 3.3, bf: 3.9,
    cd: 2.6, ce: 4.2, cf: 3.5, de: 3.8, df: 2.9, ef: 2.4,
  },
  conflict: {
    ab: 2.0, ac: 2.5, ad: 4.8, ae: 3.9, af: 4.5, bc: 3.0, bd: 4.6, be: 3.4, bf: 4.1,
    cd: 2.1, ce: 4.7, cf: 3.2, de: 4.0, df: 2.3, ef: 3.6,
  },
  star: {
    ab: 3, ac: 3, ad: 3, ae: 3, af: 3, bc: 3, bd: 3, be: 3, bf: 3,
    cd: 3, ce: 3, cf: 3, de: 3, df: 3, ef: 3,
  },
} satisfies Record<string, LabelPairTable>;

const TABLES_7 = {
  tree: {
    ab: 2.0, ac: 4.8, ad: 4.8, ae: 5.2, af: 5.2, ag: 3.8, bc: 4.8, bd: 4.8, be: 5.2, bf: 5.2, bg: 3.8,
    cd: 2.0, ce: 5.0, cf: 5.0, cg: 3.8, de: 5.0, df: 5.0, dg: 3.8, ef: 2.0, eg: 4.2, fg: 4.2,
  },
  blend: {
    ab: 2.1, ac: 3.4, ad: 4.4, ae: 3.7, af: 4.1, ag: 3.2, bc: 3.6, bd: 4.0, be: 3.3, bf: 3.9, bg: 3.5,
    cd: 2.6, ce: 4.2, cf: 3.5, cg: 3.0, de: 3.8, df: 2.9, dg: 3.3, ef: 2.4, eg: 3.6, fg: 2.8,
  },
  conflict: {
    ab: 2.0, ac: 2.5, ad: 4.8, ae: 3.9, af: 4.5, ag: 3.1, bc: 3.0, bd: 4.6, be: 3.4, bf: 4.1, bg: 3.7,
    cd: 2.1, ce: 4.7, cf: 3.2, cg: 4.3, de: 4.0, df: 2.3, dg: 3.0, ef: 3.6, eg: 2.6, fg: 4.2,
  },
  star: {
    ab: 3, ac: 3, ad: 3, ae: 3, af: 3, ag: 3, bc: 3, bd: 3, be: 3, bf: 3, bg: 3,
    cd: 3, ce: 3, cf: 3, cg: 3, de: 3, df: 3, dg: 3, ef: 3, eg: 3, fg: 3,
  },
} satisfies Record<string, LabelPairTable>;

/** n=8 presets, generated exactly as map.js `createEightLeafMapConfig`. */
function eightLeafPreset(name: Exclude<PresetName, 'cycle'>): DistanceMatrix {
  const leaves = defaultLeaves(8);
  const idx = (l: string): number => leaves.indexOf(l);
  switch (name) {
    case 'tree': {
      // map.js builds this from singletons (weight 1) + a few interior splits.
      const splits: WeightedSplit[] = [
        ...leaves.map((leaf) => ({ side: [idx(leaf)], weight: 1.0 })),
        { side: ['a', 'b'].map(idx), weight: 1.15 },
        { side: ['c', 'd'].map(idx), weight: 1.15 },
        { side: ['e', 'f'].map(idx), weight: 1.2 },
        { side: ['g', 'h'].map(idx), weight: 1.2 },
        { side: ['a', 'b', 'c', 'd'].map(idx), weight: 1.3 },
      ];
      return metricFromSplits(8, splits, leaves);
    }
    case 'blend':
      return presetCycleMetric(leaves, leaves, 1.25, 0.64);
    case 'conflict':
      return presetCycleMetric(leaves, ['a', 'c', 'e', 'g', 'b', 'd', 'f', 'h'], 1.2, 0.68);
    case 'star':
      return starMetric(8, 3, leaves);
  }
}

const LITERAL_TABLES: Record<number, Record<string, LabelPairTable>> = {
  4: TABLES_4,
  5: TABLES_5,
  6: TABLES_6,
  7: TABLES_7,
};

/**
 * The named metric preset for `n` leaves. `'cycle'` is the exact canonical
 * circular-unit metric (defined for every n ≥ 3); the others reproduce
 * quantum-tree's `mapConfigs` for n = 4..8.
 */
export function preset(n: number, name: PresetName): DistanceMatrix {
  if (name === 'cycle') return cycleMetric(n);
  if (n === 8) return eightLeafPreset(name);
  const tables = LITERAL_TABLES[n];
  if (tables && tables[name]) return fromPairTable(defaultLeaves(n), tables[name]);
  // Sensible fallbacks for n outside the shipped range.
  if (name === 'star') return starMetric(n);
  return cycleMetric(n);
}

/** All preset names available for a given n (cycle is always available). */
export function presetNames(n: number): PresetName[] {
  const base: PresetName[] = ['tree', 'blend', 'conflict', 'star', 'cycle'];
  if (n >= 4 && n <= 8) return base;
  return ['star', 'cycle'];
}
