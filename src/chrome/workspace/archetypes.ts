/**
 * The panel vocabulary — 11 archetypes in 5 tiers (DESIGN-SPEC §3).
 * Every panel in every app is one of these; one icon = one meaning,
 * everywhere. The rail always orders by tier: Define → Render → Drive →
 * Analyze → System. A new app never introduces new icons — only a subset of
 * this alphabet. The vocabulary is CLOSED: propose changes in
 * docs/redesign/IN-PROGRESS.md, don't silently invent archetypes.
 */
export type Archetype =
  | 'subject' | 'domain'
  | 'view' | 'color' | 'marks' | 'motion'
  | 'drive' | 'playback'
  | 'lab' | 'readout'
  | 'quality';

export type Tier = 'Define' | 'Render' | 'Drive' | 'Analyze' | 'System';

export const ARCHETYPES: Record<Archetype, { icon: string; tier: Tier; tip: string }> = {
  subject:  { icon: 'fx',       tier: 'Define',  tip: 'What you are visualizing' },
  domain:   { icon: 'domain',   tier: 'Define',  tip: 'Input space, viewport or starting layout' },
  view:     { icon: 'camera',   tier: 'Render',  tip: 'Projection & camera' },
  color:    { icon: 'palette',  tier: 'Render',  tip: 'Coloring scheme' },
  marks:    { icon: 'sparkles', tier: 'Render',  tip: 'How points or cells are drawn' },
  motion:   { icon: 'waves',    tier: 'Render',  tip: 'Continuous animation' },
  drive:    { icon: 'move',     tier: 'Drive',   tip: 'Hands-on manipulation' },
  playback: { icon: 'play',     tier: 'Drive',   tip: 'Time transport — play, step, scrub' },
  lab:      { icon: 'flask',    tier: 'Analyze', tip: 'Batch experiments over many runs' },
  readout:  { icon: 'chart',    tier: 'Analyze', tip: 'Stats & plots' },
  quality:  { icon: 'gear',     tier: 'System',  tip: 'Resolution, detail & performance' },
};

export const TIER_ORDER: Tier[] = ['Define', 'Render', 'Drive', 'Analyze', 'System'];

/** Stable rail order: by tier first, then authored order within the tier. */
export function sortByTier<T extends { arch: Archetype }>(sections: T[]): T[] {
  return sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) =>
      (TIER_ORDER.indexOf(ARCHETYPES[a.s.arch].tier) - TIER_ORDER.indexOf(ARCHETYPES[b.s.arch].tier)) ||
      (a.i - b.i))
    .map(x => x.s);
}
