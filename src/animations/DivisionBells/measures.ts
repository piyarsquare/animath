/**
 * A small *presentation* registry for the scalar divergence family — the rows the
 * "Yardsticks" panel maps over. The math stays in `gaussian2d.ts` (tested); this
 * only carries display metadata and a thin `compute` that dispatches to it. KL and
 * Mahalanobis stay bespoke in the app (they emit decompositions + canvas layers,
 * not a single scalar), so they are not in this list.
 *
 * Ordered as a teaching sequence, anchored by **Bayes error** — the operational
 * meaning every other measure is really estimating: how often the best possible
 * classifier must confuse the two bells.
 */
import {
  Gaussian2D, OverlapResult,
  klDivergence, bhattacharyya, hellinger, wasserstein2,
} from './gaussian2d';

export interface MeasureCtx {
  /** Numeric overlap (shared by TV + Bayes error), computed once per (P,Q,prior). */
  overlap: OverlapResult | null;
}

export interface MeasureSpec {
  id: string;
  /** Full name. */
  label: string;
  /** Compact symbol for the table. */
  symbol: string;
  /** One-line "what it is / how it relates". */
  note: string;
  symmetric: boolean;
  /** Value lives in [0, 1]. */
  bounded: boolean;
  /** A true metric (triangle inequality) vs a divergence. */
  metric: boolean;
  /** Closed form for Gaussians, or a numeric overlap integral. */
  method: 'closed' | 'numeric';
  /** Returns the scalar; NaN if it needs the overlap and none was supplied. */
  compute: (p: Gaussian2D, q: Gaussian2D, ctx: MeasureCtx) => number;
}

export const FAMILY: MeasureSpec[] = [
  {
    id: 'bayes',
    label: 'Bayes error',
    symbol: 'Pₑ',
    note: 'lowest possible error of a classifier telling P from Q — the anchor',
    symmetric: true,
    bounded: true,
    metric: false,
    method: 'numeric',
    compute: (_p, _q, ctx) => ctx.overlap?.bayesError ?? NaN,
  },
  {
    id: 'tv',
    label: 'Total variation',
    symbol: 'TV',
    note: '½∫|p−q| — a bounded metric; Pₑ = ½(1 − TV) at equal priors',
    symmetric: true,
    bounded: true,
    metric: true,
    method: 'numeric',
    compute: (_p, _q, ctx) => ctx.overlap?.tv ?? NaN,
  },
  {
    id: 'hellinger',
    label: 'Hellinger',
    symbol: 'H',
    note: '√(1 − BC) — a bounded true metric on distributions',
    symmetric: true,
    bounded: true,
    metric: true,
    method: 'closed',
    compute: (p, q) => hellinger(p, q).distance,
  },
  {
    id: 'bhattacharyya',
    label: 'Bhattacharyya',
    symbol: 'D_B',
    note: '−ln∫√(pq) — the symmetric sibling of KL; bounds Pₑ ≤ ½·BC',
    symmetric: true,
    bounded: false,
    metric: false,
    method: 'closed',
    compute: (p, q) => bhattacharyya(p, q).distance,
  },
  {
    id: 'wasserstein',
    label: 'Wasserstein-2',
    symbol: 'W₂',
    note: 'optimal transport — how far the mass must move (geometry-aware)',
    symmetric: true,
    bounded: false,
    metric: true,
    method: 'closed',
    compute: (p, q) => wasserstein2(p, q).distance,
  },
  {
    id: 'kl',
    label: 'KL divergence',
    symbol: 'KL',
    note: 'the asymmetric, unbounded outlier; TV ≤ √(KL/2) (Pinsker)',
    symmetric: false,
    bounded: false,
    metric: false,
    method: 'closed',
    compute: (p, q) => klDivergence(p, q),
  },
];
