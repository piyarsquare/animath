// Theme-tracking colors for the Nets views (theming v2). These views are SVG/DOM,
// so var(--token) resolves live in attributes — only the interpolated weight/Q
// RAMPS need JS sampling.
//
// Role mapping (locked by CLAUDE.md "Color roles"):
//   - structure → --fg          (tree edges, net/graph structure, locked links, block arcs)
//   - highlight → --accent      (selection / recent / the outlined minimum)  ← UI voice
//   - node      → --accent-2     (single-category leaf / vertex dots)
//   - ramp(t)   → sequential colormap (ordered magnitude: split/edge weights, Q values)
//
// The ramp is the **edge/split weight** colormap, and it is theme-specific: each
// skin gets a sequential ramp built from its own identity hues (Observatory's
// gold·teal, Phosphor's CRT green, …) so the weights read as part of the skin
// rather than a generic scientific map. Stops run low→high with the high end the
// more visible one on that skin's native background (bright on dark skins, dark on
// light skins). Any skin without an entry falls back to its registry-recommended
// sequential map.

import { useThemeId } from '../../../chrome/skins';
import { themeMapsFor, sampleContinuous, lerpStops } from '../../../lib/colormapRegistry';

/** Per-skin weight ramps (skin id → low→high hex stops), tuned to each identity. */
const WEIGHT_STOPS: Record<string, string[]> = {
  dark:      ['#0e2b2b', '#16686a', '#2fa79a', '#74dcc7', '#ffce47', '#ffe9ad'], // Observatory · teal→gold
  light:     ['#efe6cf', '#e3c074', '#c79126', '#9a6410', '#6a3f08', '#3c2304'], // Paper · amber deepening
  neon:      ['#08111a', '#0e4f5a', '#1f9ea0', '#34e6cf', '#9bf0e6', '#dafaf4'], // Spectrum · cyan
  blueprint: ['#0c1e44', '#163a72', '#2c63a8', '#4f8fd6', '#90c2f5', '#dcebff'], // Blueprint · blue
  phosphor:  ['#04140a', '#0c3a1f', '#176e38', '#2db35c', '#3dff7a', '#bfffd4'], // Phosphor · CRT green
  daylight:  ['#dfe8f5', '#a7c4e8', '#6f9ad9', '#3f72ca', '#235aa8', '#143a72'], // Daylight · blue deepening
  primary:   ['#f1ead2', '#f5d21a', '#f0a31e', '#e8631f', '#c41f2e', '#7a0f1c'], // Primary · Bauhaus warm
  mirage:    ['#1a1230', '#3e2358', '#763a72', '#bd5878', '#ffb37a', '#ffe0bf'], // Mirage · dusk→peach
};

export interface NetColors {
  /** Neutral structure marks (tree edges, net chords, locked links, block arcs). */
  structure: string;
  /** UI-voice highlight (selection / recent / outlined minimum). */
  highlight: string;
  /** Single-category point dots (leaves / vertices). */
  node: string;
  /** Ordered magnitude t∈[0,1] → a #rrggbb from the theme's edge-weight colormap. */
  ramp: (t: number) => string;
}

export function useNetColors(): NetColors {
  const themeId = useThemeId();
  const stops = WEIGHT_STOPS[themeId];
  const seq = themeMapsFor('sequential', themeId)[0];
  const ramp = (t: number): string => {
    const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
    return stops ? lerpStops(stops, x) : sampleContinuous(seq, x);
  };
  return {
    structure: 'var(--fg)',
    highlight: 'var(--accent)',
    node: 'var(--accent-2, var(--accent))',
    ramp,
  };
}
