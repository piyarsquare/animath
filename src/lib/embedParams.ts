import { ProjectionMode } from './viewpoint';
import { functionNames } from './complexMath';
import { planes, type Plane } from '../math/constants';
import { renderModes, type RenderMode } from './particles/types';

/**
 * URL-param codec for the embeddable applet routes (docs/EMBEDS.md).
 *
 * Readable params an author can hand-edit in a document:
 *
 *   fn=exp · p=1&q=2 · render=sheet · proj=hopf|perspective|stereo|torus|
 *   dropx|dropy|dropu|dropv · motion=fixed|quaternion · spin=xy,uv ·
 *   count=120000 · colorby=domain|range · colormap=2 · extent=2 ·
 *   caption=… · controls=0|1
 *
 * Unknown or garbled values are ignored (the embed falls back to defaults,
 * never crashes). Versioned via `v=` for future incompatible changes.
 */
/** In-applet buttons an embed may show (`buttons=dropx,dropy,rotate`). */
export type EmbedButton = 'dropx' | 'dropy' | 'dropu' | 'dropv' | 'rotate';
const EMBED_BUTTONS: readonly EmbedButton[] = ['dropx', 'dropy', 'dropu', 'dropv', 'rotate'];

export interface ParticleEmbedConfig {
  fn?: string;
  p?: number;
  q?: number;
  render?: RenderMode;
  proj?: ProjectionMode;
  motion?: 'Quaternion' | 'Fixed';
  spin?: Plane[];
  count?: number;
  colorBy?: 0 | 1;
  colormap?: number;
  extent?: number;
  caption?: string;
  /** Pointer gestures (orbit/pan/zoom) on the embedded view; on by default. */
  controls: boolean;
  /** Optional overlay button row (projection switchers / rotate toggle). */
  buttons?: EmbedButton[];
}

const PROJ: Record<string, ProjectionMode> = {
  perspective: ProjectionMode.Perspective,
  // 'stereo' is the same stereographic map as the torus view (which also
  // soft-floors the pole); the UI dropped it, the param stays as an alias.
  stereo: ProjectionMode.Torus,
  hopf: ProjectionMode.Hopf,
  sphere: ProjectionMode.Hopf,
  torus: ProjectionMode.Torus,
  dropx: ProjectionMode.DropX,
  dropy: ProjectionMode.DropY,
  dropu: ProjectionMode.DropU,
  dropv: ProjectionMode.DropV,
};

export function parseParticleEmbed(query: string): ParticleEmbedConfig {
  const P = new URLSearchParams(query);
  const num = (k: string) => {
    const v = parseFloat(P.get(k) ?? '');
    return isFinite(v) ? v : undefined;
  };
  const cfg: ParticleEmbedConfig = { controls: P.get('controls') !== '0' };

  const fn = P.get('fn');
  if (fn && functionNames.includes(fn)) cfg.fn = fn;
  cfg.p = num('p'); cfg.q = num('q');

  const render = (P.get('render') ?? '').toLowerCase();
  cfg.render = renderModes.find(m => m.toLowerCase() === render);

  const proj = (P.get('proj') ?? '').toLowerCase();
  if (proj in PROJ) cfg.proj = PROJ[proj];

  const motion = (P.get('motion') ?? '').toLowerCase();
  if (motion === 'fixed') cfg.motion = 'Fixed';
  else if (motion === 'quaternion') cfg.motion = 'Quaternion';

  const spin = (P.get('spin') ?? '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter((s): s is Plane => (planes as readonly string[]).includes(s));
  if (spin.length) cfg.spin = spin;

  const count = num('count');
  if (count !== undefined) cfg.count = Math.max(1000, Math.min(1_000_000, Math.round(count)));

  const colorBy = (P.get('colorby') ?? '').toLowerCase();
  if (colorBy === 'domain') cfg.colorBy = 0;
  else if (colorBy === 'range') cfg.colorBy = 1;

  cfg.colormap = num('colormap');
  const extent = num('extent');
  if (extent !== undefined) cfg.extent = Math.max(0.5, Math.min(16, extent));

  const caption = P.get('caption');
  if (caption) cfg.caption = caption.slice(0, 200);

  const buttons = (P.get('buttons') ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter((s): s is EmbedButton => (EMBED_BUTTONS as readonly string[]).includes(s));
  if (buttons.length) cfg.buttons = buttons;

  return cfg;
}

/** Embed configuration for the plane-transform (two-pane) applet. */
export interface PlaneEmbedConfig {
  fn?: string;
  p?: number;
  q?: number;
  extent?: number;
  caption?: string;
  controls: boolean;
}

export function parsePlaneEmbed(query: string): PlaneEmbedConfig {
  const { fn, p, q, extent, caption, controls } = parseParticleEmbed(query);
  return { fn, p, q, extent, caption, controls };
}
