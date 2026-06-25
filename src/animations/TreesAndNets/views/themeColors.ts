// Theme-tracking colors for the Nets views (theming v2). These views are SVG/DOM,
// so var(--token) resolves live in attributes — only the interpolated weight/Q
// RAMPS need JS sampling. The old hardcoded teal→gold scene palette (C_TEAL /
// C_HI / weightColor / heat / tint) is replaced by this one hook so the views
// track the active skin × mode like the rest of the app.
//
// Role mapping (locked by CLAUDE.md "Color roles"):
//   - structure → --fg          (tree edges, net/graph structure, locked links, block arcs)
//   - highlight → --accent      (selection / recent / the outlined minimum)  ← UI voice
//   - node      → --accent-2     (single-category leaf / vertex dots)
//   - ramp(t)   → sequential colormap (ordered magnitude: split weights, Q values)

import { useThemeId } from '../../../chrome/skins';
import { themeMapsFor, sampleContinuous } from '../../../lib/colormapRegistry';

export interface NetColors {
  /** Neutral structure marks (tree edges, net chords, locked links, block arcs). */
  structure: string;
  /** UI-voice highlight (selection / recent / outlined minimum). */
  highlight: string;
  /** Single-category point dots (leaves / vertices). */
  node: string;
  /** Ordered magnitude t∈[0,1] → a #rrggbb from the theme's sequential colormap. */
  ramp: (t: number) => string;
}

export function useNetColors(): NetColors {
  const themeId = useThemeId();
  const seq = themeMapsFor('sequential', themeId)[0];
  const ramp = (t: number): string =>
    sampleContinuous(seq, Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0)));
  return {
    structure: 'var(--fg)',
    highlight: 'var(--accent)',
    node: 'var(--accent-2, var(--accent))',
    ramp,
  };
}
