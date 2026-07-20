import { apps } from '../apps';
import type { PreviewKind } from './previews';

/**
 * Gallery catalog — the landing-page cards, grouped by topic (DESIGN-SPEC §1).
 * Derives name/glyph/blurb from src/apps.ts (the canonical registry) and adds
 * the gallery-only metadata here: category, preview kind, the card's leading
 * question, starter rank and GPU badge. The card order follows src/apps.ts.
 * An app is shown only if it has a META entry below, so dropping an entry
 * retires its card while keeping the route live: `#/fractals-cpu` (legacy) is
 * intentionally absent.
 */
export type Category =
  | 'Transformations'
  | 'Iteration & Chaos'
  | 'Algorithms & Emergence'
  | 'Geometry & Topology'
  | 'Probability & Inference';

export const CATEGORIES: Array<'All' | Category> = [
  'All',
  'Transformations',
  'Iteration & Chaos',
  'Algorithms & Emergence',
  'Geometry & Topology',
  'Probability & Inference',
];

export interface AppCard {
  /** Stable id (hash without the leading slash) — also the workspace appId. */
  id: string;
  hash: string;
  name: string;
  glyph: string;
  blurb: string;
  cat: Category;
  kind: PreviewKind;
  /** The card's leading line: the question the app explores (or a crisp
   *  statement of what it does). Shown in place of the registry blurb. */
  question?: string;
  /** Rank in the quiet "start here" row (1..3). Absent = regular card. */
  starter?: number;
  /** Needs WebGL — shown as a small courtesy badge (failure is contained
   *  since the chrome-hardening pass, so this is information, not a warning). */
  gpu?: boolean;
  /** Parked/retired: shown only in the gallery's de-emphasized Storeroom section
   *  (out of the main grid and the category filter), but the route stays live. */
  storeroom?: boolean;
}

const META: Record<string, {
  cat: Category; kind: PreviewKind;
  question?: string; starter?: number; gpu?: boolean; storeroom?: boolean;
}> = {
  '/complex-particles': {
    cat: 'Transformations', kind: 'particles', starter: 1, gpu: true,
    question: 'What does a complex function look like — all of it at once? Fly around its 4D graph as a living cloud of particles.',
  },
  '/plane-transform': {
    cat: 'Transformations', kind: 'plane', gpu: true,
    question: 'What does f(z) do to the whole plane at once? Watch a colored grid bend under the map.',
  },
  '/fractals': {
    cat: 'Iteration & Chaos', kind: 'fractal', gpu: true,
    question: 'How does z² + c, repeated forever, draw an infinite coastline? Zoom until floating-point itself runs out.',
  },
  '/correspondence': {
    cat: 'Iteration & Chaos', kind: 'julia', gpu: true,
    question: 'Every point of the Mandelbrot set seeds its own Julia set — which ones bloom, and which shatter?',
  },
  '/trinary': {
    cat: 'Iteration & Chaos', kind: 'trinary', starter: 2, gpu: true,
    question: 'Can a planet with three suns know its own future? Watch a swarm of near-identical worlds agree — then scatter.',
  },
  '/agentic-sorting': {
    cat: 'Algorithms & Emergence', kind: 'sorting',
    question: 'What happens when a crowd of agents, each with its own strategy, tries to sort itself?',
  },
  '/stable-matching': {
    cat: 'Algorithms & Emergence', kind: 'matrix',
    question: 'When two sides rank each other, who wins the matching game — and does proposing first pay?',
  },
  '/polygon-worlds': {
    cat: 'Geometry & Topology', kind: 'polygon', starter: 3, gpu: true,
    question: 'Glue the edges of one square and step inside: which world are you walking in — torus, Klein bottle, sphere?',
  },
  '/trees-and-nets': {
    cat: 'Algorithms & Emergence', kind: 'treenet',
    question: 'How do you turn a table of distances back into the tree that made it — and what if it never was a tree?',
  },
  '/solid-worlds': {
    cat: 'Geometry & Topology', kind: 'solid', gpu: true,
    question: 'What is it like to live inside a closed universe made of one room? Walk through a wall and come back mirrored.',
  },
  '/argand': {
    cat: 'Transformations', kind: 'plane',
    question: 'What does multiplying look like? A spiral. Adding? A slide. Build y = mx + b for the plane and watch it move.',
  },
  '/counting-the-ways': {
    cat: 'Probability & Inference', kind: 'skellam',
    question: 'Why does a Bessel function appear when two Poisson counts race? Count the ways, one diagonal rung at a time.',
  },
  '/division-bells': {
    cat: 'Probability & Inference', kind: 'divergence', storeroom: true,
    question: 'How far apart are two bell curves, really? Two rulers — Mahalanobis and KL — measure the gap differently.',
  },
};

export const CARDS: AppCard[] = apps
  .filter(a => META[a.hash])
  .map(a => ({
    id: a.hash.replace(/^\//, ''),
    hash: a.hash,
    name: a.name,
    glyph: a.icon ?? '✦',
    blurb: a.blurb ?? '',
    ...META[a.hash],
  }));
