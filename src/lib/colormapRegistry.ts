/**
 * colormapRegistry — JS/CSS-side colormaps for DOM & 2D-canvas apps, typed by
 * FAMILY (purpose). The data picks the family; the theme + user pick within it.
 *
 *   sequential  — ordered magnitude in one direction (counts, density, error)
 *   divergent   — deviation from a meaningful midpoint (signed, rank-as-satisfaction)
 *   discrete    — unordered categories (sides, clusters)  ← the theme's --data tokens
 *   cyclic      — angles / phase that wrap (complex argument, hue, direction)
 *
 * Shader apps keep using lib/colormaps.ts (PALETTE_GLSL); names are kept in sync
 * so "Viridis" matches on both sides.
 */
export type ColorFamily = 'sequential' | 'divergent' | 'discrete' | 'cyclic';

export interface Colormap {
  id: string;
  name: string;
  family: ColorFamily;
  cb: boolean;        // colorblind-safe
  stops: string[];    // hex anchors, low → high
}

export const COLORMAPS: Record<string, Colormap> = {
  // sequential (perceptually uniform)
  viridis: { id: 'viridis', name: 'Viridis', family: 'sequential', cb: true,  stops: ['#440154','#46327e','#365c8d','#277f8e','#1fa187','#4ac16d','#a0da39','#fde725'] },
  mako:    { id: 'mako',    name: 'Mako',    family: 'sequential', cb: true,  stops: ['#0b0405','#272a4f','#36558f','#357ba3','#37ada4','#5fd0ac','#aae0bb','#def5e5'] },
  magma:   { id: 'magma',   name: 'Magma',   family: 'sequential', cb: true,  stops: ['#000004','#1c1044','#4f127b','#812581','#b5367a','#e55064','#fb8761','#fec287'] },
  amber:   { id: 'amber',   name: 'Amber',   family: 'sequential', cb: false, stops: ['#2a1403','#572200','#8a3a00','#b85c00','#dd8400','#f3ad33','#fcd070','#ffeeb0'] },
  // divergent
  rdbu:    { id: 'rdbu',    name: 'RdBu',    family: 'divergent',  cb: true,  stops: ['#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac'] },
  rdylbu:  { id: 'rdylbu',  name: 'RdYlBu',  family: 'divergent',  cb: true,  stops: ['#d73027','#f46d43','#fdae61','#fee090','#e0f3f8','#abd9e9','#74add1','#4575b4'] },
  puor:    { id: 'puor',    name: 'PuOr',    family: 'divergent',  cb: true,  stops: ['#b35806','#e08214','#fdb863','#fee0b6','#d8daeb','#b2abd2','#8073ac','#542788'] },
  brbg:    { id: 'brbg',    name: 'BrBG',    family: 'divergent',  cb: true,  stops: ['#8c510a','#bf812d','#dfc27d','#f6e8c3','#c7eae5','#80cdc1','#35978f','#01665e'] },
  coolwarm:{ id: 'coolwarm',name: 'Coolwarm',family: 'divergent', cb: false, stops: ['#3b4cc0','#6788ee','#9abbff','#c9d7f0','#edd1c2','#f7a789','#e36a53','#b40426'] },
  // cyclic
  twilight:{ id: 'twilight',name: 'Twilight',family: 'cyclic',    cb: true,  stops: ['#e2d9e2','#9aa0c9','#5d6bb0','#3f3a6e','#48295a','#7c3a5b','#b9636a','#e0a98f','#e2d9e2'] },
  // discrete is theme-supplied — see discreteStops()
};

export const FAMILIES: Record<ColorFamily, { label: string; note: string }> = {
  sequential: { label: 'Perceptually uniform', note: 'ordered magnitude · one direction' },
  divergent:  { label: 'Divergent',            note: 'deviation from a midpoint' },
  discrete:   { label: 'Discrete',             note: "unordered categories · theme's data palette" },
  cyclic:     { label: 'Cyclic',               note: 'angles / phase that wrap' },
};

/** Per-theme recommendations (default first). Discrete needs none (it's the tokens). */
export const THEME_MAPS: Record<string, Partial<Record<ColorFamily, string[]>>> = {
  dark:      { sequential: ['viridis','mako'],  divergent: ['rdbu','coolwarm'], cyclic: ['twilight'] },
  light:     { sequential: ['amber','viridis'], divergent: ['rdbu','brbg'],     cyclic: ['twilight'] },
  blueprint: { sequential: ['mako','viridis'],  divergent: ['coolwarm','rdbu'], cyclic: ['twilight'] },
  phosphor:  { sequential: ['viridis','mako'],  divergent: ['brbg','rdbu'],     cyclic: ['twilight'] },
  neon:      { sequential: ['mako','magma'],    divergent: ['coolwarm','puor'], cyclic: ['twilight'] },
  daylight:  { sequential: ['viridis','mako'],  divergent: ['rdbu','rdylbu'],   cyclic: ['twilight'] },
  primary:   { sequential: ['amber','magma'],   divergent: ['rdbu','coolwarm'], cyclic: ['twilight'] },
  mirage:    { sequential: ['magma','mako'],    divergent: ['puor','coolwarm'], cyclic: ['twilight'] },
};

/** The active theme's discrete palette = its --data-1..7 tokens, read live. */
export function discreteStops(): string[] {
  if (typeof window === 'undefined') return [];
  const cs = getComputedStyle(document.documentElement);
  const out: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const v = cs.getPropertyValue(`--data-${i}`).trim();
    if (v) out.push(v);
  }
  return out;
}

export function mapStops(id: string): string[] {
  if (id === 'discrete') return discreteStops();
  return (COLORMAPS[id] ?? COLORMAPS.rdbu).stops;
}

/** Maps of a family this theme recommends (default first); 'discrete' special-cased. */
export function themeMapsFor(family: ColorFamily, themeId: string): string[] {
  if (family === 'discrete') return ['discrete'];
  return THEME_MAPS[themeId]?.[family]
    ?? Object.keys(COLORMAPS).filter(k => COLORMAPS[k].family === family);
}

/** A CSS gradient string for swatches/legends. */
export function gradientCss(id: string, reverse = false): string {
  const s = reverse ? mapStops(id).slice().reverse() : mapStops(id);
  return `linear-gradient(90deg, ${s.join(',')})`;
}

/** Parse a #rgb/#rrggbb hex to [r,g,b] (0–255); returns black on a bad string. */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Interpolate an arbitrary list of hex anchors at `t` ∈ [0,1] — like
 * {@link sampleContinuous} but for ad-hoc stops built from live theme tokens
 * (e.g. a `[--danger, neutral, --success]` outcome ramp). `t` is clamped; returns
 * a #rrggbb string. A single stop returns itself; an empty list returns black.
 */
export function lerpStops(stops: string[], t: number): string {
  if (stops.length === 0) return '#000000';
  if (stops.length === 1) return stops[0];
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= stops.length - 1) return stops[stops.length - 1];
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return rgbToHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

/**
 * Sample a map **continuously** at `t` ∈ [0,1], linearly interpolating between the
 * two surrounding anchors — for smooth scalar encodings (an outcome ramped by
 * goodness, a chaos gradient) where nearest-anchor banding would be visible. For
 * the discrete family there is nothing to interpolate, so it falls back to the
 * nearest token. `t` is clamped. Returns a #rrggbb string.
 */
export function sampleContinuous(id: string, t: number): string {
  const s = mapStops(id);
  if (s.length === 0) return '#000000';
  if (id === 'discrete') return s[Math.round(Math.max(0, Math.min(1, t)) * (s.length - 1))];
  const x = Math.max(0, Math.min(1, t)) * (s.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= s.length - 1) return s[s.length - 1];
  const a = hexToRgb(s[i]);
  const b = hexToRgb(s[i + 1]);
  return rgbToHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

/**
 * Sample a map to a flat array of `n` hex colors by nearest-anchor lookup —
 * enough for legends/swatches and for bucketing data into N classes (the common
 * DOM use). For the discrete family this just returns the theme tokens (capped /
 * cycled to n). No interpolation: callers that need continuous color should lerp
 * the anchors themselves.
 */
export function sampleStops(id: string, n: number): string[] {
  const s = mapStops(id);
  if (s.length === 0 || n <= 0) return [];
  if (id === 'discrete') return Array.from({ length: n }, (_, i) => s[i % s.length]);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    return s[Math.round(t * (s.length - 1))];
  });
}
