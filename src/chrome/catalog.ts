import { apps } from '../apps';
import type { PreviewKind } from './previews';

/**
 * Gallery catalog — the 9 cards on the landing page, grouped by topic
 * (DESIGN-SPEC §1). Derives name/glyph/blurb from src/apps.ts (the canonical
 * registry, append-only) and adds the gallery-only metadata here: category
 * and preview kind. `#/fractals-cpu` is intentionally absent (unlisted
 * legacy route).
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
  '/plane-transform': { cat: 'Complex', kind: 'particles', hue: 0.45 },
  '/fractals': { cat: 'Fractal', kind: 'fractal' },
  '/correspondence': { cat: 'Fractal', kind: 'fractal' },
  '/topology-walk': { cat: 'Dynamics', kind: 'trinary' },
  '/trinary': { cat: 'Dynamics', kind: 'trinary' },
  '/stable-marriage': { cat: 'Algorithm', kind: 'trinary' },
  '/agentic-sorting': { cat: 'Algorithm', kind: 'particles', hue: 0.7 },
  '/stable-matching': { cat: 'Algorithm', kind: 'trinary' },
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
