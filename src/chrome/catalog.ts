import { apps } from '../apps';
import type { PreviewKind } from './previews';

/**
 * Gallery catalog — the landing-page cards, grouped by topic (DESIGN-SPEC §1).
 * Derives name/glyph/blurb from src/apps.ts (the canonical registry) and adds
 * the gallery-only metadata here: category and preview kind. The card order
 * follows src/apps.ts. An app is shown only if it has a META entry below, so
 * dropping an entry retires its card while keeping the route live:
 * `#/fractals-cpu` (legacy) and `#/stable-marriage` (retired in favor of
 * `#/stable-matching`) are intentionally absent.
 */
export type Category = 'Complex' | 'Fractal' | 'Dynamics' | 'Algorithm';

export const CATEGORIES: Array<'All' | Category> = ['All', 'Complex', 'Fractal', 'Dynamics', 'Algorithm'];

export interface AppCard {
  /** Stable id (hash without the leading slash) — also the workspace appId. */
  id: string;
  hash: string;
  name: string;
  glyph: string;
  blurb: string;
  cat: Category;
  kind: PreviewKind;
  /** Optional hue shift for particle previews so cards differ. */
  hue?: number;
}

const META: Record<string, { cat: Category; kind: PreviewKind; hue?: number }> = {
  '/complex-particles': { cat: 'Complex', kind: 'particles' },
  '/plane-transform': { cat: 'Complex', kind: 'plane' },
  '/fractals': { cat: 'Fractal', kind: 'fractal' },
  '/correspondence': { cat: 'Fractal', kind: 'julia' },
  '/trinary': { cat: 'Dynamics', kind: 'trinary' },
  '/agentic-sorting': { cat: 'Algorithm', kind: 'sorting' },
  '/stable-matching': { cat: 'Algorithm', kind: 'matrix' },
  '/polygon-worlds': { cat: 'Dynamics', kind: 'polygon' },
  '/trees-and-nets': { cat: 'Algorithm', kind: 'treenet' },
  '/solid-worlds': { cat: 'Dynamics', kind: 'solid' },
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
