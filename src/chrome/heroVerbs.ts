/**
 * Landing-hero verb pool + selector (used by src/chrome/Gallery.tsx).
 *
 * The hero headline reads "Small worlds you can <A>, <B>, and <C>." where
 * A/B/C are drawn fresh on each page load (and on each headline click). Tiers:
 * 0 = plain, 1 = lively, 2 = out-there. {@link rollHeroVerbs} guarantees at
 * least one tier-2 word and sorts the three by tier, so the strangest verb
 * always lands last as the punchline.
 *
 * To tune the voice: add/remove words, or move a word between tiers by changing
 * its tier number. The only rule — each word must read true in "Small worlds
 * you can ___." Keep a few tier-2 words so the punchline slot always has
 * something strange to draw. American spelling throughout (see CLAUDE.md).
 */
type HeroVerb = readonly [word: string, tier: 0 | 1 | 2];

const HERO_VERBS: readonly HeroVerb[] = [
  // tier 0 — plain
  ['adjust', 0], ['explore', 0], ['steer', 0], ['tune', 0], ['shift', 0], ['nudge', 0], ['open', 0], ['drag', 0],
  ['probe', 0], ['trace', 0], ['shape', 0], ['mold', 0], ['guide', 0], ['arrange', 0], ['rearrange', 0],
  ['reshape', 0], ['sample', 0], ['navigate', 0],
  // tier 1 — lively
  ['poke', 1], ['prod', 1], ['tilt', 1], ['jostle', 1], ['wobble', 1], ['ruffle', 1], ['stir', 1], ['shake', 1],
  ['twist', 1], ['bend', 1], ['warp', 1], ['coax', 1], ['spin', 1], ['pinch', 1], ['flick', 1], ['sway', 1],
  ['tease', 1], ['tickle', 1], ['jiggle', 1], ['knead', 1], ['squeeze', 1], ['stretch', 1], ['fold', 1],
  ['crumple', 1], ['swirl', 1], ['whirl', 1], ['rock', 1], ['tap', 1], ['tug', 1], ['yank', 1], ['jab', 1],
  ['churn', 1], ['wiggle', 1], ['waggle', 1], ['slosh', 1], ['swish', 1], ['bounce', 1], ['jolt', 1],
  // tier 2 — out there
  ['disturb', 2], ['unsettle', 2], ['perturb', 2], ['provoke', 2], ['rattle', 2], ['pester', 2], ['needle', 2],
  ['goad', 2], ['agitate', 2], ['rouse', 2], ['badger', 2], ['spook', 2], ['derange', 2], ['vex', 2], ['nettle', 2],
  ['discombobulate', 2], ['befuddle', 2], ['harass', 2], ['bamboozle', 2], ['flummox', 2], ['bewilder', 2],
  ['confound', 2], ['fluster', 2], ['nag', 2], ['taunt', 2], ['torment', 2], ['harry', 2], ['plague', 2],
  ['rile', 2], ['irk', 2], ['antagonize', 2], ['bedevil', 2], ['hector', 2], ['perplex', 2], ['frazzle', 2],
  ['unnerve', 2],
];

/** Draw three distinct verbs — at least one tier-2, sorted so it lands last. */
export function rollHeroVerbs(): [string, string, string] {
  const wild = HERO_VERBS.filter(v => v[1] === 2);
  const seed = wild[(Math.random() * wild.length) | 0];
  const chosen = new Set<number>([HERO_VERBS.indexOf(seed)]);
  while (chosen.size < 3) chosen.add((Math.random() * HERO_VERBS.length) | 0);
  return [...chosen]
    .map(i => HERO_VERBS[i])
    .sort((a, b) => a[1] - b[1]) // weird one (tier 2) lands last
    .map(v => v[0]) as [string, string, string];
}
