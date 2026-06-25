import { sampleContinuous, themeMapsFor } from '../../../lib/colormapRegistry';
import type { Outcome } from '@/lib/nbody';

/** Outcomes ranked by *goodness* for the divergent fate coloring (theming v2):
 *  happy at the good pole, destroyed at the bad pole; blowup is a numerical error
 *  (not an outcome) → a neutral. Shared by the Destiny Map, the MiniSim previews,
 *  and the Lab console so every outcome reads in one consistent voice. */
export const OUTCOME_GOODNESS: Record<Outcome, number> = {
  happy: 1, survived: 0.62, 'planet-ejected': 0.28, 'planet-destroyed': 0, blowup: -1,
};

/** An outcome's color in the current theme: the theme's recommended divergent
 *  colormap sampled by goodness (coolwarm flipped so good = cool pole). `blowup`
 *  (and any negative-goodness sentinel) returns the passed neutral. */
export function outcomeHex(themeId: string, o: Outcome, neutralHex: string): string {
  const g = OUTCOME_GOODNESS[o];
  if (g < 0) return neutralHex || '#808080';
  const div = themeMapsFor('divergent', themeId)[0] ?? 'rdbu';
  const flip = div === 'coolwarm';
  return sampleContinuous(div, flip ? 1 - g : g);
}
